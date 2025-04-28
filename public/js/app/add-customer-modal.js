/*
 * File: add-customer-modal.js
 * Description: Modul untuk menangani modal tambah customer, termasuk validasi form dan pengiriman data ke API.
 * Digunakan di: customers.js, dashboard.js, atau halaman lain yang memerlukan modal tambah customer.
 */

/**
 * Inisialisasi modal tambah customer dengan event listener untuk submit form.
 * @param {string} modalId - ID modal (misalnya, 'add-modal' atau 'dashboard-add-modal').
 * @param {Object} options - Opsi tambahan.
 * @param {Function} options.showToast - Fungsi untuk menampilkan toast sukses.
 * @param {Function} options.showErrorToast - Fungsi untuk menampilkan toast error.
 * @param {Function} [options.onSuccess] - Callback setelah berhasil menambah customer (opsional).
 */
export function initAddCustomerModal(modalId, { showToast, showErrorToast, onSuccess }) {
    const form = document.getElementById(`${modalId}-form`);
    const saveButton = document.getElementById(`${modalId}-save`);
    const bootstrap = window.tabler?.bootstrap;

    if (!form || !saveButton) {
        console.error('Add customer modal elements not found:', { form, saveButton });
        return;
    }

    // Fungsi untuk menutup modal
    function closeModal() {
        const modal = bootstrap?.Modal.getInstance(document.getElementById(modalId));
        modal?.hide();
    }

    // Fungsi untuk mereset form
    function resetForm() {
        form.reset();
    }

    // Event listener untuk submit form
    form.addEventListener('submit', async (event) => {
        event.preventDefault(); // Mencegah submit default

        // Validasi form
        if (!form.checkValidity()) {
            form.reportValidity(); // Tampilkan pesan validasi HTML5
            return;
        }

        saveButton.classList.add('btn-loading');

        // Ambil data dari form
        const newCustomer = {
            nama: document.getElementById(`${modalId}-nama`)?.value?.trim() || '',
            alamat: document.getElementById(`${modalId}-alamat`)?.value?.trim() || null,
            telepon: document.getElementById(`${modalId}-telepon`)?.value?.trim() || null,
            telepon_alt: document.getElementById(`${modalId}-telepon-alt`)?.value?.trim() || null,
            telepon_pemesan: document.getElementById(`${modalId}-telepon-pemesan`)?.value?.trim() || null,
            maps: document.getElementById(`${modalId}-maps`)?.value?.trim() || null,
            ongkir: document.getElementById(`${modalId}-ongkir`)?.value?.trim() ? parseFloat(document.getElementById(`${modalId}-ongkir`).value.trim()) : null,
        };

        // Validasi tambahan (meskipun sudah ada required di HTML)
        if (!newCustomer.nama) {
            saveButton.classList.remove('btn-loading');
            showErrorToast('Error', 'Nama pelanggan wajib diisi.');
            return;
        }

        try {
            // Kirim data ke API dengan timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch('/api/customers/add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify(newCustomer),
                signal: controller.signal,
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Gagal menambahkan pelanggan');
            }

            const result = await response.json();
            if (result.error) {
                throw new Error(result.error);
            }

            // Reset form dan tutup modal
            resetForm();
            closeModal();

            // Tampilkan toast sukses
            showToast('Sukses', 'Pelanggan berhasil ditambahkan.');

            // Panggil callback onSuccess jika ada
            if (typeof onSuccess === 'function') {
                await onSuccess();
            }
        } catch (error) {
            console.error('Error adding customer:', error);
            if (error.name === 'AbortError') {
                showErrorToast('Error', 'Permintaan timeout. Silakan cek koneksi internet.');
            } else {
                showErrorToast('Error', error.message || 'Terjadi kesalahan saat menyimpan data.');
            }
        } finally {
            saveButton.classList.remove('btn-loading');
        }
    });
}