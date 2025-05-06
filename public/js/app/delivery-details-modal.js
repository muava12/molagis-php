/*
 * File: delivery-details-modal.js
 * Description: Logika untuk mengelola modal view-delivery-details, dapat digunakan di berbagai halaman.
 */

import { renderErrorAlert, showToast } from './utils.js';

// Variabel global
const bootstrap = window.tabler?.bootstrap;

// Fungsi untuk format Rupiah
function formatRupiah(angka) {
    return 'Rp ' + angka.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// Fungsi untuk format nomor telepon ke format WhatsApp
function formatPhoneNumber(phone) {
    phone = phone.replace(/\s+/g, '');
    if (phone.startsWith('0')) {
        phone = '62' + phone.slice(1);
    }
    return phone;
}

/**
 * Menginisialisasi modal view-delivery-details.
 * @param {string} currentDate Tanggal saat ini dalam format YYYY-MM-DD
 * @param {HTMLElement} prevButton Tombol navigasi sebelumnya
 * @param {HTMLElement} nextButton Tombol navigasi berikutnya
 * @param {HTMLElement} tableBody Elemen tbody tabel
 * @param {HTMLElement} totalBadge Elemen untuk menampilkan total pengantaran
 * @param {HTMLElement} dateSubtitle Elemen untuk menampilkan subtitle tanggal
 */
export function initDeliveryDetailsModal(currentDate, prevButton, nextButton, tableBody, totalBadge, dateSubtitle) {
    const viewButtons = document.querySelectorAll('.view-delivery-details');
    const deliveryModal = document.getElementById('delivery-list-modal');
    const deliveryList = document.getElementById('delivery-list');
    const courierNameSpan = document.getElementById('courier-name');
    const deliveryDateSpan = document.getElementById('delivery-date');
    const totalDeliveriesSpan = document.getElementById('total-deliveries');
    const pendingDeliveriesSpan = document.getElementById('pending-deliveries');
    const refreshButton = document.getElementById('refresh-delivery-list');
    const setAllDeliveredButton = document.getElementById('set-all-delivered');

    let groupedOrders = [];
    let totalPending = 0;
    let isFetchingDetails = false; // Mencegah multiple fetch pada refresh

    /**
     * Mengambil detail pengantaran untuk kurir tertentu.
     * @param {string} courierId ID kurir atau 'null' untuk item tanpa kurir
     * @param {string} date Tanggal dalam format YYYY-MM-DD
     */
    const fetchDeliveryDetails = async (courierId, date) => {
        if (isFetchingDetails) return; // Cegah fetch berulang
        isFetchingDetails = true;
        // Nonaktifkan tombol saat load awal tanpa btn-loading
        refreshButton.classList.add('disabled');
        setAllDeliveredButton.classList.add('disabled');

        console.log(`Fetching delivery details for courier ${courierId} on date ${date}`);
        deliveryList.innerHTML = '<p class="text-center transition-opacity duration-300">Memuat data...</p>';

        try {
            const response = await fetch(`/api/delivery-details?courier_id=${encodeURIComponent(courierId)}&date=${encodeURIComponent(date)}`);
            const data = await response.json();
            console.debug('fetchDeliveryDetails API response:', data);

            if (response.ok && data.error === null) {
                groupedOrders = data.grouped_orders || [];
                renderDeliveryList(groupedOrders, date, courierId);
                courierNameSpan.textContent = data.courier_name || 'Belum Dipilih';
                deliveryDateSpan.textContent = data.date || date;
                totalDeliveriesSpan.textContent = groupedOrders.length;
                totalPending = groupedOrders.filter(group =>
                    group.orders?.some(order => order.status_pengiriman !== 'completed')
                ).length || 0;
                pendingDeliveriesSpan.textContent = `(Belum diantar: ${totalPending})`;
                console.debug('totalPending:', totalPending);
                if (totalPending > 0) {
                    setAllDeliveredButton.classList.remove('disabled');
                }
            } else {
                console.error('fetchDeliveryDetails API error:', data.error);
                deliveryList.innerHTML = '<p class="text-center transition-opacity duration-300 text-danger">Gagal memuat data: ' + (data.error || 'Unknown error') + '</p>';
            }
        } catch (error) {
            console.error('fetchDeliveryDetails error:', error);
            deliveryList.innerHTML = '<p class="text-center transition-opacity duration-300 text-danger">Gagal memuat data: ' + error.message + '</p>';
        } finally {
            isFetchingDetails = false;
            refreshButton.classList.remove('disabled');
            // setAllDeliveredButton tetap disabled jika totalPending === 0, ditangani di renderDeliveryList
        }
    };

    /**
     * Handler untuk tombol refresh, menjalankan fetch data sekali.
     * @param {string} courierId ID kurir atau 'null' untuk item tanpa kurir
     * @param {string} date Tanggal dalam format YYYY-MM-DD
     */
    const handleRefreshDeliveries = async (courierId, date) => {
        if (isFetchingDetails) return; // Cegah fetch berulang

        // Nonaktifkan tombol refresh dengan btn-loading saat proses
        refreshButton.classList.add('disabled', 'btn-loading');
        setAllDeliveredButton.classList.add('disabled');

        try {
            await fetchDeliveryDetails(courierId, date);
        } finally {
            refreshButton.classList.remove('disabled', 'btn-loading');
            // setAllDeliveredButton tetap disabled jika totalPending === 0, ditangani di renderDeliveryList
        }
    };

    /**
     * Handler untuk mengatur status pengantaran (checkbox individual).
     * @param {Object} params Parameter untuk mengatur status
     * @param {number[]} params.deliveryIds Daftar ID pengiriman
     * @param {string} params.status Status baru (pending/completed)
     * @param {HTMLElement} params.checkbox Elemen checkbox
     * @param {HTMLElement} params.card Elemen kartu
     * @param {Object} params.group Grup pesanan
     * @returns {Promise<void>}
     */
    const handleSetDeliveryStatus = async ({ deliveryIds, status, checkbox, card, group }) => {
        if (!deliveryIds?.length) {
            console.error('No valid delivery IDs provided');
            showToast('Error', 'Tidak ada ID pengantaran yang valid', true);
            return;
        }

        // Update UI optimistis untuk checkbox
        let originalCheckboxHTML = checkbox.innerHTML;
        let originalOpacity = card.classList.contains('opacity-50');
        checkbox.innerHTML = status === 'completed' ?
            '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="icon text-success"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M5 12l5 5l10 -10"/></svg>' :
            '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="icon"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><circle cx="12" cy="12" r="9"/></circle></svg>';
        card.classList.toggle('opacity-50', status === 'completed');
        group.orders.forEach(order => order.status_pengiriman = status);
        totalPending = status === 'completed' ? totalPending - 1 : totalPending + 1;
        pendingDeliveriesSpan.textContent = `(Belum diantar: ${totalPending})`;
        checkbox.classList.add('disabled', 'opacity-50');

        // Aktifkan setAllDeliveredButton jika totalPending > 0
        if (totalPending > 0) {
            setAllDeliveredButton.classList.remove('disabled');
        } else {
            setAllDeliveredButton.classList.add('disabled');
        }

        try {
            // Panggil fetchDeliveries untuk memperbarui status
            const payload = {
                delivery_ids: deliveryIds,
                status: status,
            };
            const response = await fetch('/api/deliveries/update-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await response.json();
            if (!response.ok || data.error) {
                throw new Error(data.error || 'Gagal memperbarui status');
            }

            // Perbarui tabel utama
            await fetchDeliveries(
                currentDate,
                prevButton,
                nextButton,
                tableBody,
                totalBadge,
                dateSubtitle,
                false
            );
        } catch (error) {
            console.error('Error updating delivery status:', error);
            showToast('Error', 'Gagal memperbarui status: ' + error.message, true);

            // Rollback UI untuk checkbox
            checkbox.innerHTML = originalCheckboxHTML;
            card.classList.toggle('opacity-50', originalOpacity);
            group.orders.forEach(order => order.status_pengiriman = status === 'completed' ? 'pending' : 'completed');
            totalPending = status === 'completed' ? totalPending + 1 : totalPending - 1;
            pendingDeliveriesSpan.textContent = `(Belum diantar: ${totalPending})`;

            // Perbarui state setAllDeliveredButton setelah rollback
            if (totalPending > 0) {
                setAllDeliveredButton.classList.remove('disabled');
            } else {
                setAllDeliveredButton.classList.add('disabled');
            }
        } finally {
            checkbox.classList.remove('disabled', 'opacity-50');
        }
    };

    /**
     * Handler untuk tombol set all delivered.
     * @param {string} date Tanggal dalam format YYYY-MM-DD
     * @returns {Promise<void>}
     */
    const handleSetAllDelivered = async (date) => {
        const pendingOrders = groupedOrders.filter(group =>
            group.orders?.some(order => order.status_pengiriman !== 'completed')
        );
        if (pendingOrders.length === 0) return;

        const deliveryIds = pendingOrders.flatMap(group => group.orders.map(order => order.delivery_date_id));

        // Nonaktifkan tombol dengan btn-loading saat proses
        setAllDeliveredButton.classList.add('disabled', 'btn-loading');
        refreshButton.classList.add('disabled');

        try {
            // Panggil fetchDeliveries untuk memperbarui status
            const payload = {
                delivery_ids: deliveryIds,
                status: 'completed',
            };
            const response = await fetch('/api/deliveries/update-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await response.json();
            if (!response.ok || data.error) {
                throw new Error(data.error || 'Gagal memperbarui semua status');
            }

            // Update groupedOrders
            groupedOrders.forEach(group => {
                if (group.orders?.some(order => deliveryIds.includes(order.delivery_date_id))) {
                    group.orders.forEach(order => order.status_pengiriman = 'completed');
                }
            });
            totalPending = 0;
            pendingDeliveriesSpan.textContent = `(Belum diantar: ${totalPending})`;
            renderDeliveryList(groupedOrders, date, deliveryModal.dataset.courierId);
        } catch (error) {
            console.error('Error setting all deliveries to completed:', error);
            showToast('Error', 'Gagal memperbarui semua status: ' + error.message, true);
        } finally {
            setAllDeliveredButton.classList.add('disabled'); // Selalu disabled setelah set all
            setAllDeliveredButton.classList.remove('btn-loading');
            refreshButton.classList.remove('disabled');
        }
    };

    /**
     * Merender daftar antaran di modal.
     * @param {Array} groupedOrders Data antaran yang dikelompokkan
     * @param {string} date Tanggal dalam format YYYY-MM-DD
     * @param {string} courierId ID kurir atau 'null' untuk item tanpa kurir
     */
    const renderDeliveryList = (groupedOrders, date, courierId) => {
        deliveryList.innerHTML = '';
        deliveryList.classList.add('transition-opacity', 'duration-300');

        // Log jumlah groupedOrders untuk debugging
        console.debug('renderDeliveryList groupedOrders length:', groupedOrders.length);

        // Urutkan antaran: belum selesai di atas, selesai di bawah
        const pendingOrders = groupedOrders.filter(group =>
            group.orders?.some(order => order.status_pengiriman !== 'completed')
        );
        const deliveredOrders = groupedOrders.filter(group =>
            group.orders?.every(order => order.status_pengiriman === 'completed')
        );
        pendingOrders.sort((a, b) => (a.customer_name || '').localeCompare(b.customer_name || ''));
        deliveredOrders.sort((a, b) => (a.customer_name || '').localeCompare(b.customer_name || ''));
        const sortedOrders = [...pendingOrders, ...deliveredOrders];

        if (sortedOrders.length === 0) {
            deliveryList.innerHTML = '<p class="text-center">Tidak ada antaran untuk kurir ini pada tanggal tersebut.</p>';
            setAllDeliveredButton.textContent = 'Delivered';
            setAllDeliveredButton.classList.add('disabled');
            return;
        }

        // Atur state tombol berdasarkan totalPending
        setAllDeliveredButton.classList.toggle('disabled', totalPending === 0);

        sortedOrders.forEach(group => {
            const card = document.createElement('div');
            card.className = `card mb-1 border-2 border-primary-subtle transition-opacity duration-300 ${group.orders.every(order => order.status_pengiriman === 'completed') ? 'opacity-50' : ''}`;
            card.style.height = 'auto';
            card.innerHTML = `
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h3 class="card-title">
                        <span class="me-2 cursor-pointer checkbox-delivered" data-customer-id="${group.customer_id || ''}">
                            ${group.orders.every(order => order.status_pengiriman === 'completed') ?
                                '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="icon text-success"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M5 12l5 5l10 -10"/></svg>' :
                                '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="icon"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><circle cx="12" cy="12" r="9"/></circle></svg>'
                            }
                        </span>
                        ${group.customer_name || 'Unknown'}
                        ${group.orders.some(order => order.metode_pembayaran === 'cod') ? '<span class="badge bg-danger text-white ms-2">COD</span>' : ''}
                    </h3>
                    <a href="#" class="toggle-details">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="icon rotate-0 transition-transform duration-300">
                            <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                            <path d="M6 9l6 6l6 -6"/>
                        </svg>
                    </a>
                </div>
                <div class="card-body" style="display: none; overflow: hidden;" data-expanded-height="0px">
                    ${(group.orders || []).map(order => `
                        <p><strong>${order.nama_paket || 'Unknown'}</strong> (${order.jumlah || 0})</p>
                    `).join('')}
                    <p>Tambahan: ${group.item_tambahan || '-'} ${group.item_tambahan ? '- ' + formatRupiah(group.harga_tambahan || 0) : ''}</p>
                    <p>${group.customer_address || ''}</p>
                    ${group.orders[0]?.metode_pembayaran === 'cod' ? `<p>Total Harga: ${formatRupiah((group.orders.reduce((total, order) => total + (order.subtotal_harga || 0), 0) + (parseInt(group.harga_tambahan) || 0) + (parseInt(group.ongkir) || 0)))}</p>` : ''}
                    ${group.orders[0]?.notes ? `<div class="alert alert-warning">${group.orders[0].notes}</div>` : ''}
                    <div class="btn-list">
                        <a class="btn btn-success" href="https://wa.me/${formatPhoneNumber(group.customer_phone || '')}" target="_blank">
                            Chat WhatsApp
                        </a>
                        ${group.customer_telepon_alt ? `
                        <a class="btn btn-success" href="https://wa.me/${formatPhoneNumber(group.customer_telepon_alt || '')}" target="_blank">
                            Chat WhatsApp (Alternatif)
                        </a>` : ''}
                        ${group.customer_maps ? `
                        <a class="btn btn-primary" href="${group.customer_maps}" target="_blank">
                            Open Maps
                        </a>` : ''}
                        <a class="btn btn-info open-chat-history" href="#" data-customer-phone="${formatPhoneNumber(group.customer_phone || '')}">
                            Chat
                        </a>
                    </div>
                </div>
            `;
            deliveryList.appendChild(card);

            const cardBody = card.querySelector('.card-body');
            cardBody.dataset.expandedHeight = cardBody.scrollHeight + 'px';
        });

        // Event listener untuk tombol toggle detail antaran
        document.querySelectorAll('.toggle-details').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const card = button.closest('.card');
                const cardBody = card.querySelector('.card-body');
                const chevron = button.querySelector('.icon');
                const isExpanded = cardBody.style.display === 'block';

                if (isExpanded) {
                    card.style.height = card.offsetHeight + 'px';
                    cardBody.style.display = 'none';
                    setTimeout(() => {
                        card.style.height = 'auto';
                    }, 10);
                    chevron.classList.remove('rotate-180');
                    chevron.classList.add('rotate-0');
                } else {
                    cardBody.style.display = 'block';
                    const expandedHeight = cardBody.dataset.expandedHeight;
                    card.style.height = (card.offsetHeight + parseInt(expandedHeight)) + 'px';
                    chevron.classList.remove('rotate-0');
                    chevron.classList.add('rotate-180');
                }
            });
        });

        // Event listener untuk checkbox delivered
        document.querySelectorAll('.checkbox-delivered').forEach(checkbox => {
            checkbox.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (checkbox.classList.contains('disabled')) return;

                const customerId = checkbox.dataset.customerId;
                const group = groupedOrders.find(g => g.customer_id == customerId);
                if (!group) return;

                const newStatus = group.orders.every(order => order.status_pengiriman === 'completed') ? 'pending' : 'completed';
                const card = checkbox.closest('.card');

                await handleSetDeliveryStatus({
                    deliveryIds: group.orders.map(order => order.delivery_date_id),
                    status: newStatus,
                    checkbox,
                    card,
                    group,
                });
            });
        });

        // Event listener untuk tombol chat history
        document.querySelectorAll('.open-chat-history').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const customerPhone = button.dataset.customerPhone;
                window.open(`https://otomasiku.my.id/webhook/chat-history?hape=${customerPhone}`, '_blank');
            });
        });
    };

    // Event listener untuk tombol set all delivered
    setAllDeliveredButton.addEventListener('click', async () => {
        await handleSetAllDelivered(currentDate);
    });

    // Event listener untuk tombol refresh
    refreshButton.addEventListener('click', () => {
        const courierId = deliveryModal.dataset.courierId;
        handleRefreshDeliveries(courierId, currentDate);
    });

    // Event listener untuk tombol view delivery details
    viewButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const courierId = button.dataset.courierId;
            const courierName = button.dataset.courierName;
            deliveryModal.dataset.courierId = courierId;
            courierNameSpan.textContent = courierName;
            handleRefreshDeliveries(courierId, currentDate);

            const bsModal = new bootstrap.Modal(deliveryModal);
            bsModal.show();
        });
    });
}