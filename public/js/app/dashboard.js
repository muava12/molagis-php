/*
 * File: dashboard.js
 * Description: Logika untuk halaman dashboard, termasuk pengambilan data pengantaran,
 *              inisialisasi modal tambah customer, modal tambah pesanan, dan modal daftar antaran.
 */
import { renderErrorAlert, showToast, formatRupiah, formatPhoneNumber } from './utils.js';
import { initAddCustomerModal } from './add-customer-modal.js';
import { initialize as initOrder, fetchCustomers, resetForm } from './order.js';
import { parseISO, isValid, addDays, subDays } from 'https://cdn.jsdelivr.net/npm/date-fns@4.1.0/+esm';
import { formatInTimeZone } from 'https://cdn.jsdelivr.net/npm/date-fns-tz@3.2.0/+esm';
import { id } from 'https://cdn.jsdelivr.net/npm/date-fns@4.1.0/locale/+esm';

// Variabel global
const bootstrap = window.tabler?.bootstrap;
let isFetchingDeliveries = false; // Mencegah fetch berulang pada fetchDeliveries
let isFetchingDetails = false; // Mencegah fetch berulang pada fetchDeliveryDetails
const TIMEZONE = 'Asia/Makassar'; // Zona waktu untuk semua operasi tanggal
let showDate = getValidDate(new Date()); // Tanggal yang sedang ditampilkan
let refreshAbortController = null; // AbortController untuk fetchDeliveryDetails
let isModalOpen = false; // Melacak status modal
let groupedOrders = []; // Menyimpan data pengantaran di modal
let totalPending = 0; // Menyimpan jumlah pengantaran yang belum selesai
let prevButton = null; // Tombol navigasi sebelumnya
let nextButton = null; // Tombol navigasi berikutnya
let tableBody = null; // Elemen tbody tabel
let totalBadge = null; // Elemen untuk menampilkan total pengantaran
let dateSubtitle = null; // Elemen untuk menampilkan subtitle tanggal
let deliveryModal = null; // Modal daftar antaran
let deliveryList = null; // Elemen daftar antaran di modal
let courierNameSpan = null; // Elemen untuk nama kurir
let deliveryDateSpan = null; // Elemen untuk tanggal pengantaran
let totalDeliveriesSpan = null; // Elemen untuk total pengantaran
let pendingDeliveriesSpan = null; // Elemen untuk pengantaran belum selesai
let refreshButton = null; // Tombol refresh di modal
let setAllDeliveredButton = null; // Tombol set all delivered di modal

// Fungsi untuk memvalidasi dan memformat tanggal ke YYYY-MM-DD dalam zona waktu Asia/Makassar
function getValidDate(dateInput) {
    let date;
    if (typeof dateInput === 'string') {
        date = parseISO(dateInput);
        if (!isValid(date)) {
            console.warn('Invalid date string, falling back to today:', dateInput);
            date = new Date();
        }
    } else if (dateInput instanceof Date) {
        date = dateInput;
    } else {
        console.warn('Invalid date input, falling back to today:', dateInput);
        date = new Date();
    }

    try {
        return formatInTimeZone(date, TIMEZONE, 'yyyy-MM-dd');
    } catch (error) {
        console.error('Error formatting date with timezone:', error);
        return formatInTimeZone(new Date(), TIMEZONE, 'yyyy-MM-dd');
    }
}

// Fungsi debounce untuk menunda eksekusi hingga klik berulang selesai
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Fungsi untuk mengelola status tombol setAllDeliveredButton
function updateSetAllDeliveredButton() {
    if (!setAllDeliveredButton) return;
    requestAnimationFrame(() => {
        setAllDeliveredButton.classList.toggle('disabled', totalPending === 0);
    });
}

/**
 * Mengambil data pengantaran berdasarkan tanggal, sekaligus memperbarui status jika diperlukan.
 * @param {string} date Tanggal dalam format YYYY-MM-DD
 * @param {boolean} [showSpinner=true] Apakah menampilkan spinner
 * @param {number[]|null} [deliveryIds=null] Daftar ID pengiriman untuk diperbarui
 * @param {string|null} [status=null] Status baru (pending/completed)
 * @param {HTMLElement|null} [clickedButton=null] Tombol yang diklik untuk spinner
 * @returns {Promise<void>}
 */
async function fetchDeliveries(date, showSpinner = true, deliveryIds = null, status = null, clickedButton = null) {
    if (isFetchingDeliveries || !tableBody || !prevButton || !nextButton || !totalBadge || !dateSubtitle) {
        console.warn('fetchDeliveries: Required DOM elements or state not initialized');
        return;
    }
    isFetchingDeliveries = true;

    const validDate = getValidDate(date);
    console.log('Fetching deliveries for date:', validDate);

    prevButton.classList.add('disabled');
    nextButton.classList.add('disabled');

    if (showSpinner && clickedButton) {
        clickedButton.classList.add('disabled', 'btn-loading');
    }

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
        const payload = {};
        if (deliveryIds && status) {
            if (!deliveryIds?.length) throw new Error('Invalid delivery IDs');
            payload.delivery_ids = deliveryIds;
            payload.status = status;
        }

        const url = deliveryIds && status
            ? `/api/deliveries/update-status?date=${encodeURIComponent(validDate)}`
            : `/api/deliveries?date=${encodeURIComponent(validDate)}`;
        const response = await fetch(url, {
            method: deliveryIds && status ? 'POST' : 'GET',
            headers: { 'Content-Type': 'application/json' },
            body: deliveryIds && status ? JSON.stringify(payload) : null,
        });

        const data = await response.json();
        console.debug('fetchDeliveries API response:', data);

        if (response.ok && data.error === null) {
            tableBody.innerHTML = '';
            if (data.deliveries?.length > 0) {
                data.deliveries.forEach((delivery) => {
                    const row = document.createElement('tr');
                    const avatarStyle =
                        delivery.kurir_id === null || delivery.kurir_id === 0
                            ? `<span class="avatar avatar-sm bg-pink">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-alert-square-rounded"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 3c7.2 0 9 1.8 9 9s-1.8 9 -9 9s-9 -1.8 -9 -9s1.8 -9 9 -9z" /><path d="M12 8v4" /><path d="M12 16h.01" /></svg>
                            </span>`
                            : `<span class="avatar avatar-sm" style="background-image: url(https://api.dicebear.com/9.x/avataaars-neutral/svg?seed=${delivery.kurir_id});"></span>`;
                    row.innerHTML = `
                        <td>
                            <div class="d-flex align-items-center">
                                ${avatarStyle}
                                <div class="ms-2">${delivery.courier_name}</div>
                            </div>
                        </td>
                        <td>
                            ${delivery.jumlah_pengantaran} titik Pengantaran
                            <div class="text-muted small">${delivery.jumlah_selesai} sudah sampai</div>
                        </td>
                        <td class="text-center">
                            <a href="#" class="btn btn-icon view-delivery-details" data-courier-id="${delivery.kurir_id ?? 'null'}" data-courier-name="${delivery.courier_name}" aria-label="Lihat Antaran">
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
            } else {
                tableBody.innerHTML = '<tr><td colspan="3" class="text-center">Tidak ada pengantaran untuk tanggal ini</td></tr>';
            }

            totalBadge.textContent = data.total_deliveries || 0;
            dateSubtitle.textContent = formatInTimeZone(data.delivery_date || validDate, data.timezone || TIMEZONE, 'eeee, dd MMMM yyyy', { locale: id });
            prevButton.dataset.date = data.delivery_date || validDate;
            nextButton.dataset.date = data.delivery_date || validDate;
            showDate = data.delivery_date || validDate;

            const errorContainer = document.querySelector('#error-container');
            if (errorContainer) errorContainer.innerHTML = '';
        } else {
            console.error('fetchDeliveries API error:', data.error);
            const errorContainer = document.querySelector('#error-container');
            if (errorContainer && !errorContainer.querySelector('.alert')) {
                renderErrorAlert(data.error || 'Gagal mengambil data pengantaran');
            }
        }
    } catch (error) {
        console.error('fetchDeliveries error:', error);
        const errorContainer = document.querySelector('#error-container');
        if (errorContainer && !errorContainer.querySelector('.alert')) {
            renderErrorAlert('Gagal mengambil data: ' + error.message);
        }
    } finally {
        if (showSpinner && clickedButton) {
            requestAnimationFrame(() => {
                clickedButton.classList.remove('disabled', 'btn-loading');
            });
        }
        prevButton.classList.remove('disabled');
        nextButton.classList.remove('disabled');
        isFetchingDeliveries = false;
    }
}

/**
 * Mengambil detail pengantaran untuk kurir tertentu.
 * @param {string} courierId ID kurir atau 'null' untuk item tanpa kurir
 * @param {string} date Tanggal dalam format YYYY-MM-DD
 */
async function fetchDeliveryDetails(courierId, date) {
    if (isFetchingDetails || !deliveryList || !courierNameSpan || !deliveryDateSpan || !totalDeliveriesSpan || !pendingDeliveriesSpan || !refreshButton || !setAllDeliveredButton) {
        console.warn('fetchDeliveryDetails: Required DOM elements or state not initialized');
        return;
    }
    isFetchingDetails = true;

    if (refreshAbortController) {
        refreshAbortController.abort();
    }
    refreshAbortController = new AbortController();

    refreshButton.classList.add('disabled', 'btn-loading');
    setAllDeliveredButton.classList.add('disabled');

    const validDate = getValidDate(date);
    console.log(`Fetching delivery details for courier ${courierId} on date ${validDate}`);
    deliveryList.innerHTML = '<p class="text-center transition-opacity duration-300">Memuat data...</p>';

    try {
        const response = await fetch(`/api/delivery-details?courier_id=${encodeURIComponent(courierId)}&date=${encodeURIComponent(validDate)}`, {
            signal: refreshAbortController.signal,
        });
        const data = await response.json();
        console.debug('fetchDeliveryDetails API response:', data);

        if (response.ok && data.error === null) {
            groupedOrders = data.grouped_orders || [];
            renderDeliveryList(groupedOrders, validDate, courierId);
            courierNameSpan.textContent = data.courier_name || 'Belum Dipilih';
            deliveryDateSpan.textContent = formatInTimeZone(validDate, TIMEZONE, 'eeee, dd MMMM yyyy', { locale: id });
            totalDeliveriesSpan.textContent = groupedOrders.length;
            totalPending = groupedOrders.filter(group =>
                group.orders?.some(order => order.status_pengiriman !== 'completed')
            ).length || 0;
            pendingDeliveriesSpan.textContent = `(Belum diantar: ${totalPending})`;
            console.debug('totalPending:', totalPending);
            updateSetAllDeliveredButton();
        } else {
            console.error('fetchDeliveryDetails API error:', data.error);
            deliveryList.innerHTML = '<p class="text-center transition-opacity duration-300 text-danger">Gagal memuat data: ' + (data.error || 'Unknown error') + '</p>';
            showToast('Error', data.error || 'Gagal memuat data antaran', true);
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            console.debug('Fetch aborted for delivery details');
            return;
        }
        console.error('fetchDeliveryDetails error:', error);
        deliveryList.innerHTML = '<p class="text-center transition-opacity duration-300 text-danger">Gagal memuat data: ' + error.message + '</p>';
        showToast('Error', 'Gagal memuat data: ' + error.message, true);
    } finally {
        isFetchingDetails = false;
        requestAnimationFrame(() => {
            refreshButton.classList.remove('disabled', 'btn-loading');
            updateSetAllDeliveredButton();
        });
    }
}

/**
 * Merender daftar antaran di modal.
 * @param {Array} groupedOrders Data antaran yang dikelompokkan
 * @param {string} date Tanggal dalam format YYYY-MM-DD
 * @param {string} courierId ID kurir atau 'null' untuk item tanpa kurir
 */
const renderDeliveryList = (groupedOrders, date, courierId) => {
    deliveryList.innerHTML = '';
    deliveryList.classList.add('transition-opacity', 'duration-300');

    console.debug('renderDeliveryList groupedOrders length:', groupedOrders.length);

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
        updateSetAllDeliveredButton(setAllDeliveredButton);
        return;
    }

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

    updateSetAllDeliveredButton(setAllDeliveredButton);
};

/**
 * Handler untuk tombol refresh.
 * @param {string} courierId ID kurir atau 'null' untuk item tanpa kurir
 * @param {string} date Tanggal dalam format YYYY-MM-DD
 */
async function handleRefreshDeliveries(courierId, date) {
    if (isFetchingDetails || !refreshButton || !setAllDeliveredButton) {
        console.warn('handleRefreshDeliveries: Required DOM elements or state not initialized');
        return;
    }

    refreshButton.classList.add('disabled', 'btn-loading');
    setAllDeliveredButton.classList.add('disabled');

    try {
        await fetchDeliveryDetails(courierId, date);
    } finally {
        requestAnimationFrame(() => {
            refreshButton.classList.remove('disabled', 'btn-loading');
            updateSetAllDeliveredButton();
        });
    }
}

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
async function handleSetDeliveryStatus({ deliveryIds, status, checkbox, card, group }) {
    if (!deliveryIds?.length || !checkbox || !card || !pendingDeliveriesSpan) {
        console.error('handleSetDeliveryStatus: Invalid parameters or DOM elements not initialized');
        showToast('Error', 'Tidak ada ID pengantaran yang valid atau elemen tidak tersedia', true);
        return;
    }

    let originalCheckboxHTML = checkbox.innerHTML;
    let originalOpacity = card.classList.contains('opacity-50');
    checkbox.innerHTML = status === 'completed'
        ? '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="icon text-success"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M5 12l5 5l10 -10"/></svg>'
        : '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="icon"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><circle cx="12" cy="12" r="9"/></circle></svg>';
    card.classList.toggle('opacity-50', status === 'completed');
    group.orders.forEach(order => order.status_pengiriman = status);
    totalPending = status === 'completed' ? totalPending - 1 : totalPending + 1;
    pendingDeliveriesSpan.textContent = `(Belum diantar: ${totalPending})`;
    checkbox.classList.add('disabled', 'opacity-50');

    updateSetAllDeliveredButton();

    try {
        await fetchDeliveries(showDate, false, deliveryIds, status);
    } catch (error) {
        console.error('Error updating delivery status:', error);
        showToast('Error', 'Gagal memperbarui status: ' + error.message, true);

        checkbox.innerHTML = originalCheckboxHTML;
        card.classList.toggle('opacity-50', originalOpacity);
        group.orders.forEach(order => order.status_pengiriman = status === 'completed' ? 'pending' : 'completed');
        totalPending = status === 'completed' ? totalPending + 1 : totalPending - 1;
        pendingDeliveriesSpan.textContent = `(Belum diantar: ${totalPending})`;
        updateSetAllDeliveredButton();
    } finally {
        requestAnimationFrame(() => {
            checkbox.classList.remove('disabled', 'opacity-50');
        });
    }
}

/**
 * Handler untuk tombol set all delivered.
 * @returns {Promise<void>}
 */
async function handleSetAllDelivered() {
    if (!pendingDeliveriesSpan || !refreshButton || !setAllDeliveredButton) {
        console.warn('handleSetAllDelivered: Required DOM elements not initialized');
        return;
    }

    const pendingOrders = groupedOrders.filter(group =>
        group.orders?.some(order => order.status_pengiriman !== 'completed')
    );
    if (pendingOrders.length === 0) return;

    const deliveryIds = pendingOrders.flatMap(group => group.orders.map(order => order.delivery_date_id));

    setAllDeliveredButton.classList.add('disabled', 'btn-loading');
    refreshButton.classList.add('disabled');

    try {
        await fetchDeliveries(showDate, false, deliveryIds, 'completed');

        groupedOrders.forEach(group => {
            if (group.orders?.some(order => deliveryIds.includes(order.delivery_date_id))) {
                group.orders.forEach(order => order.status_pengiriman = 'completed');
            }
        });
        totalPending = 0;
        pendingDeliveriesSpan.textContent = `(Belum diantar: ${totalPending})`;
        renderDeliveryList(groupedOrders, showDate, deliveryModal?.dataset.courierId || 'null');
    } catch (error) {
        console.error('Error setting all deliveries to completed:', error);
        showToast('Error', 'Gagal memperbarui semua status: ' + error.message, true);
    } finally {
        requestAnimationFrame(() => {
            setAllDeliveredButton.classList.add('disabled');
            setAllDeliveredButton.classList.remove('btn-loading');
            refreshButton.classList.remove('disabled');
        });
    }
}

/**
 * Menginisialisasi event listener untuk dashboard.
 */
export function initDashboard() {
    console.log('Initializing dashboard event listeners');

    prevButton = document.getElementById('prev-day');
    nextButton = document.getElementById('next-day');
    tableBody = document.querySelector('#deliveries-table tbody');
    totalBadge = document.getElementById('total-badge');
    dateSubtitle = document.getElementById('date-subtitle');
    deliveryModal = document.getElementById('delivery-list-modal');
    deliveryList = document.getElementById('delivery-list');
    courierNameSpan = document.getElementById('courier-name');
    deliveryDateSpan = document.getElementById('delivery-date');
    totalDeliveriesSpan = document.getElementById('total-deliveries');
    pendingDeliveriesSpan = document.getElementById('pending-deliveries');
    refreshButton = document.getElementById('refresh-delivery-list');
    setAllDeliveredButton = document.getElementById('set-all-delivered');

    if (!prevButton || !nextButton || !tableBody || !totalBadge || !dateSubtitle ||
        !deliveryModal || !deliveryList || !courierNameSpan || !deliveryDateSpan ||
        !totalDeliveriesSpan || !pendingDeliveriesSpan || !refreshButton || !setAllDeliveredButton) {
        console.error('One or more DOM elements not found:', {
            prevButton: !!prevButton,
            nextButton: !!nextButton,
            tableBody: !!tableBody,
            totalBadge: !!totalBadge,
            dateSubtitle: !!dateSubtitle,
            deliveryModal: !!deliveryModal,
            deliveryList: !!deliveryList,
            courierNameSpan: !!courierNameSpan,
            deliveryDateSpan: !!deliveryDateSpan,
            totalDeliveriesSpan: !!totalDeliveriesSpan,
            pendingDeliveriesSpan: !!pendingDeliveriesSpan,
            refreshButton: !!refreshButton,
            setAllDeliveredButton: !!setAllDeliveredButton,
        });
        return;
    }

    // Fungsi untuk memperbarui tanggal di frontend dan menunda fetch
    const debouncedFetchDeliveries = debounce(({ newDate, clickedButton }) => {
        fetchDeliveries(newDate, true, null, null, clickedButton);
    }, 200);

    // Handler untuk navigasi tanggal (previous)
    const prevHandler = () => {
        console.log('Previous button clicked');
        const current = parseISO(showDate);
        const prevDate = subDays(current, 1);
        const newDate = getValidDate(prevDate);
        showDate = newDate;
        dateSubtitle.textContent = formatInTimeZone(newDate, TIMEZONE, 'eeee, dd MMMM yyyy', { locale: id }); // Perbarui tanggal di UI langsung
        prevButton.dataset.date = newDate;
        nextButton.dataset.date = newDate;
        debouncedFetchDeliveries({ newDate, clickedButton: prevButton }); // Fetch dengan debounce
    };

    // Handler untuk navigasi tanggal (next)
    const nextHandler = () => {
        console.log('Next button clicked');
        const current = parseISO(showDate);
        const nextDate = addDays(current, 1);
        const newDate = getValidDate(nextDate);
        showDate = newDate;
        dateSubtitle.textContent = formatInTimeZone(newDate, TIMEZONE, 'eeee, dd MMMM yyyy', { locale: id }); // Perbarui tanggal di UI langsung
        prevButton.dataset.date = newDate;
        nextButton.dataset.date = newDate;
        debouncedFetchDeliveries({ newDate, clickedButton: nextButton }); // Fetch dengan debounce
    };

    // Pasang listener untuk tombol navigasi
    prevButton.addEventListener('click', prevHandler);
    nextButton.addEventListener('click', nextHandler);

    // Pasang listener untuk tombol refresh dan set all delivered
    refreshButton.addEventListener('click', () => {
        if (!isModalOpen) return;
        console.debug('Refresh button clicked');
        const courierId = deliveryModal.dataset.courierId;
        handleRefreshDeliveries(courierId, showDate);
    });

    setAllDeliveredButton.addEventListener('click', () => {
        if (!isModalOpen) return;
        console.debug('Set all delivered button clicked');
        handleSetAllDelivered();
    });

    // Handler untuk elemen dinamis di deliveryList
    const deliveryListHandler = (e) => {
        const toggleButton = e.target.closest('.toggle-details');
        const checkbox = e.target.closest('.checkbox-delivered');
        const chatHistoryButton = e.target.closest('.open-chat-history');

        if (toggleButton) {
            e.preventDefault();
            const card = toggleButton.closest('.card');
            const cardBody = card.querySelector('.card-body');
            const chevron = toggleButton.querySelector('.icon');
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
        }

        if (checkbox) {
            e.stopPropagation();
            if (checkbox.classList.contains('disabled')) return;

            const customerId = checkbox.dataset.customerId;
            const group = groupedOrders.find(g => g.customer_id == customerId);
            if (!group) return;

            const newStatus = group.orders.every(order => order.status_pengiriman === 'completed') ? 'pending' : 'completed';
            const card = checkbox.closest('.card');

            handleSetDeliveryStatus({
                deliveryIds: group.orders.map(order => order.delivery_date_id),
                status: newStatus,
                checkbox,
                card,
                group,
            });
        }

        if (chatHistoryButton) {
            e.preventDefault();
            const customerPhone = chatHistoryButton.dataset.customerPhone;
            window.open(`https://otomasiku.my.id/webhook/chat-history?hape=${customerPhone}`, '_blank');
        }
    };

    // Pasang listener untuk deliveryList sekali di awal
    deliveryList.addEventListener('click', deliveryListHandler);

    // Handler untuk tombol view-delivery-details
    const tableBodyHandler = (e) => {
        const button = e.target.closest('.view-delivery-details');
        if (!button) return;
        e.preventDefault();
        const courierId = button.dataset.courierId;
        const courierName = button.dataset.courierName;
        deliveryModal.dataset.courierId = courierId;
        deliveryModal.dataset.date = showDate;
        courierNameSpan.textContent = courierName;

        handleRefreshDeliveries(courierId, showDate);

        const bsModal = new bootstrap.Modal(deliveryModal);
        bsModal.show();
    };

    // Pasang listener untuk tableBody sekali di awal
    tableBody.addEventListener('click', tableBodyHandler);

    // Handler untuk modal show dan hide
    const modalShowHandler = () => {
        console.debug('Modal shown');
        isModalOpen = true;
        updateSetAllDeliveredButton();
    };

    const modalHideHandler = () => {
        console.debug('Modal hidden');
        isModalOpen = false;
        if (refreshAbortController) {
            refreshAbortController.abort();
            refreshAbortController = null;
        }
    };

    // Pasang listener untuk modal sekali di awal
    deliveryModal.addEventListener('shown.bs.modal', modalShowHandler);
    deliveryModal.addEventListener('hidden.bs.modal', modalHideHandler);

    // Fallback: Paksa tutup modal jika macet
    const forceCloseModal = () => {
        if (deliveryModal.classList.contains('show')) {
            console.warn('Modal stuck, forcing close');
            const bsModal = bootstrap.Modal.getInstance(deliveryModal);
            if (bsModal) {
                bsModal.hide();
            } else {
                deliveryModal.classList.remove('show');
                deliveryModal.style.display = 'none';
                document.querySelector('.modal-backdrop')?.remove();
                document.body.classList.remove('modal-open');
                showToast('Peringatan', 'Modal ditutup paksa karena error', true);
            }
            isModalOpen = false;
        }
    };

    // Inisialisasi modal tambah pelanggan
    initAddCustomerModal('dashboard-add-modal', {
        showToast,
        showErrorToast: (title, message) => renderErrorAlert(message),
    });

    // Inisialisasi modal tambah pesanan
    const orderModal = document.getElementById('modal-add-order');
    if (orderModal) {
        orderModal.addEventListener('shown.bs.modal', () => {
            console.log('Order modal shown, initializing order logic');
            fetchCustomers();
        });
        orderModal.addEventListener('hidden.bs.modal', () => {
            console.log('Order modal hidden, calling custom resetForm');
            resetForm(); // Call the imported resetForm function
        });
    }

    // Tidak perlu fetch data awal karena data sudah di-render oleh Twig
    // showDate sudah diatur oleh Twig melalui current_date
}

function initialize() {
    initDashboard();
    initOrder();
}

document.addEventListener('DOMContentLoaded', initialize);