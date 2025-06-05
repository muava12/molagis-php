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
        // Display a loading message appropriate for the new layout
        tableBody.innerHTML = `
            <div class="text-center py-4">
                <p class="m-0">
                    <div class="spinner-border spinner-border-sm" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <span class="ms-2">Memuat data...</span>
                </p>
            </div>
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
            const deliveryDateStr = data.delivery_date; // Expected 'YYYY-MM-DD'
            const deliveryTimeZone = data.timezone || TIMEZONE; // Use API's timezone or global fallback
            const parsedApiDate = parseISO(deliveryDateStr); // Parses to a JS Date object

            // Get the day name in the specified timezone to correctly identify Sunday
            const dayNameInTimezone = formatInTimeZone(parsedApiDate, deliveryTimeZone, 'EEEE', { locale: id });
            const isSunday = dayNameInTimezone.toLowerCase() === 'minggu';

            if (isSunday) {
                tableBody.innerHTML = `
          <div class="text-center py-4">
              <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" id="Layer_1" viewBox="0 0 439.48 439.48" xml:space="preserve" width="150" height="150" style="margin: auto; display: block; margin-bottom: 1rem;">
                  <g>
                      <path style="fill:#FFD039;" d="M112.14,148.92C65.39,133.73,15.18,159.32,0,206.06l47.45,15.42l47.29,4.53l27.1,19.63v0.01   l47.45,15.41C184.47,214.31,158.89,164.11,112.14,148.92z"/>
                      <path style="fill:#3B9DFF;" d="M125.1,126.84l-11.67,35.9c-0.63,1.96-2.28,3.31-4.17,3.69l2.65,0.85l-1.26,3.9l-25.67,79.38   l-43.3,133.88l-10.47-3.39l43.3-133.89l26.93-83.26l2.73,0.88c-0.35-0.38-0.65-0.81-0.88-1.28c-0.63-1.24-0.79-2.73-0.32-4.16   l11.66-35.9c0.94-2.89,4.05-4.47,6.93-3.53C124.45,120.85,126.03,123.95,125.1,126.84z"/>
                      <path style="fill:#CCCCCC;" d="M218.4,347.9h-26.77l-6.2-16.77c-1.09-2.94-3.89-4.9-7.03-4.9h-45c-3.14,0-5.95,1.96-7.04,4.9   l-6.2,16.77h-10.92l-22.76-31.56c-2.42-3.35-7.11-4.11-10.47-1.69c-3.36,2.42-4.12,7.11-1.7,10.47l25,34.67   c1.41,1.95,3.68,3.11,6.09,3.11h9.22l-1.7,4.61l-3.56,9.62c-1.43,3.89,0.55,8.2,4.44,9.64c3.89,1.43,8.2-0.55,9.63-4.44l5.48-14.82   l1.7-4.61h50.57l1.7,4.61l5.48,14.82c1.12,3.03,3.99,4.9,7.04,4.9c0.86,0,1.74-0.15,2.6-0.46c3.88-1.44,5.87-5.75,4.43-9.64   l-3.56-9.62l-1.7-4.61h21.23c4.14,0,7.5-3.36,7.5-7.5C225.9,351.26,222.54,347.9,218.4,347.9z M136.16,347.9l2.46-6.67h34.55   l2.47,6.67H136.16z"/>
                      <polygon style="fill:#B3B3B3;" points="112.92,367.51 128.91,367.51 130.61,362.9 114.62,362.9  "/>
                      <polygon style="fill:#B3B3B3;" points="198.87,367.51 182.88,367.51 181.18,362.9 197.17,362.9  "/>
                      <path style="fill:#FFD039;" d="M268.74,396.51l-12.32,10.39H0c0-4.06,0.85-7.91,2.38-11.4c1.43-3.29,3.47-6.25,5.97-8.75   c5.15-5.16,12.28-8.35,20.15-8.35h227.92l11.63,17.1L268.74,396.51z"/>
                      <path style="fill:#EAB932;" d="M268.74,396.51l-12.32,10.39H0c0-4.06,0.85-7.91,2.38-11.4h265.67L268.74,396.51z"/>
                      <path style="fill:#EAB932;" d="M352.79,32.58c-27.75,0-50.24,22.5-50.24,50.25s22.49,50.25,50.24,50.25s50.25-22.5,50.25-50.25   S380.54,32.58,352.79,32.58z"/>
                      <path style="fill:#1E79C4;" d="M110.65,171.18l-25.67,79.38l-10.47-3.4l26.93-83.26l2.73,0.88c-0.35-0.38-0.65-0.81-0.88-1.28   C106.15,165.26,108.6,167.87,110.65,171.18z"/>
                      <path style="fill:#ED2E2E;" d="M112.14,148.92c20.54,6.67,24.88,49.97,9.7,96.72l-74.39-24.16   C62.64,174.73,91.6,142.25,112.14,148.92z"/>
                      <path style="fill:#3B9DFF;" d="M439.48,406.684v0.216H256.42v-28.5c5.08,2.5,10.17,5,20.34,5c20.34,0,20.34-10,40.68-10   c20.33,0,20.33,10,40.67,10c20.34,0,20.34-10,40.69-10c12.077,0,16.983,3.525,23.234,6.39   C432.599,384.631,439.48,395.063,439.48,406.684z"/>
                      <rect x="256.42" y="395.5" style="fill:#1E79C4;" width="183.06" height="11.4"/>
                      <path style="fill:#666666;" d="M386.318,181.904c-0.537,0.636-1.039,1.296-1.508,1.977c-1.005-1.486-2.146-2.875-3.443-4.094   c-6.334-5.954-14.966-9.021-23.547-6.685c2.593,0.995,5.167,1.807,7.585,3.208c3.423,1.984,6.505,4.539,8.906,7.699   c1.694,2.229,3.109,4.744,4.02,7.398c0.739,2.153,1.261,4.43,1.415,6.706c0.028,0.408-0.148,1.465,0.067,1.809   c0.012,0.019,0.01,0.02,0.018,0.034c-0.002,0.098-0.014,0.195-0.015,0.292c-0.045,3.215,2.923,5.751,6.107,5.034   c2.622-0.59,3.835-2.854,3.853-5.316c0.234-0.58,0.229-2.82,0.315-3.476c0.811-6.127,3.895-11.518,8.24-15.799   c1.906-1.878,4.199-3.512,6.57-4.733c2.251-1.16,4.553-1.959,6.916-2.857C402.327,170.454,392.506,174.569,386.318,181.904z"/>
                      <path style="fill:#FFD039;" d="M302.55,82.83c0,27.75,22.49,50.25,50.24,50.25c6.12,0,11.98-1.09,17.4-3.1   c2.01-5.42,3.1-11.28,3.1-17.4c0-27.75-22.49-50.25-50.25-50.25c-6.11,0-11.97,1.09-17.39,3.09   C303.64,70.85,302.55,76.71,302.55,82.83z"/>
                  </g>
              </svg>
              <p class="h3 mt-2 mb-1">Minggu Ceria!</p>
              <p class="text-muted mb-0">Saatnya istirahat dan menikmati hari libur.</p>
          </div>
      `;
                if (totalBadge) {
                    totalBadge.textContent = 'Libur';
                }
            } else {
                // This is the existing logic for non-Sundays
                tableBody.innerHTML = ''; // Clear previous content for non-Sundays
                if (data.deliveries?.length > 0) {
                    data.deliveries.forEach((delivery) => {
                        const item = document.createElement('div');
                        item.className = 'delivery-item-row py-3 border-bottom';
                        // Ensure this innerHTML matches the successfully refactored list item structure
                        item.innerHTML = `
              <div class="row g-3 align-items-center">
                  <div class="col-auto">
                      ${delivery.kurir_id === null || delivery.kurir_id === 0 ?
                          `<span class="avatar avatar-md bg-pink">
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-alert-square-rounded"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 3c7.2 0 9 1.8 9 9s-1.8 9 -9 9s-9 -1.8 -9 -9s1.8 -9 9 -9z" /><path d="M12 8v4" /><path d="M12 16h.01" /></svg>
                          </span>` :
                          `<span class="avatar avatar-md" style="background-image: url(https://api.dicebear.com/9.x/avataaars-neutral/svg?seed=${delivery.kurir_id});"></span>`}
                  </div>
                  <div class="col text-truncate">
                      <div class="text-body d-block text-truncate">${delivery.courier_name}</div>
                      <div class="text-muted text-truncate mt-n1">${delivery.jumlah_pengantaran} titik Pengantaran - ${delivery.jumlah_selesai} sudah sampai</div>
                  </div>
                  <div class="col-auto">
                      <a href="#" class="btn btn-icon view-delivery-details" data-courier-id="${delivery.kurir_id ?? 'null'}" data-courier-name="${delivery.courier_name}" aria-label="Lihat Antaran">
                          <svg class="icon icon-2" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M10 12a2 2 0 1 0 4 0a2 2 0 0 0 -4 0"/><path d="M21 12c-2.4 4 -5.4 6 -9 6c-3.6 0 -6.6 -2 -9 -6c2.4 -4 5.4 -6 9 -6c3.6 0 6.6 2 9 6"/></svg>
                      </a>
                  </div>
              </div>
          `;
                        tableBody.appendChild(item);
                    });
                } else {
                    tableBody.innerHTML = `
              <div class="text-center py-4">
                  <p class="m-0">Tidak ada pengantaran untuk tanggal ini</p>
              </div>
          `;
                }
                if (totalBadge) {
                    totalBadge.textContent = data.total_deliveries || 0;
                }
            }

            // Common updates for date subtitle, navigation button states, global showDate
            dateSubtitle.textContent = formatInTimeZone(parsedApiDate, deliveryTimeZone, 'eeee, dd MMMM yyyy', { locale: id });
            prevButton.dataset.date = deliveryDateStr;
            nextButton.dataset.date = deliveryDateStr;
            showDate = deliveryDateStr;

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
    tableBody = document.getElementById('deliveries-list-container');
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

    // ---- START: Initialize showDate from SSR data ----
    if (prevButton && prevButton.dataset.date) {
        showDate = getValidDate(prevButton.dataset.date);
    } else {
        showDate = getValidDate(new Date());
        console.warn('Initial date from prevButton.dataset.date not found for showDate, using current client date.');
    }
    // ---- END: Initialize showDate from SSR data ----

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

}

function initialize() {
    initDashboard();
    initOrder();
}

document.addEventListener('DOMContentLoaded', initialize);