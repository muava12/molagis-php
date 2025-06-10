-- Update RPC function get_financial_overview untuk menambahkan net_product_profit dan net_delivery_profit
-- Tambahkan dua field baru:
-- 1. net_product_profit = product_revenue - product_cost
-- 2. net_delivery_profit = delivery_revenue - delivery_cost

CREATE OR REPLACE FUNCTION get_financial_overview(
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    -- Variabel untuk menampung tanggal efektif
    v_start_date DATE;
    v_end_date DATE;

    -- Variabel untuk metrik keuangan
    v_product_revenue NUMERIC(15, 2) := 0;
    v_delivery_revenue NUMERIC(15, 2) := 0;
    v_gross_revenue NUMERIC(15, 2) := 0;
    v_product_cost NUMERIC(15, 2) := 0;
    v_gross_profit NUMERIC(15, 2) := 0;
    v_gross_margin NUMERIC(5, 2) := 0;
    
    -- Variabel untuk rincian biaya pengiriman
    v_variable_delivery_cost NUMERIC(15, 2) := 0; -- Biaya ongkir per pengiriman dari `deliverydates`
    v_courier_fee_cost NUMERIC(15, 2) := 0;       -- Biaya fee kurir dari `financial_records`
    v_delivery_cost NUMERIC(15, 2) := 0;          -- Total biaya pengiriman

    v_other_expenses NUMERIC(15, 2) := 0;
    v_total_operating_expenses NUMERIC(15, 2) := 0;
    v_net_profit NUMERIC(15, 2) := 0;
    v_net_margin NUMERIC(5, 2) := 0;
    
    -- Variabel baru untuk net profits per kategori
    v_net_product_profit NUMERIC(15, 2) := 0;     -- Laba bersih produk
    v_net_delivery_profit NUMERIC(15, 2) := 0;    -- Laba bersih pengiriman

    -- Variabel untuk hasil akhir JSON
    v_final_json JSON;
BEGIN
    -- 1. TENTUKAN PERIODE LAPORAN
    v_start_date := COALESCE(p_start_date, DATE_TRUNC('month', CURRENT_DATE)::DATE);
    v_end_date := COALESCE(p_end_date, (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE);

    -- 2. HITUNG PENDAPATAN, MODAL, DAN BIAYA PENGIRIMAN VARIABEL DARI deliverydates
    SELECT
        COALESCE(SUM(dd.total_harga_perhari), 0),
        COALESCE(SUM(dd.total_modal_perhari), 0),
        COALESCE(SUM(dd.ongkir), 0),
        COALESCE(SUM(dd.ongkir_kurir_luar), 0)
    INTO
        v_product_revenue,
        v_product_cost,
        v_delivery_revenue,
        v_variable_delivery_cost
    FROM deliverydates dd
    WHERE dd.tanggal BETWEEN v_start_date AND v_end_date;

    -- 3. HITUNG BIAYA OPERASIONAL, DIPISAHKAN ANTARA FEE KURIR DAN LAINNYA
    SELECT
        -- Menjumlahkan semua biaya yang kategorinya spesifik 'fee_kurir'
        COALESCE(SUM(CASE WHEN ec.name = 'fee_kurir' THEN fr.amount ELSE 0 END), 0),
        -- Menjumlahkan semua biaya selain 'fee_kurir'
        COALESCE(SUM(CASE WHEN ec.name != 'fee_kurir' THEN fr.amount ELSE 0 END), 0)
    INTO
        v_courier_fee_cost,
        v_other_expenses
    FROM financial_records fr
    LEFT JOIN expense_categories ec ON fr.category_id = ec.id
    WHERE fr.transaction_date BETWEEN v_start_date AND v_end_date
      AND fr.type = 'expense';

    -- 4. KALKULASI METRIK TURUNAN
    v_delivery_cost := v_variable_delivery_cost + v_courier_fee_cost; -- Total biaya pengiriman
    v_gross_revenue := v_product_revenue + v_delivery_revenue;
    v_gross_profit := v_product_revenue - v_product_cost;
    v_total_operating_expenses := v_delivery_cost + v_other_expenses;
    v_net_profit := v_gross_profit - v_total_operating_expenses;
    
    -- KALKULASI BARU: Net profits per kategori
    v_net_product_profit := v_product_revenue - v_product_cost;      -- Laba bersih produk
    v_net_delivery_profit := v_delivery_revenue - v_delivery_cost;   -- Laba bersih pengiriman

    -- Hitung margin (dengan pengaman pembagian nol)
    IF v_product_revenue > 0 THEN
        v_gross_margin := (v_gross_profit / v_product_revenue) * 100;
    ELSE
        v_gross_margin := 0;
    END IF;

    IF v_gross_revenue > 0 THEN
        v_net_margin := (v_net_profit / v_gross_revenue) * 100;
    ELSE
        v_net_margin := 0;
    END IF;

    -- 5. BANGUN OBJEK JSON DENGAN FIELD BARU
    v_final_json := JSON_BUILD_ARRAY(
        JSON_BUILD_OBJECT(
            'get_financial_overview', JSON_BUILD_OBJECT(
                'success', TRUE,
                'data', JSON_BUILD_OBJECT(
                    'period_info', JSON_BUILD_OBJECT(
                        'start_date', v_start_date,
                        'end_date', v_end_date
                    ),
                    'financial_overview', JSON_BUILD_OBJECT(
                        'product_revenue', v_product_revenue,
                        'delivery_revenue', v_delivery_revenue,
                        'gross_revenue', v_gross_revenue,
                        'product_cost', v_product_cost,
                        'gross_profit', v_gross_profit,
                        'gross_margin', ROUND(v_gross_margin, 2),
                        'net_product_profit', v_net_product_profit,        -- FIELD BARU
                        'delivery_cost', v_delivery_cost,
                        'net_delivery_profit', v_net_delivery_profit,     -- FIELD BARU
                        'other_expenses', v_other_expenses,
                        'total_operating_expenses', v_total_operating_expenses,
                        'net_profit', v_net_profit,
                        'net_margin', ROUND(v_net_margin, 2)
                    )
                ),
                'error', NULL
            )
        )
    );

    RETURN v_final_json;

EXCEPTION
    WHEN OTHERS THEN
        RETURN JSON_BUILD_ARRAY(
            JSON_BUILD_OBJECT(
                'get_financial_overview', JSON_BUILD_OBJECT(
                    'success', FALSE,
                    'data', NULL,
                    'error', JSON_BUILD_OBJECT(
                        'code', SQLSTATE,
                        'message', SQLERRM
                    )
                )
            )
        );
END;
$$;

-- Test query untuk memverifikasi hasil
-- SELECT get_financial_overview('2024-01-01', '2024-01-31');
