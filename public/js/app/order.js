// order.js
import {
    format,
    startOfMonth,
    endOfMonth,
    getDaysInMonth,
    subMonths,
    addMonths,
    isSameDay,
    parse,
    getYear,
    getDay,
    isSameMonth,
} from 'https://cdn.jsdelivr.net/npm/date-fns@4.1.0/+esm';
import { id } from 'https://cdn.jsdelivr.net/npm/date-fns@4.1.0/locale/+esm';
import { showToast } from './utils.js';
import autosize from '../autosize.esm.js';

const selectedDates = new Set();
let customerId = null;
let currentCustomerOngkir = 5000;
let packagesData = [];
let cachedHolidays = [];
const bootstrap = window.tabler?.bootstrap;

const prevMonthBtn = document.getElementById('prev-month');
const todayBtn = document.getElementById('today-btn');
const nextMonthBtn = document.getElementById('next-month');
const nextMonthButton = document.getElementById('next-month-btn');
const clearButton = document.getElementById('clear-btn');
const calendarMonthYear = document.getElementById('calendar-month-year');
const calendarDays = document.getElementById('calendar-days');
const selectedDatesCount = document.getElementById('selected-dates-count');
const selectedDatesContainer = document.getElementById('selected-dates');
const selectedDatesHidden = document.getElementById('selected-dates-hidden');
const orderForm = document.getElementById('order-form');
const customerInput = document.getElementById('customer-input');
const packageSelect = document.getElementById('package-select');
const orderQuantity = document.getElementById('order-quantity');
const addPackageBtn = document.querySelector('.add-package');
const shippingCost = document.getElementById('shipping-cost');
const shippingFastIcon = document.getElementById('shipping-fast-icon');
const paymentMethod = document.getElementById('payment-method');
const errorNotification = document.getElementById('error-notification');
const courierSelect = document.getElementById('courier-select');

let displayedYear = new Date().getFullYear();
let displayedMonth = new Date().getMonth();
let isDragging = false;

async function initialize() {
    try {
        cachedHolidays = await fetchHolidayDates(displayedYear);
        await Promise.all([
            initializeCalendar(),
            fetchCustomers(),
            fetchPackages(),
        ]);
        setupEventListeners();
        setupAddRemovePackageHandlers();
        addPackageListeners(document.querySelector('.package-list'));
        autosize(document.querySelectorAll('textarea'));
    } catch (error) {
        console.error('Initialization error:', error);
        showToast('Error', 'Gagal memuat data awal: ' + error.message, true);
    }
}

async function initializeCalendar() {
    try {
        await renderCalendar(displayedYear, displayedMonth);
    } catch (error) {
        console.error('Failed to initialize calendar:', error);
        showToast('Error', 'Gagal memuat kalender', true);
    }
}

async function renderCalendar(year, month) {
    try {
        if (!calendarDays) {
            console.error('calendar-days element not found');
            showToast('Error', 'Elemen kalender tidak ditemukan', true);
            return;
        }
        const displayedMonth = new Date(year, month, 1);
        if (calendarMonthYear.textContent !== format(displayedMonth, 'MMMM yyyy', { locale: id })) {
            calendarMonthYear.textContent = format(displayedMonth, 'MMMM yyyy', { locale: id });
        }

        const firstDayOfMonth = startOfMonth(displayedMonth);
        const lastDayOfMonth = endOfMonth(displayedMonth);
        const firstDayIndex = (firstDayOfMonth.getDay() + 6) % 7;
        const daysInMonth = getDaysInMonth(displayedMonth);
        const prevMonthDays = firstDayIndex;
        const lastDayOfPrevMonth = endOfMonth(subMonths(displayedMonth, 1));
        const prevMonthDaysCount = lastDayOfPrevMonth.getDate();

        calendarDays.innerHTML = '';
        let dayCounter = 0;

        for (let i = prevMonthDays - 1; i >= 0; i--) {
            const day = prevMonthDaysCount - i;
            const date = new Date(year, month - 1, day);
            const fullDate = format(date, 'yyyy-MM-dd');
            const dayElement = createDayElement(date, fullDate, 'text-muted', dayCounter++);
            calendarDays.appendChild(dayElement);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const fullDate = format(date, 'yyyy-MM-dd');
            const extraClass = isSameDay(date, new Date()) ? 'today' : '';
            const dayElement = createDayElement(date, fullDate, 'text-body', dayCounter++, extraClass);
            calendarDays.appendChild(dayElement);
        }

        const totalDaysRendered = prevMonthDays + daysInMonth;
        const remainingDays = (7 - (totalDaysRendered % 7)) % 7;
        for (let day = 1; day <= remainingDays; day++) {
            const date = new Date(year, month + 1, day);
            const fullDate = format(date, 'yyyy-MM-dd');
            const dayElement = createDayElement(date, fullDate, 'text-muted', dayCounter++);
            calendarDays.appendChild(dayElement);
        }

        renderSelectedDates();

        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.forEach(function (tooltipTriggerEl) {
            new bootstrap.Tooltip(tooltipTriggerEl, {
                container: 'body',
                trigger: 'hover',
                delay: { show: 100, hide: 200 }
            });
        });
    } catch (error) {
        console.error('Failed to render calendar:', error);
        showToast('Error', 'Gagal merender kalender: ' + error.message, true);
    }
}

function createDayElement(date, fullDate, textClass, index, extraClass = '') {
    const dayElement = document.createElement('div');
    dayElement.classList.add('date-picker-day', textClass);
    if (extraClass) dayElement.classList.add(extraClass);
    dayElement.textContent = date.getDate();
    dayElement.dataset.date = fullDate;
    dayElement.dataset.index = index;

    const isSunday = getDay(date) === 0;
    const holiday = cachedHolidays.find(h => h.date === fullDate);
    if (isSunday) {
        dayElement.classList.add('disabled', 'text-muted');
    } else if (holiday) {
        dayElement.classList.add('holiday');
        dayElement.setAttribute('data-bs-toggle', 'tooltip');
        dayElement.setAttribute('data-bs-placement', 'bottom');
        dayElement.setAttribute('title', holiday.name);
    }

    if (selectedDates.has(fullDate)) {
        dayElement.classList.add('selected');
        if (isSameMonth(date, new Date(displayedYear, displayedMonth, 1))) {
            dayElement.classList.remove('text-body');
        }
    }

    addDayEventListeners(dayElement, date);
    return dayElement;
}

function addDayEventListeners(dayElement, date) {
    const isSunday = getDay(date) === 0;
    if (isSunday) return;

    if (dayElement.classList.contains('text-muted') && !dayElement.classList.contains('selected')) {
        dayElement.addEventListener('click', () => {
            if (!isSameMonth(date, new Date(displayedYear, displayedMonth, 1))) {
                const dateStr = dayElement.dataset.date;
                if (selectedDates.has(dateStr)) {
                    selectedDates.delete(dateStr);
                } else {
                    selectedDates.add(dateStr);
                }
                displayedYear = date.getFullYear();
                displayedMonth = date.getMonth();
                renderCalendar(displayedYear, displayedMonth);
            }
        });
        return;
    }

    dayElement.addEventListener('mousedown', (e) => {
        e.preventDefault();
        isDragging = true;
        toggleDate(dayElement);
    });

    dayElement.addEventListener('mouseover', () => {
        if (isDragging) toggleDate(dayElement);
    });

    dayElement.addEventListener('mouseup', () => {
        isDragging = false;
    });
}

function toggleDate(dayElement) {
    const dateStr = dayElement.dataset.date;
    if (!dateStr || dayElement.classList.contains('disabled')) return;

    if (selectedDates.has(dateStr)) {
        selectedDates.delete(dateStr);
        dayElement.classList.remove('selected');
        if (isSameMonth(parse(dateStr, 'yyyy-MM-dd', new Date()), new Date(displayedYear, displayedMonth, 1))) {
            dayElement.classList.add('text-body');
        } else {
            dayElement.classList.add('text-muted');
        }
    } else {
        selectedDates.add(dateStr);
        dayElement.classList.add('selected');
        dayElement.classList.remove('text-body', 'text-muted');
    }
    renderSelectedDates();
    calculateTotalPayment();
}

function renderSelectedDates() {
    selectedDatesCount.textContent = `${selectedDates.size} Hari dipilih`;
    selectedDatesContainer.innerHTML = '';
    const currentYear = new Date().getFullYear();

    const sortedDates = Array.from(selectedDates).sort((a, b) => new Date(a) - new Date(b));
    sortedDates.forEach(dateStr => {
        const date = parse(dateStr, 'yyyy-MM-dd', new Date());
        const year = getYear(date);
        const formatStr = year === currentYear ? 'EEE, d MMM' : 'EEE, d MMM yy';
        const badge = document.createElement('span');
        badge.classList.add('badge', 'badge-primary', 'border-muted', 'badge-sm', 'text-truncate');

        const dateText = document.createElement('span');
        dateText.textContent = format(date, formatStr, { locale: id });
        badge.appendChild(dateText);

        const closeButton = document.createElement('button');
        closeButton.classList.add('badge-close-btn');
        closeButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
        `;
        closeButton.addEventListener('click', (e) => {
            e.stopPropagation();
            selectedDates.delete(dateStr);
            renderCalendar(displayedYear, displayedMonth);
            renderSelectedDates();
            calculateTotalPayment();
        });
        badge.appendChild(closeButton);

        selectedDatesContainer.appendChild(badge);
    });

    selectedDatesHidden.value = JSON.stringify(sortedDates);
}

async function fetchHolidayDates(year) {
    try {
        if (cachedHolidays.length > 0 && cachedHolidays[0].date.startsWith(year.toString())) {
            return cachedHolidays;
        }
        const response = await fetchWithRetry(`https://api-harilibur.pages.dev/api?year=${year}`, {}, true);
        console.debug('Fetched holidays:', response);

        const holidays = response
            .filter(h => h.is_national_holiday === true)
            .map(h => {
                try {
                    const parsedDate = parse(h.holiday_date, 'yyyy-M-d', new Date());
                    const normalizedDate = format(parsedDate, 'yyyy-MM-dd');
                    return {
                        date: normalizedDate,
                        name: h.holiday_name
                    };
                } catch (error) {
                    console.warn(`Failed to parse holiday date: ${h.holiday_date}`, error);
                    return null;
                }
            })
            .filter(h => h !== null);

        cachedHolidays = holidays;
        console.debug('Filtered and normalized holidays:', holidays);
        return holidays;
    } catch (error) {
        console.error('Failed to fetch holidays:', error);
        showToast('Error', 'Gagal memuat data hari libur. Pastikan koneksi internet stabil.', true);
        return [];
    }
}

async function fetchCustomers() {
    try {
        const response = await fetchWithRetry('/api/customers');
        if (!Array.isArray(response)) {
            throw new Error('Response is not an array');
        }
        displayCustomerSuggestions(response);
    } catch (error) {
        console.error('Failed to fetch customers:', error);
        showToast('Error', 'Gagal memuat daftar pelanggan: ' + error.message, true);
    }
}

function displayCustomerSuggestions(customers) {
    const customerData = customers.map(customer => ({
        label: customer.nama,
        value: customer.id,
        ongkir: customer.ongkir >= 0 ? customer.ongkir : 5000,
        address: customer.alamat || 'Alamat tidak tersedia'
    }));
    console.debug('Customer data:', customerData);
    const awesomplete = new Awesomplete(customerInput, {
        list: customerData,
        minChars: 2,
        autoFirst: true,
        filter: (text, input) => Awesomplete.FILTER_STARTSWITH(text.label, input) || Awesomplete.FILTER_CONTAINS(text.label, input),
        sort: (a, b) => {
            const inputText = customerInput.value.toLowerCase();
            const aStartsWith = a.label.toLowerCase().startsWith(inputText);
            const bStartsWith = b.label.toLowerCase().startsWith(inputText);
            return aStartsWith && !bStartsWith ? -1 : !aStartsWith && bStartsWith ? 1 : a.label.localeCompare(b.label);
        },
        item: (text, input) => {
            const li = document.createElement('li');
            li.textContent = text.label;
            li.setAttribute('data-value', text.value);
            li.setAttribute('data-ongkir', text.ongkir);
            li.setAttribute('data-address', text.address);
            return li;
        }
    });
    customerInput.addEventListener('awesomplete-selectcomplete', (e) => {
        const selectedCustomer = customerData.find(customer => customer.value === e.text.value);
        customerId = e.text.value;
        customerInput.value = e.text.label;
        currentCustomerOngkir = selectedCustomer ? parseFloat(selectedCustomer.ongkir) || 5000 : 5000;
        customerInput.dataset.address = selectedCustomer ? selectedCustomer.address : '';
        shippingCost.value = currentCustomerOngkir;
        shippingFastIcon.classList.toggle('d-none', parseFloat(shippingCost.value) !== currentCustomerOngkir);
        calculateTotalPayment();
    });
}

async function fetchPackages() {
    try {
        const cached = localStorage.getItem('packagesData');
        if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < 3600000) {
                packagesData = data;
                updatePackageSelect();
                return;
            }
        }
        const response = await fetchWithRetry('/api/packages');
        if (!Array.isArray(response)) {
            throw new Error('Package response is not an array');
        }
        packagesData = response;
        localStorage.setItem('packagesData', JSON.stringify({ data: packagesData, timestamp: Date.now() }));
        updatePackageSelect();
    } catch (error) {
        console.error('Failed to fetch packages:', error);
        showToast('Error', 'Gagal memuat daftar paket makanan', true);
    }
}

function updatePackageSelect() {
    if (packageSelect.options.length <= 1) {
        packageSelect.innerHTML = '<option value="" disabled selected>Pilih Paket Makanan</option>' +
            packagesData.map(p => `<option value="${p.id}">${p.nama} (Rp ${p.harga_jual.toLocaleString('id-ID')})</option>`).join('');
    }
}

function calculateTotalPayment() {
    let totalPackageCost = 0;
    let totalModalCost = 0;
    const packageLists = document.querySelectorAll('.package-list');
    packageLists.forEach(list => {
        const packageId = list.querySelector('#package-select').value;
        const packageData = packagesData.find(pkg => pkg.id == packageId);
        const packagePrice = packageData ? packageData.harga_jual : 0;
        const packageModal = packageData ? packageData.harga_modal : 0;
        const orderQty = parseInt(list.querySelector('#order-quantity').value) || 0;
        console.debug(`Package ID: ${packageId}, Price: ${packagePrice}, Modal: ${packageModal}, Quantity: ${orderQty}`);
        totalPackageCost += packagePrice * orderQty;
        totalModalCost += packageModal * orderQty;
    });
    const additionalItemsCost = parseFloat(document.querySelector('#harga-item-tambahan').value) || 0;
    const additionalModalCost = parseFloat(document.querySelector('#harga-modal-item-tambahan').value) || 0;
    const shipping = parseFloat(shippingCost.value) || currentCustomerOngkir;
    const totalPerDayValue = totalPackageCost + additionalItemsCost + shipping;
    const totalModalPerDayValue = totalModalCost + additionalModalCost;
    const totalPaymentValue = totalPerDayValue * selectedDates.size;

    return {
        totalPerDay: totalPerDayValue,
        totalModalPerDay: totalModalPerDayValue,
        totalPayment: totalPaymentValue,
        shipping: shipping
    };
}

function setupAddRemovePackageHandlers() {
    const packageList = document.querySelector('.package-list');
    const packageTemplate = document.querySelector('.package-list .col-7');
    const quantityTemplate = document.querySelector('.package-list .col-3');

    if (!packageList || !packageTemplate || !quantityTemplate) {
        console.warn('Package list or templates not found:', { packageList, packageTemplate, quantityTemplate });
        return;
    }

    addPackageBtn.addEventListener('click', () => {
        if (document.querySelectorAll('.package-list').length >= 5) {
            showToast('Error', 'Maksimum 5 paket dapat ditambahkan.', true);
            return;
        }
        const newList = document.createElement('div');
        newList.classList.add('row', 'g-2', 'mb-3', 'package-list', 'added-package');
        const newPackage = packageTemplate.cloneNode(true);
        const newQuantity = quantityTemplate.cloneNode(true);
        const newButton = document.createElement('div');
        newButton.classList.add('col-2', 'align-self-end');
        newButton.innerHTML = `<button type="button" class="btn btn-icon remove-package w-100" aria-label="Hapus paket">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-minus"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M5 12l14 0" /></svg>
        </button>`;
        newPackage.querySelector('#package-select').selectedIndex = 0;
        newQuantity.querySelector('#order-quantity').value = 1;
        newList.append(newPackage, newQuantity, newButton);
        packageList.insertAdjacentElement('afterend', newList);
        addPackageListeners(newList);
        calculateTotalPayment();
    });

    document.addEventListener('click', (e) => {
        const removeButton = e.target.closest('.remove-package');
        if (removeButton) {
            removeButton.closest('.added-package').remove();
            calculateTotalPayment();
        }
    });
}

function addPackageListeners(packageList) {
    const select = packageList.querySelector('#package-select');
    const quantity = packageList.querySelector('#order-quantity');
    select.addEventListener('change', calculateTotalPayment);
    quantity.addEventListener('input', calculateTotalPayment);
}

function resetForm() {
    customerInput.value = '';
    customerId = null;
    packageSelect.selectedIndex = 0;
    orderQuantity.value = 1;
    shippingCost.value = '5000';
    currentCustomerOngkir = 5000;
    paymentMethod.value = 'belum_bayar';
    document.querySelector('#item-tambahan').value = '';
    document.querySelector('#harga-item-tambahan').value = '';
    document.querySelector('#harga-modal-item-tambahan').value = '';
    document.querySelector('#order-notes').value = '';
    document.querySelector('#kitchen-notes').value = '';
    document.querySelector('#courier-notes').value = '';
    selectedDates.clear();
    renderCalendar(displayedYear, displayedMonth);
    renderSelectedDates();
    document.querySelectorAll('.added-package').forEach(el => el.remove());
    calculateTotalPayment();
}

function validateFormData(formData) {
    if (!formData.customer_id || formData.customer_id <= 0) {
        throw new Error('Pelanggan tidak valid.');
    }
    if (!formData.order_data.total_harga || formData.order_data.total_harga < 0) {
        throw new Error('Total harga tidak valid.');
    }
    formData.order_details.forEach((detail, index) => {
        if (!detail.paket_id || detail.paket_id <= 0) {
            throw new Error(`Paket tidak valid pada detail ${index + 1}.`);
        }
        if (!detail.jumlah || detail.jumlah <= 0) {
            throw new Error(`Jumlah tidak valid pada detail ${index + 1}.`);
        }
    });
    formData.delivery_dates.forEach((date, index) => {
        if (!date.tanggal || !/^\d{4}-\d{2}-\d{2}$/.test(date.tanggal)) {
            throw new Error(`Tanggal tidak valid pada pengiriman ${index + 1}.`);
        }
        if (date.ongkir < 0) {
            throw new Error(`Ongkir tidak valid pada pengiriman ${index + 1}.`);
        }
    });
}

function collectOrderData() {
    const totals = calculateTotalPayment();
    const sortedDates = Array.from(selectedDates).sort((a, b) => new Date(a) - new Date(b));
    const deliveryDates = sortedDates.map(date => ({
        tanggal: date,
        kurir_id: parseInt(courierSelect.value) || null,
        ongkir: totals.shipping,
        status: 'pending',
        item_tambahan: document.getElementById('item-tambahan').value.trim(),
        harga_tambahan: parseFloat(document.querySelector('#harga-item-tambahan').value) || 0,
        harga_modal_tambahan: parseFloat(document.querySelector('#harga-modal-item-tambahan').value) || 0,
        total_harga_perhari: totals.totalPerDay,
        total_modal_perhari: totals.totalModalPerDay
    }));

    const orderDetails = [];
    const packages = Array.from(document.querySelectorAll('.package-list')).map(list => ({
        packageId: parseInt(list.querySelector('#package-select').value) || null,
        quantity: parseInt(list.querySelector('#order-quantity').value) || 1,
    }));
    sortedDates.forEach((date, index) => {
        packages.forEach(pkg => {
            const packageData = packagesData.find(p => p.id === pkg.packageId);
            orderDetails.push({
                delivery_index: index,
                paket_id: pkg.packageId,
                jumlah: pkg.quantity,
                subtotal_harga: packageData ? packageData.harga_jual * pkg.quantity : 0,
                catatan_dapur: document.getElementById('kitchen-notes').value.trim(),
                catatan_kurir: document.getElementById('courier-notes').value.trim()
            });
        });
    });

    return {
        customer_id: parseInt(customerId),
        order_data: {
            customer_id: parseInt(customerId),
            tanggal_pesan: format(new Date(), 'yyyy-MM-dd'),
            total_harga: totals.totalPayment,
            notes: document.getElementById('order-notes').value.trim(),
            metode_pembayaran: paymentMethod.value
        },
        delivery_dates: deliveryDates,
        order_details: orderDetails,
        new_ongkir: parseFloat(shippingCost.value) !== currentCustomerOngkir ? parseFloat(shippingCost.value) : undefined
    };
}

async function submitOrder(e) {
    e.preventDefault();
    try {
        if (selectedDates.size === 0) throw new Error('Pilih setidaknya satu tanggal.');
        if (!customerId) throw new Error('Pilih pelanggan terlebih dahulu.');
        const packages = Array.from(document.querySelectorAll('.package-list')).map(list => ({
            packageId: parseInt(list.querySelector('#package-select').value) || null,
            quantity: parseInt(list.querySelector('#order-quantity').value) || 1,
        }));
        if (packages.some(pkg => !pkg.packageId)) {
            throw new Error('Pilih setidaknya satu paket makanan.');
        }

        const formData = collectOrderData();
        validateFormData(formData);

        displayConfirmationModal(formData);
    } catch (error) {
        console.error('Submit order error:', error);
        showToast('Error', error.message, true);
    }
}

function displayConfirmationModal(order) {
    const modal = new bootstrap.Modal(document.getElementById('orderConfirmationModal'), { backdrop: 'static' });
    const customerName = customerInput.value;
    const customerAddress = customerInput.dataset.address || 'Alamat tidak tersedia';
    const courierName = courierSelect.querySelector(`option[value="${order.delivery_dates[0]?.kurir_id}"]`)?.textContent || 'Tidak ada kurir';
    const paymentMethodText = paymentMethod.querySelector(`option[value="${order.order_data.metode_pembayaran}"]`)?.textContent || order.order_data.metode_pembayaran;

    // Isi data pelanggan
    document.getElementById('confirmation-customer-name').textContent = customerName;
    document.getElementById('confirmation-customer-address').textContent = customerAddress;

    // Isi tanggal pesanan
    document.getElementById('confirmation-order-date').textContent = order.order_data.tanggal_pesan;

    // Isi tanggal pengiriman
    const deliveryDates = order.delivery_dates.map(d => format(parse(d.tanggal, 'yyyy-MM-dd', new Date()), 'EEE, d MMM', { locale: id }));
    const deliveryDatesContainer = document.getElementById('confirmation-delivery-dates');
    const moreDatesContainer = document.getElementById('confirmation-more-dates');
    deliveryDatesContainer.innerHTML = '';
    moreDatesContainer.innerHTML = '';
    deliveryDates.forEach((date, index) => {
        const badge = document.createElement('span');
        badge.classList.add('badge', 'badge-primary', 'badge-sm', 'text-body', 'me-1');
        badge.textContent = date;
        if (index < 4) {
            deliveryDatesContainer.appendChild(badge);
        } else {
            moreDatesContainer.appendChild(badge);
        }
    });
    if (deliveryDates.length > 4) {
        const moreButton = document.createElement('button');
        moreButton.type = 'button';
        moreButton.classList.add('badge', 'badge-secondary', 'border-muted', 'badge-sm');
        moreButton.setAttribute('data-bs-toggle', 'collapse');
        moreButton.setAttribute('data-bs-target', '#moreDates');
        moreButton.setAttribute('aria-expanded', 'false');
        moreButton.setAttribute('aria-controls', 'moreDates');
        moreButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-chevron-down" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                <polyline points="6 9 12 15 18 9" />
            </svg>
        `;
        deliveryDatesContainer.appendChild(moreButton);
    }

    // Isi detail pesanan
    const packageLists = document.querySelectorAll('.package-list');
    const packages = {};
    packageLists.forEach(list => {
        const packageId = list.querySelector('#package-select').value;
        const packageData = packagesData.find(p => p.id == packageId);
        const packageName = packageData ? packageData.nama : 'Unknown';
        const quantity = parseInt(list.querySelector('#order-quantity').value) || 0;
        const unitPrice = packageData ? packageData.harga_jual : 0;
        const subtotal = quantity * unitPrice;
        if (quantity > 0) {
            packages[packageName] = { quantity, subtotal, unitPrice };
        }
    });

    const orderDetailsContainer = document.getElementById('confirmation-order-details');
    orderDetailsContainer.innerHTML = '';
    Object.entries(packages).forEach(([name, data]) => {
        const row = document.createElement('div');
        row.classList.add('row', 'mb-2');
        row.innerHTML = `
            <div class="col-5">${name}</div>
            <div class="col-4">${data.quantity} x Rp ${data.unitPrice.toLocaleString('id-ID')}</div>
            <div class="col-3 text-end">Rp ${data.subtotal.toLocaleString('id-ID')}</div>
        `;
        orderDetailsContainer.appendChild(row);
    });
    if (order.delivery_dates[0]?.item_tambahan) {
        const additionalItemRow = document.createElement('div');
        additionalItemRow.classList.add('row', 'mb-2');
        additionalItemRow.innerHTML = `
            <div class="col-5">${order.delivery_dates[0].item_tambahan} (Item Tambahan)</div>
            <div class="col-4">1 x Rp ${order.delivery_dates[0].harga_tambahan.toLocaleString('id-ID')}</div>
            <div class="col-3 text-end">Rp ${order.delivery_dates[0].harga_tambahan.toLocaleString('id-ID')}</div>
        `;
        orderDetailsContainer.appendChild(additionalItemRow);
    }
    const shippingRow = document.createElement('div');
    shippingRow.classList.add('row', 'mb-2');
    shippingRow.innerHTML = `
        <div class="col-6">Ongkos Kirim</div>
        <div class="col-6 text-end">Rp ${order.delivery_dates[0]?.ongkir.toLocaleString('id-ID')}</div>
    `;
    orderDetailsContainer.appendChild(shippingRow);
    const totalPerDayRow = document.createElement('div');
    totalPerDayRow.classList.add('row', 'fw-bold', 'mb-2', 'pb-2', 'pt-2', 'border-top');
    totalPerDayRow.innerHTML = `
        <div class="col-6">Total (per hari)</div>
        <div class="col-6 text-end text-primary">Rp ${order.delivery_dates[0]?.total_harga_perhari.toLocaleString('id-ID')}</div>
    `;
    orderDetailsContainer.appendChild(totalPerDayRow);
    const totalRow = document.createElement('div');
    totalRow.classList.add('row', 'fw-bold', 'border-top', 'pt-2');
    totalRow.innerHTML = `
        <div class="col-6">Total (${order.delivery_dates.length} hari)</div>
        <div class="col-6 text-end text-primary">Rp ${order.order_data.total_harga.toLocaleString('id-ID')}</div>
    `;
    orderDetailsContainer.appendChild(totalRow);

    // Isi kurir dan metode pembayaran
    document.getElementById('confirmation-courier').textContent = courierName;
    document.getElementById('confirmation-payment-method').textContent = paymentMethodText;

    // Isi catatan (dinamis)
    const notesContainer = document.getElementById('confirmation-notes');
    notesContainer.innerHTML = '';
    const notes = [
        { title: 'Catatan Pelanggan', content: order.order_data.notes },
        { title: 'Catatan Dapur', content: order.order_details[0]?.catatan_dapur },
        { title: 'Catatan Kurir', content: order.order_details[0]?.catatan_kurir }
    ];
    notes.forEach(note => {
        if (note.content && note.content.trim() !== '') {
            const noteCard = document.createElement('div');
            noteCard.classList.add('col-md-4');
            noteCard.innerHTML = `
                <div class="card">
                    <div class="card-body p-2">
                        <h6 class="text-muted fw-bold mb-1">${note.title}</h6>
                        <p class="mb-0">${note.content}</p>
                    </div>
                </div>
            `;
            notesContainer.appendChild(noteCard);
        }
    });

    modal.show();

    // Event listener untuk tombol konfirmasi
    const confirmBtn = document.getElementById('confirmOrder');
    const handler = async () => {
        try {
            confirmBtn.classList.add('btn-loading');
            const response = await fetchWithRetry('/api/order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(order),
            });
            if (!response.success) {
                throw new Error(response.message);
            }

            // Tutup modal konfirmasi
            modal.hide();

            // Tutup modal add-order
            const addOrderModalElement = document.querySelector('#modal-add-order');
            if (addOrderModalElement) {
                const addOrderModalInstance = bootstrap.Modal.getInstance(addOrderModalElement) || new bootstrap.Modal(addOrderModalElement);
                addOrderModalInstance.hide();
                console.debug('Modal add-order hidden:', addOrderModalElement);
            } else {
                console.warn('Modal add-order element not found');
            }

            // Reset form dan tampilkan toast sukses
            resetForm();
            showToast('Sukses', 'Pesanan berhasil disimpan');
        } catch (error) {
            console.error('Confirm order error:', error);
            showToast('Error', 'Gagal menyimpan pesanan: ' + error.message, true);
            modal.hide();
        } finally {
            confirmBtn.classList.remove('btn-loading');
        }
    };
    confirmBtn.removeEventListener('click', handler); // Hapus listener lama
    confirmBtn.addEventListener('click', handler);
}

function displaySummaryModal(order, orderId) {
    const modal = new bootstrap.Modal(document.getElementById('successModal'), { backdrop: 'static' });
    document.getElementById('success-total').textContent = `Rp ${order.order_data.total_harga.toLocaleString('id-ID')}`;
    modal.show();
}

async function fetchWithRetry(url, options = {}, isExternal = false, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const headers = isExternal ? { ...(options.headers || {}) } : {
                ...(options.headers || {}),
                'X-Requested-With': 'XMLHttpRequest',
            };
            const response = await fetch(url, { ...options, headers });
            if (!response.ok) throw new Error(`HTTP error ${response.status}`);
            return await response.json();
        } catch (error) {
            if (i === retries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
    }
}

function showErrorNotification(message) {
    errorNotification.textContent = message;
    errorNotification.classList.remove('d-none');
    setTimeout(() => errorNotification.classList.add('d-none'), 5000);
}

function setupEventListeners() {
    prevMonthBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        displayedMonth--;
        if (displayedMonth < 0) {
            displayedMonth = 11;
            displayedYear--;
            cachedHolidays = [];
            try {
                cachedHolidays = await fetchHolidayDates(displayedYear);
            } catch (error) {
                cachedHolidays = [];
            }
        }
        await renderCalendar(displayedYear, displayedMonth);
    });

    nextMonthBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        displayedMonth++;
        if (displayedMonth > 11) {
            displayedMonth = 0;
            displayedYear++;
            cachedHolidays = [];
            try {
                cachedHolidays = await fetchHolidayDates(displayedYear);
            } catch (error) {
                cachedHolidays = [];
            }
        }
        await renderCalendar(displayedYear, displayedMonth);
    });

    todayBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const today = new Date();
        displayedYear = today.getFullYear();
        displayedMonth = today.getMonth();
        await renderCalendar(displayedYear, displayedMonth);
    });

    nextMonthButton.addEventListener('click', async (e) => {
        e.preventDefault();
        const nextMonth = addMonths(new Date(), 1);
        if (displayedMonth === nextMonth.getMonth()) return;

        displayedYear = nextMonth.getFullYear();
        displayedMonth = nextMonth.getMonth();
        if (cachedHolidays.length === 0 || !cachedHolidays[0].date.startsWith(displayedYear.toString())) {
            cachedHolidays = [];
            try {
                cachedHolidays = await fetchHolidayDates(displayedYear);
            } catch (error) {
                cachedHolidays = [];
            }
        }
        await renderCalendar(displayedYear, displayedMonth);
    });

    clearButton.addEventListener('click', async (e) => {
        e.preventDefault();
        selectedDates.clear();
        await renderCalendar(displayedYear, displayedMonth);
        renderSelectedDates();
        calculateTotalPayment();
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
    });

    packageSelect.addEventListener('change', calculateTotalPayment);
    orderQuantity.addEventListener('input', calculateTotalPayment);
    shippingCost.addEventListener('input', () => {
        calculateTotalPayment();
        shippingFastIcon.classList.toggle('d-none', parseFloat(shippingCost.value) !== currentCustomerOngkir);
    });
    document.querySelector('#harga-item-tambahan').addEventListener('input', calculateTotalPayment);
    document.querySelector('#harga-modal-item-tambahan').addEventListener('input', calculateTotalPayment);
    orderForm.addEventListener('submit', submitOrder);

    const notesToggles = document.querySelectorAll('.form-selectgroup-input[data-bs-toggle="collapse"]');
    notesToggles.forEach(toggle => {
        toggle.addEventListener('change', () => {
            notesToggles.forEach(otherToggle => {
                if (otherToggle !== toggle) {
                    const otherCollapseId = otherToggle.getAttribute('data-bs-target');
                    const otherCollapse = document.querySelector(otherCollapseId);
                    if (otherCollapse.classList.contains('show')) {
                        new bootstrap.Collapse(otherCollapse, { toggle: false }).hide();
                        otherToggle.checked = false;
                        otherToggle.setAttribute('aria-expanded', 'false');
                    }
                }
            });
            const collapseId = toggle.getAttribute('data-bs-target');
            const collapse = document.querySelector(collapseId);
            toggle.setAttribute('aria-expanded', collapse.classList.contains('show') ? 'true' : 'false');
        });
    });

    const noteCollapses = document.querySelectorAll('#order-notes-collapse, #kitchen-notes-collapse, #courier-notes-collapse');
    noteCollapses.forEach(collapse => {
        collapse.addEventListener('show.bs.collapse', () => {
            const toggle = document.querySelector(`.form-selectgroup-input[data-bs-target="#${collapse.id}"]`);
            if (toggle) {
                toggle.checked = true;
                toggle.setAttribute('aria-expanded', 'true');
            }
        });
        collapse.addEventListener('hide.bs.collapse', () => {
            const toggle = document.querySelector(`.form-selectgroup-input[data-bs-target="#${collapse.id}"]`);
            if (toggle) {
                toggle.checked = false;
                toggle.setAttribute('aria-expanded', 'false');
            }
        });
    });
}

export { initialize, setupEventListeners, fetchHolidayDates, renderCalendar, fetchCustomers, fetchPackages, calculateTotalPayment, setupAddRemovePackageHandlers };