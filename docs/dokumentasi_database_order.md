# Dokumentasi Database: Alur Pembuatan & Pembaruan Pesanan

## Ringkasan

Dokumen ini menguraikan mekanisme database yang terjadi saat pesanan dibuat atau diperbarui. Proses ini mengandalkan kombinasi dari **Fungsi RPC (Remote Procedure Call)** yang dipanggil oleh backend PHP, dan **Triggers** yang secara otomatis melakukan kalkulasi berantai di dalam database.

-   **RPC Functions**: Menangani logika bisnis utama dan memulai transaksi.
-   **Triggers & Trigger Functions**: Menangani kalkulasi subtotal dan agregasi total secara otomatis untuk memastikan integritas data.

---

## Tabel Database yang Terlibat

-   `orders`: Menyimpan data induk pesanan (pelanggan, tanggal pesan, total keseluruhan).
-   `deliverydates`: Menyimpan detail per tanggal pengiriman (ongkir, kurir, total per hari).
-   `orderdetails`: Menyimpan item-item paket untuk setiap tanggal pengiriman (paket, jumlah, subtotal).
-   `paket`: Menyimpan data master paket makanan (harga jual, harga modal).

---

## I. Fungsi RPC (Dipanggil dari PHP)

Ini adalah titik masuk utama dari aplikasi ke database.

### 1. `submit_order(params jsonb)`

Fungsi ini menangani pembuatan pesanan baru secara lengkap.

-   **Tujuan**: Menerima satu blok data JSON dari PHP, lalu menyisipkan data ke tabel `orders`, `deliverydates`, dan `orderdetails` dalam satu transaksi.
-   **Dipanggil dari**: `src/Features/Order/OrderService.php`

#### Isi Fungsi `submit_order`:
```sql
CREATE OR REPLACE FUNCTION public.submit_order(params jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    order_id integer;
    delivery_ids integer[];
    customer_count integer;
BEGIN
    -- Validasi customer_id
    IF params->>'customer_id' IS NULL THEN
        RAISE EXCEPTION 'Missing customer_id in input params';
    END IF;
    SELECT COUNT(*) INTO customer_count FROM public.customers WHERE id = (params->>'customer_id')::integer;
    IF customer_count != 1 THEN
        RAISE EXCEPTION 'Invalid customer_id: % (found % rows)', (params->>'customer_id')::integer, customer_count;
    END IF;

    -- Validasi konsistensi customer_id di order_data
    IF params->'order_data'->>'customer_id' IS NULL THEN
        RAISE EXCEPTION 'Missing customer_id in order_data';
    END IF;
    IF (params->'order_data'->>'customer_id')::integer != (params->>'customer_id')::integer THEN
        RAISE EXCEPTION 'Inconsistent customer_id: order_data (%): root (%)', (params->'order_data'->>'customer_id')::integer, (params->>'customer_id')::integer;
    END IF;

    -- Insert into orders (tanpa total_harga, akan dihitung oleh trigger)
    INSERT INTO public.orders (
        customer_id,
        tanggal_pesan,
        notes,
        metode_pembayaran
    )
    VALUES (
        (params->>'customer_id')::integer,
        (params->'order_data'->>'tanggal_pesan')::date,
        params->'order_data'->>'notes',
        params->'order_data'->>'metode_pembayaran'
    )
    RETURNING id INTO order_id;

    -- Insert into deliverydates
    WITH inserted_rows AS (
        INSERT INTO public.deliverydates (
            order_id,
            tanggal,
            kurir_id,
            ongkir,
            status,
            item_tambahan,
            harga_tambahan,
            harga_modal_tambahan,
            total_harga_perhari,
            total_modal_perhari
        )
        SELECT
            order_id,
            (d->>'tanggal')::date,
            CASE WHEN d->>'kurir_id' IS NULL OR d->>'kurir_id' = 'null' THEN NULL ELSE (d->>'kurir_id')::integer END,
            (d->>'ongkir')::numeric,
            d->>'status',
            CASE WHEN d->>'item_tambahan' IS NULL OR d->>'item_tambahan' = '' THEN NULL ELSE d->>'item_tambahan' END,
            CASE WHEN d->>'harga_tambahan' IS NULL OR d->>'harga_tambahan' = '' OR (d->>'harga_tambahan')::numeric = 0 THEN NULL ELSE (d->>'harga_tambahan')::numeric END,
            CASE WHEN d->>'harga_modal_tambahan' IS NULL OR d->>'harga_modal_tambahan' = '' OR (d->>'harga_modal_tambahan')::numeric = 0 THEN NULL ELSE (d->>'harga_modal_tambahan')::numeric END,
            0,
            0
        FROM jsonb_array_elements(params->'delivery_dates') AS d
        RETURNING id
    )
    SELECT array_agg(id) INTO delivery_ids FROM inserted_rows;

    -- Insert into orderdetails
    IF delivery_ids IS NOT NULL AND array_length(delivery_ids, 1) > 0 THEN
        INSERT INTO public.orderdetails (
            delivery_id,
            paket_id,
            jumlah,
            catatan_dapur,
            catatan_kurir
        )
        SELECT
            delivery_ids[(d->>'delivery_index')::integer + 1],
            (d->>'paket_id')::integer,
            (d->>'jumlah')::integer,
            d->>'catatan_dapur',
            d->>'catatan_kurir'
        FROM jsonb_array_elements(params->'order_details') AS d;
    END IF;

    -- Update ongkir customer jika perlu
    IF params ? 'new_ongkir' THEN
        UPDATE public.customers
        SET ongkir = CASE
            WHEN params->>'new_ongkir' IS NULL OR params->>'new_ongkir' = 'null'
                THEN NULL
            ELSE (params->>'new_ongkir')::numeric
        END
        WHERE id = (params->>'customer_id')::integer;
    END IF;

    RETURN jsonb_build_object('order_id', order_id);

EXCEPTION
    WHEN invalid_text_representation THEN
        RAISE EXCEPTION 'Transaction failed: Invalid data format. Error [%]: %', SQLSTATE, SQLERRM;
    WHEN others THEN
        RAISE EXCEPTION 'Transaction failed: Error [%]: %', SQLSTATE, SQLERRM;
END;
$function$
```

### 2. `update_daily_order(p_delivery_id integer, request jsonb)`

Fungsi ini menangani pembaruan untuk satu tanggal pengiriman.

-   **Tujuan**: Menerima ID pengiriman dan data JSON, lalu melakukan `UPSERT` (Update/Insert) dan `DELETE` pada item-item di `orderdetails`. Setelah itu, memperbarui data di `deliverydates`.
-   **Dipanggil dari**: `src/Features/Orders/OrdersService.php`

#### Isi Fungsi `update_daily_order`:
```sql
CREATE OR REPLACE FUNCTION public.update_daily_order(p_delivery_id integer, request jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    existing_order_detail_ids BIGINT[];
    item JSONB;
BEGIN
    -- TAHAP 1: SELESAIKAN SEMUA OPERASI DI orderdetails
    -- Ambil semua ID orderdetails yang ada untuk delivery ini
    SELECT ARRAY_AGG(id) INTO existing_order_detail_ids FROM public.orderdetails WHERE delivery_id = p_delivery_id;

    -- Lakukan proses UPSERT (Update/Insert) dan catat ID yang sudah diproses
    IF request->'package_items' IS NOT NULL AND jsonb_typeof(request->'package_items') = 'array' THEN
        FOR item IN SELECT * FROM jsonb_array_elements(request->'package_items') LOOP
            IF item->>'order_detail_id' IS NOT NULL THEN
                -- UPDATE yang ada
                UPDATE public.orderdetails 
                SET 
                    jumlah = (item->>'jumlah')::INTEGER, 
                    catatan_dapur = item->>'catatan_dapur', 
                    catatan_kurir = item->>'catatan_kurir', 
                    paket_id = (item->>'paket_id')::BIGINT 
                WHERE id = (item->>'order_detail_id')::BIGINT;
                
                -- Hapus dari array agar tidak ikut terhapus nanti
                existing_order_detail_ids := array_remove(existing_order_detail_ids, (item->>'order_detail_id')::BIGINT);
            ELSE
                -- INSERT yang baru
                INSERT INTO public.orderdetails (delivery_id, paket_id, jumlah, catatan_dapur, catatan_kurir) 
                VALUES (p_delivery_id, (item->>'paket_id')::BIGINT, (item->>'jumlah')::INTEGER, item->>'catatan_dapur', item->>'catatan_kurir');
            END IF;
        END LOOP;
    END IF;

    -- Hapus orderdetails yang tidak ada lagi di request
    IF array_length(existing_order_detail_ids, 1) > 0 THEN
        DELETE FROM public.orderdetails WHERE id = ANY(existing_order_detail_ids);
    END IF;

    -- TAHAP 2: UPDATE FINAL PADA deliverydates
    UPDATE public.deliverydates
    SET 
        tanggal = COALESCE((request->>'tanggal')::DATE, tanggal),
        kurir_id = COALESCE((request->>'kurir_id')::BIGINT, kurir_id),
        ongkir = COALESCE((request->>'ongkir')::NUMERIC, ongkir),
        item_tambahan = COALESCE(request->>'item_tambahan', item_tambahan),
        harga_tambahan = COALESCE((request->>'harga_tambahan')::NUMERIC, harga_tambahan),
        harga_modal_tambahan = COALESCE((request->>'harga_modal_tambahan')::NUMERIC, harga_modal_tambahan),
        kitchen_note = COALESCE(request->>'daily_kitchen_note', kitchen_note),
        courier_note = COALESCE(request->>'daily_courier_note', courier_note)
    WHERE id = p_delivery_id;

    RETURN;
END;
$function$
```

---

## II. Triggers & Fungsi Terkait

Triggers ini bekerja secara otomatis di belakang layar untuk menjaga konsistensi data, terutama dalam hal kalkulasi harga.

### 1. Trigger: `trg_calculate_subtotals` di Tabel `orderdetails`

-   **Event**: `BEFORE INSERT OR UPDATE`
-   **Tujuan**: Menghitung `subtotal_harga` dan `subtotal_modal` untuk sebuah item (`orderdetails`) sebelum disimpan, berdasarkan jumlah dan harga dari tabel `paket`.
-   **Memanggil Fungsi**: `tg_calculate_orderdetails_subtotals()`

#### Isi Fungsi `tg_calculate_orderdetails_subtotals`:
```sql
CREATE OR REPLACE FUNCTION public.tg_calculate_orderdetails_subtotals()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF TG_OP = 'INSERT' OR NEW.paket_id IS DISTINCT FROM OLD.paket_id OR NEW.jumlah IS DISTINCT FROM OLD.jumlah THEN
        SELECT harga_jual * NEW.jumlah, harga_modal * NEW.jumlah
        INTO NEW.subtotal_harga, NEW.subtotal_modal
        FROM public.paket WHERE id = NEW.paket_id;
    END IF;
    RETURN NEW;
END;
$function$
```

### 2. Trigger: `z_trigger_on_orderdetails` di Tabel `orderdetails`

-   **Event**: `AFTER INSERT, UPDATE, OR DELETE`
-   **Tujuan**: Menghitung ulang total di `deliverydates` DAN `orders` setiap kali ada perubahan pada `orderdetails`.
-   **Memanggil Fungsi**: `tg_recalculate_all_from_details()`

#### Isi Fungsi `tg_recalculate_all_from_details`:
```sql
CREATE OR REPLACE FUNCTION public.tg_recalculate_all_from_details()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_order_id INT;
BEGIN
    -- Dapatkan order_id dari delivery_id
    IF TG_OP = 'DELETE' THEN
        SELECT order_id INTO v_order_id FROM public.deliverydates WHERE id = OLD.delivery_id;
    ELSE
        SELECT order_id INTO v_order_id FROM public.deliverydates WHERE id = NEW.delivery_id;
    END IF;

    IF v_order_id IS NULL THEN RETURN NULL; END IF;

    -- Kunci baris orders untuk mencegah race condition
    PERFORM * FROM public.orders WHERE id = v_order_id FOR UPDATE;

    -- Kalkulasi ulang SEMUA deliverydates yang terkait dengan order ini
    UPDATE public.deliverydates
    SET 
      total_harga_perhari = COALESCE(details.total_harga, 0) + COALESCE(deliverydates.harga_tambahan, 0)
    FROM (
        SELECT 
            delivery_id, 
            SUM(subtotal_harga) AS total_harga
        FROM public.orderdetails
        WHERE delivery_id IN (SELECT id FROM public.deliverydates WHERE order_id = v_order_id)
        GROUP BY delivery_id
    ) AS details
    WHERE 
        deliverydates.order_id = v_order_id AND
        deliverydates.id = details.delivery_id;

    -- Kalkulasi ulang grand total di tabel orders
    UPDATE public.orders
    SET total_harga = (SELECT COALESCE(SUM(dd.total_harga_perhari + dd.ongkir), 0) FROM public.deliverydates AS dd WHERE dd.order_id = v_order_id)
    WHERE id = v_order_id;

    RETURN NULL;
END;
$function$
```

### 3. Trigger: `z_trigger_on_deliverydates` di Tabel `deliverydates`

-   **Event**: `AFTER UPDATE OR DELETE`
-   **Tujuan**: Menghitung ulang total keseluruhan di `orders` jika ada perubahan pada `deliverydates` (misalnya ongkir berubah).
-   **Memanggil Fungsi**: `tg_update_order_total()`

#### Isi Fungsi `tg_update_order_total`:
```sql
CREATE OR REPLACE FUNCTION public.tg_update_order_total()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_order_id INT;
BEGIN
    IF TG_OP = 'DELETE' THEN v_order_id := OLD.order_id; ELSE v_order_id := NEW.order_id; END IF;
    PERFORM * FROM public.orders WHERE id = v_order_id FOR UPDATE;
    UPDATE public.orders SET total_harga = (SELECT COALESCE(SUM(total_harga_perhari + ongkir), 0) FROM public.deliverydates WHERE order_id = v_order_id) WHERE id = v_order_id;
    IF TG_OP = 'UPDATE' AND NEW.order_id IS DISTINCT FROM OLD.order_id THEN
         UPDATE public.orders SET total_harga = (SELECT COALESCE(SUM(total_harga_perhari + ongkir), 0) FROM public.deliverydates WHERE order_id = OLD.order_id) WHERE id = OLD.order_id;
    END IF;
    RETURN NULL;
END;
$function$
``` 