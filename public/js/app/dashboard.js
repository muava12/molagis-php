/*
 * File: dashboard.js
 * Description: Logika untuk halaman dashboard, termasuk pengambilan data pengantaran, inisialisasi modal tambah customer, modal tambah pesanan, dan modal daftar antaran.
 */

import { renderErrorAlert, showToast } from './utils.js';
import { initAddCustomerModal } from './add-customer-modal.js';
import { initialize as initOrder } from './order.js';

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

// Fungsi untuk mengambil data pengantaran berdasarkan tanggal
async function fetchDeliveries(date, prevButton, nextButton, tableBody, totalBadge, dateSubtitle, showSpinner = true) {
    console.log('Fetching deliveries for date:', date);
    prevButton.disabled = true;
    nextButton.disabled = true;

    // Hanya tampilkan spinner pada tombol jika showSpinner true
    let spinner, svg;
    if (showSpinner) {
        spinner = prevButton.querySelector('.spinner-border') || nextButton.querySelector('.spinner-border');
        svg = prevButton.querySelector('svg') || nextButton.querySelector('svg');
        spinner.classList.remove('d-none');
        svg.classList.add('d-none');
    }

    // Tampilkan indikator loading di tabel untuk pemuatan awal
    if (!showSpinner) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="3" class="text-center">
                    <div class="spinner-border spinner-border-sm" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <span class="ms-2">Memuat data...</span>
                </td>
            </tr>
        `;
    }

    try {
        const response = await fetch(`/api/deliveries?date=${date}`);
        const data = await response.json();

        if (response.ok && !data.error) {
            tableBody.innerHTML = '';
            if (data.deliveries.length > 0) {
                data.deliveries.forEach((delivery) => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>
                            <div class="d-flex align-items-center">
                                <span class="avatar avatar-sm" style="background-image: url(https://api.dicebear.com/9.x/avataaars-neutral/svg?seed=${delivery.kurir_id})"></span>
                                <div class="ms-2">${delivery.courier_name}</div>
                            </div>
                        </td>
                        <td>
                            ${delivery.jumlah_pengantaran} titik Pengantaran
                            <div class="text-muted small">${delivery.jumlah_selesai} sudah sampai</div>
                        </td>
                        <td class="text-center">
                            <a href="#" class="btn btn-icon view-delivery-details" data-courier-id="${delivery.kurir_id}" data-courier-name="${delivery.courier_name}" aria-label="Lihat Antaran">
                                <svg class="icon icon-2" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                                    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                                    <path d="M10 12a2 2 0 1 0 4 0a2 2 0 0 0 -4 0"/>
                                    <path d="M21 12c-2.4 4 -5.4 6 -9 6c-3.6 0 -6.6 -2 -9 -6c2.4 -4 5.4 -6 9 -6c3.6 0 6.6 2 9 6"/>
                                </svg>
                            </a>
                        </td>
                    `;
                    tableBody.appendChild(row);
                });

                // Inisialisasi event listener untuk tombol "Lihat Antaran"
                initializeDeliveryDetailsListeners(date, prevButton, nextButton, tableBody, totalBadge, dateSubtitle);
            } else {
                tableBody.innerHTML = '<tr><td colspan="3" class="text-center">Tidak ada pengantaran hari ini</td></tr>';
            }

            totalBadge.textContent = data.total_deliveries;
            dateSubtitle.textContent = data.today_date;
            prevButton.dataset.date = data.current_date;
            nextButton.dataset.date = data.current_date;

            const errorContainer = document.querySelector('#error-container');
            if (errorContainer) errorContainer.innerHTML = '';
        } else {
            const errorContainer = document.querySelector('#error-container');
            if (errorContainer && !errorContainer.querySelector('.alert')) {
                renderErrorAlert(data.error || 'Gagal mengambil data');
            }
        }
    } catch (error) {
        console.error('Fetch error:', error);
        renderErrorAlert('Gagal mengambil data: ' + error.message);
    } finally {
        if (showSpinner) {
            spinner.classList.add('d-none');
            svg.classList.remove('d-none');
        }
        prevButton.disabled = false;
        nextButton.disabled = false;
    }
}

// Fungsi utama untuk inisialisasi dashboard
export function initDashboard() {
    console.log('Initializing dashboard event listeners');

    // Inisialisasi event listener untuk navigasi hari
    const prevButton = document.getElementById('prev-day');
    const nextButton = document.getElementById('next-day');
    const tableBody = document.querySelector('#deliveries-table tbody');
    const totalBadge = document.getElementById('total-badge');
    const dateSubtitle = document.getElementById('date-subtitle');

    if (!prevButton || !nextButton || !tableBody || !totalBadge || !dateSubtitle) {
        console.error('One or more DOM elements not found:', {
            prevButton: !!prevButton,
            nextButton: !!nextButton,
            tableBody: !!tableBody,
            totalBadge: !!totalBadge,
            dateSubtitle: !!dateSubtitle,
        });
        return;
    }

    const prevHandler = () => {
        console.log('Previous button clicked');
        const currentDate = new Date(prevButton.dataset.date);
        currentDate.setDate(currentDate.getDate() - 1);
        const newDate = currentDate.toISOString().split('T')[0];
        fetchDeliveries(newDate, prevButton, nextButton, tableBody, totalBadge, dateSubtitle, true);
    };
    const nextHandler = () => {
        console.log('Next button clicked');
        const currentDate = new Date(nextButton.dataset.date);
        currentDate.setDate(currentDate.getDate() + 1);
        const newDate = currentDate.toISOString().split('T')[0];
        fetchDeliveries(newDate, prevButton, nextButton, tableBody, totalBadge, dateSubtitle, true);
    };

    prevButton.removeEventListener('click', prevHandler);
    nextButton.removeEventListener('click', nextHandler);
    prevButton.addEventListener('click', prevHandler);
    nextButton.addEventListener('click', nextHandler);

    // Inisialisasi modal tambah customer
    initAddCustomerModal('dashboard-add-modal', {
        showToast,
        showErrorToast: (title, message) => renderErrorAlert(message),
    });

    // Inisialisasi modal tambah pesanan saat modal ditampilkan
    const orderModal = document.getElementById('modal-report');
    if (orderModal) {
        orderModal.addEventListener('shown.bs.modal', () => {
            console.log('Order modal shown, initializing order logic');
            // initOrder();
        });
        // Reset form saat modal ditutup
        orderModal.addEventListener('hidden.bs.modal', () => {
            console.log('Order modal hidden, resetting form');
            // const form = document.getElementById('order-form');
            // if (form) form.reset();
            // const selectedDatesContainer = document.getElementById('selected-dates');
            // if (selectedDatesContainer) selectedDatesContainer.innerHTML = '';
            // const selectedDatesCount = document.getElementById('selected-dates-count');
            // if (selectedDatesCount) selectedDatesCount.textContent = '0 Hari dipilih';
            // const calendarDays = document.getElementById('calendar-days');
            // if (calendarDays) calendarDays.innerHTML = '';
        });
    }

    // Inisialisasi modal daftar antaran saat halaman dimuat
    // Tidak menampilkan spinner pada tombol saat pemuatan awal
    fetchDeliveries(prevButton.dataset.date, prevButton, nextButton, tableBody, totalBadge, dateSubtitle, false);
}

// Fungsi untuk inisialisasi event listener tombol "Lihat Antaran"
function initializeDeliveryDetailsListeners(currentDate, prevButton, nextButton, tableBody, totalBadge, dateSubtitle) {
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

    const fetchDeliveryDetails = async (courierId, date) => {
        console.log(`Fetching delivery details for courier ${courierId} on date ${date}`);
        try {
            const response = await fetch(`/api/delivery-details?courier_id=${courierId}&date=${date}`);
            const data = await response.json();

            if (response.ok && !data.error) {
                groupedOrders = data.grouped_orders;
                renderDeliveryList(groupedOrders, date);
                courierNameSpan.textContent = data.courier_name;
                deliveryDateSpan.textContent = data.date;
                totalDeliveriesSpan.textContent = groupedOrders.length;
                totalPending = groupedOrders.filter(group => 
                    group.orders.some(order => order.status_pengiriman !== 'completed')
                ).length;
                pendingDeliveriesSpan.textContent = `(Belum diantar: ${totalPending})`;
            } else {
                renderErrorAlert(data.error || 'Gagal mengambil data antaran');
                deliveryList.innerHTML = '<p class="text-center">Tidak ada data antaran.</p>';
            }
        } catch (error) {
            console.error('Fetch delivery details error:', error);
            renderErrorAlert('Gagal mengambil data antaran: ' + error.message);
            deliveryList.innerHTML = '<p class="text-center">Tidak ada data antaran.</p>';
        }
    };

    const renderDeliveryList = (groupedOrders, date) => {
        deliveryList.innerHTML = '';

        // Filter dan urutkan berdasarkan status (pending dulu, lalu completed)
        const pendingOrders = groupedOrders.filter(group => 
            group.orders.some(order => order.status_pengiriman !== 'completed')
        );
        const deliveredOrders = groupedOrders.filter(group => 
            group.orders.every(order => order.status_pengiriman === 'completed')
        );
        pendingOrders.sort((a, b) => a.customer_name.localeCompare(b.customer_name));
        deliveredOrders.sort((a, b) => a.customer_name.localeCompare(b.customer_name));
        const sortedOrders = [...pendingOrders, ...deliveredOrders];

        if (sortedOrders.length === 0) {
            deliveryList.innerHTML = '<p class="text-center">Tidak ada antaran untuk kurir ini.</p>';
            setAllDeliveredButton.textContent = 'Delivered';
            return;
        }

        sortedOrders.forEach(group => {
            const card = document.createElement('div');
            card.className = `card mb-1 border-2 border-primary-subtle ${group.orders.every(order => order.status_pengiriman === 'completed') ? 'opacity-50' : ''} transition-all duration-300 ease-in-out`;
            card.style.height = 'auto'; // Default height
            card.innerHTML = `
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h3 class="card-title">
                        <span class="me-2 cursor-pointer checkbox-delivered" data-customer-id="${group.customer_id}">
                            ${group.orders.every(order => order.status_pengiriman === 'completed') ? 
                                '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="icon text-success"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M5 12l5 5l10 -10"/></svg>' : 
                                '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="icon"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><circle cx="12" cy="12" r="9"/></circle></svg>'
                            }
                        </span>
                        ${group.customer_name}
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
                    ${group.orders.map(order => `
                        <p><strong>${order.nama_paket}</strong> (${order.jumlah})</p>
                    `).join('')}
                    <p>Tambahan: ${group.item_tambahan || '-'} ${group.item_tambahan ? '- ' + formatRupiah(group.harga_tambahan) : ''}</p>
                    <p>${group.customer_address}</p>
                    ${group.orders[0].metode_pembayaran === 'cod' ? `<p>Total Harga: ${formatRupiah(group.orders.reduce((total, order) => total + order.subtotal_harga, 0) + (parseInt(group.harga_tambahan) || 0) + (parseInt(group.ongkir) || 0))}</p>` : ''}
                    ${group.orders[0].notes ? `<div class="alert alert-warning">${group.orders[0].notes}</div>` : ''}
                    <div class="btn-list">
                        <a class="btn btn-success" href="https://wa.me/${formatPhoneNumber(group.customer_phone)}" target="_blank">
                            Chat WhatsApp
                        </a>
                        ${group.customer_telepon_alt ? `
                        <a class="btn btn-success" href="https://wa.me/${formatPhoneNumber(group.customer_telepon_alt)}" target="_blank">
                            Chat WhatsApp (Alternatif)
                        </a>` : ''}
                        ${group.customer_maps ? `
                        <a class="btn btn-primary" href="${group.customer_maps}" target="_blank">
                            Open Maps
                        </a>` : ''}
                        <a class="btn btn-info open-chat-history" href="#" data-customer-phone="${formatPhoneNumber(group.customer_phone)}">
                            Chat
                        </a>
                    </div>
                </div>
            `;
            deliveryList.appendChild(card);

            // Set initial height for animation
            const cardBody = card.querySelector('.card-body');
            cardBody.dataset.expandedHeight = cardBody.scrollHeight + 'px';
        });

        // Tambah event listener untuk toggle details
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

        // Tambah event listener untuk checkbox status pengiriman
        document.querySelectorAll('.checkbox-delivered').forEach(checkbox => {
            checkbox.addEventListener('click', async (e) => {
                e.stopPropagation(); // Prevent toggle-details from triggering
                const customerId = checkbox.dataset.customerId;
                const group = groupedOrders.find(g => g.customer_id == customerId);
                const newStatus = group.orders.every(order => order.status_pengiriman === 'completed') ? 'pending' : 'completed';
                const card = checkbox.closest('.card');

                // Update icon immediately
                checkbox.innerHTML = newStatus === 'completed' ?
                    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="icon text-success"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M5 12l5 5l10 -10"/></svg>' :
                    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="icon"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><circle cx="12" cy="12" r="9"/></circle></svg>';

                try {
                    const response = await fetch('/api/update-delivery-status', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            delivery_ids: group.orders.map(order => order.delivery_date_id),
                            status: newStatus,
                        }),
                    });

                    if (response.ok) {
                        group.orders.forEach(order => order.status_pengiriman = newStatus);
                        totalPending = newStatus === 'completed' ? totalPending - 1 : totalPending + 1;
                        pendingDeliveriesSpan.textContent = `(Belum diantar: ${totalPending})`;

                        // Delay the re-render and animation
                        setTimeout(() => {
                            card.classList.add('fade-out');
                            setTimeout(() => {
                                renderDeliveryList(groupedOrders, date);
                                fetchDeliveries(date, prevButton, nextButton, tableBody, totalBadge, dateSubtitle, false);
                            }, 300); // Match fade-out duration
                        }, 300); // Small delay to allow multiple clicks
                    } else {
                        showToast('Error', 'Gagal memperbarui status pengiriman', true);
                        // Revert icon if failed
                        checkbox.innerHTML = newStatus === 'completed' ?
                            '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="icon"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><circle cx="12" cy="12" r="9"/></circle></svg>' :
                            '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="icon text-success"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M5 12l5 5l10 -10"/></svg>';
                    }
                } catch (error) {
                    console.error('Error updating delivery status:', error);
                    showToast('Error', 'Gagal memperbarui status: ' + error.message, true);
                    // Revert icon if failed
                    checkbox.innerHTML = newStatus === 'completed' ?
                        '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="icon"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><circle cx="12" cy="12" r="9"/></circle></svg>' :
                        '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="icon text-success"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M5 12l5 5l10 -10"/></svg>';
                }
            });
        });

        // Tambah event listener untuk tombol "Chat"
        document.querySelectorAll('.open-chat-history').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const customerPhone = button.dataset.customerPhone;
                window.open(`https://otomasiku.my.id/webhook/chat-history?hape=${customerPhone}`, '_blank');
            });
        });
    };

    // Event listener untuk tombol "Set All Delivered"
    setAllDeliveredButton.addEventListener('click', async () => {
        const pendingOrders = groupedOrders.filter(group => 
            group.orders.some(order => order.status_pengiriman !== 'completed')
        );
        if (pendingOrders.length === 0) return;

        const deliveryIds = pendingOrders.flatMap(group => group.orders.map(order => order.delivery_date_id));
        try {
            const response = await fetch('/api/update-delivery-status', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    delivery_ids: deliveryIds,
                    status: 'completed',
                }),
            });

            if (response.ok) {
                pendingOrders.forEach(group => {
                    group.orders.forEach(order => order.status_pengiriman = 'completed');
                });
                totalPending = 0;
                pendingDeliveriesSpan.textContent = `(Belum diantar: ${totalPending})`;
                renderDeliveryList(groupedOrders, currentDate);
                // Refresh tabel utama dengan tanggal aktif
                fetchDeliveries(currentDate, prevButton, nextButton, tableBody, totalBadge, dateSubtitle, false);
                showToast('Success', 'Semua antaran ditandai sebagai selesai', false);
            } else {
                showToast('Error', 'Gagal memperbarui status pengiriman', true);
            }
        } catch (error) {
            console.error('Error setting all delivered:', error);
            showToast('Error', 'Gagal memperbarui status: ' + error.message, true);
        }
    });

    // Event listener untuk tombol "Refresh"
    refreshButton.addEventListener('click', () => {
        const courierId = deliveryModal.dataset.courierId;
        fetchDeliveryDetails(courierId, currentDate); // Selalu gunakan tanggal aktif
    });

    // Event listener untuk tombol "Lihat Antaran"
    viewButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const courierId = button.dataset.courierId;
            const courierName = button.dataset.courierName;
            deliveryModal.dataset.courierId = courierId;
            courierNameSpan.textContent = courierName;
            fetchDeliveryDetails(courierId, currentDate); // Gunakan tanggal aktif

            const bsModal = new bootstrap.Modal(deliveryModal);
            bsModal.show();
        });
    });
}

// Inisialisasi standalone jika diperlukan
function initialize() {
    initDashboard();
}

initialize();