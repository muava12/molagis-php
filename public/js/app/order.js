// order.js
import {
    format,
    startOfMonth,
    endOfMonth,
    getDaysInMonth,
    subMonths,
    addMonths,
    addDays,
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
        // Show loading state
        showLoadingState();

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

        // Setup form validation
        setupFormValidation();

        // Setup quick date actions
        setupQuickDateActions();

        // Setup mobile enhancements
        setupMobileEnhancements();

        // Hide loading state
        hideLoadingState();

        // Update progress
        updateFormProgress();

    } catch (error) {
        console.error('Initialization error:', error);
        showToast('Error', 'Gagal memuat data awal: ' + error.message, 'error');
        hideLoadingState();
    }
}

async function initializeCalendar() {
    try {
        await renderCalendar(displayedYear, displayedMonth);
    } catch (error) {
        console.error('Failed to initialize calendar:', error);
        showToast('Error', 'Gagal memuat kalender', 'error');
    }
}

async function renderCalendar(year, month) {
    try {
        if (!calendarDays) {
            console.error('calendar-days element not found');
            showToast('Error', 'Elemen kalender tidak ditemukan', 'error');
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
        showToast('Error', 'Gagal merender kalender: ' + error.message, 'error');
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

    // Enhanced event handling for both touch and mouse
    let touchStarted = false;
    let touchMoved = false;
    let clickHandled = false;
    let touchStartTime = 0;

    // Touch events for mobile devices
    dayElement.addEventListener('touchstart', (e) => {
        e.preventDefault(); // Prevent scrolling and zooming
        touchStarted = true;
        touchMoved = false;
        clickHandled = false;
        touchStartTime = Date.now();
        isDragging = true;

        // Only toggle on touchstart for immediate feedback
        toggleDate(dayElement);
        clickHandled = true;

        // Add haptic feedback if supported
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
    }, { passive: false });

    dayElement.addEventListener('touchmove', (e) => {
        if (!touchStarted) return;
        touchMoved = true;

        // Handle drag selection on touch devices
        const touch = e.touches[0];
        const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
        if (elementBelow && elementBelow.classList.contains('date-picker-day') && !elementBelow.classList.contains('disabled')) {
            if (isDragging) toggleDate(elementBelow);
        }
    }, { passive: false });

    dayElement.addEventListener('touchend', (e) => {
        e.preventDefault();

        // Reset touch state after a short delay to prevent click interference
        setTimeout(() => {
            touchStarted = false;
            touchMoved = false;
            isDragging = false;
            clickHandled = false;
        }, 100);
    }, { passive: false });

    // Mouse events for desktop and hybrid devices
    dayElement.addEventListener('mousedown', (e) => {
        // Skip if touch event was recently handled
        if (touchStarted || (Date.now() - touchStartTime < 500)) return;

        e.preventDefault();
        isDragging = true;
        toggleDate(dayElement);
        clickHandled = true;
    });

    dayElement.addEventListener('mouseover', () => {
        // Skip if touch event was recently handled
        if (touchStarted || (Date.now() - touchStartTime < 500)) return;

        if (isDragging) toggleDate(dayElement);
    });

    dayElement.addEventListener('mouseup', () => {
        // Skip if touch event was recently handled
        if (touchStarted || (Date.now() - touchStartTime < 500)) return;

        isDragging = false;
    });

    // Click event as fallback for devices that don't support mousedown/touchstart properly
    dayElement.addEventListener('click', (e) => {
        // Skip if already handled by touch or mouse events
        if (clickHandled || touchStarted || touchMoved) return;

        // Skip if touch event was recently handled
        if (Date.now() - touchStartTime < 500) return;

        // Handle the click
        toggleDate(dayElement);
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
        // closeButton.classList.add('badge-close-btn');
        closeButton.classList.add('btn-close', 'btn-close-sm', 'ms-1');
        closeButton.innerHTML = `
            <svg  xmlns="http://www.w3.org/2000/svg"  width="20"  height="20"  viewBox="0 0 24 24"  fill="none"  stroke="currentColor"  stroke-width="1.5"  stroke-linecap="round"  stroke-linejoin="round"  class="icon icon-tabler icons-tabler-outline icon-tabler-x"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M18 6l-12 12" /><path d="M6 6l12 12" /></svg>
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
        showToast('Error', 'Gagal memuat data hari libur. Pastikan koneksi internet stabil.', 'error');
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
        showToast('Error', 'Gagal memuat daftar pelanggan: ' + error.message, 'error');
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
        awesomplete.close(); // Close the dropdown after selection
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
        showToast('Error', 'Gagal memuat daftar paket makanan', 'error');
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
    // Only include additional costs if they have valid values
    const additionalItemsValue = document.querySelector('#harga-item-tambahan').value.trim();
    const additionalItemsCost = additionalItemsValue ? (parseFloat(additionalItemsValue) || 0) : 0;

    const additionalModalValue = document.querySelector('#harga-modal-item-tambahan').value.trim();
    const additionalModalCost = additionalModalValue ? (parseFloat(additionalModalValue) || 0) : 0;
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
            showToast('Error', 'Maksimum 5 paket dapat ditambahkan.', 'error');
            return;
        }
        const newList = document.createElement('div');
        newList.classList.add('row', 'g-2', 'mb-3', 'package-list', 'added-package');
        const newPackage = packageTemplate.cloneNode(true);
        const newQuantity = quantityTemplate.cloneNode(true);
        const newButton = document.createElement('div');
        newButton.classList.add('col-2');
        newButton.innerHTML = `<label class="form-label">&nbsp;</label><button type="button" class="btn btn-icon remove-package w-100" aria-label="Hapus paket">
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
        item_tambahan: (() => {
            const value = document.getElementById('item-tambahan').value.trim();
            return value ? value : null;
        })(),
        harga_tambahan: (() => {
            const value = document.querySelector('#harga-item-tambahan').value.trim();
            return value ? (parseFloat(value) || null) : null;
        })(),
        harga_modal_tambahan: (() => {
            const value = document.querySelector('#harga-modal-item-tambahan').value.trim();
            return value ? (parseFloat(value) || null) : null;
        })(),
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
                subtotal_harga: packageData ? packageData.harga_jual * pkg.quantity : 0
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
            catatan_dapur: document.getElementById('kitchen-notes').value.trim(),
            catatan_kurir: document.getElementById('courier-notes').value.trim(),
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
        showToast('Error', error.message, 'error');
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
        { title: 'Catatan Dapur', content: order.order_data.catatan_dapur },
        { title: 'Catatan Kurir', content: order.order_data.catatan_kurir }
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
    // Clone the button to remove existing event listeners
    const old_element = document.getElementById("confirmOrder");
    const new_element = old_element.cloneNode(true);
    old_element.parentNode.replaceChild(new_element, old_element);
    const confirmBtn = new_element; // Use this new_element for adding the event listener.

    const handler = async () => {
        try {
            confirmBtn.classList.add('btn-loading','disabled');
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
            showToast('Sukses', 'Pesanan berhasil disimpan'); // Default type 'success'
        } catch (error) {
            console.error('Confirm order error:', error);
            showToast('Error', 'Gagal menyimpan pesanan: ' + error.message, 'error');
            modal.hide();
        } finally {
            confirmBtn.classList.remove('btn-loading','disabled');
        }
    };
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

    // Handle mouse up for all devices
    document.addEventListener('mouseup', () => {
        isDragging = false;
    });

    // Handle touch end for mobile devices (already handled in setupMobileEventHandlers)
    // This ensures proper cleanup of dragging state

    packageSelect.addEventListener('change', calculateTotalPayment);
    orderQuantity.addEventListener('input', calculateTotalPayment);
    shippingCost.addEventListener('input', () => {
        calculateTotalPayment();
        shippingFastIcon.classList.toggle('d-none', parseFloat(shippingCost.value) !== currentCustomerOngkir);
    });
    document.querySelector('#harga-item-tambahan').addEventListener('input', calculateTotalPayment);
    document.querySelector('#harga-modal-item-tambahan').addEventListener('input', calculateTotalPayment);
    orderForm.removeEventListener('submit', submitOrder);
    orderForm.addEventListener('submit', submitOrder);

    // Handle autosize for textareas within tabs
    const noteTabs = document.querySelectorAll('#order-form .nav-segmented .nav-link[data-bs-toggle="tab"]');
    noteTabs.forEach(tab => {
        tab.addEventListener('shown.bs.tab', event => {
            const targetPaneId = event.target.getAttribute('data-bs-target');
            if (targetPaneId) {
                const targetPane = document.querySelector(targetPaneId);
                if (targetPane) {
                    const textarea = targetPane.querySelector('textarea');
                    if (textarea) {
                        autosize.update(textarea);
                    }
                }
            }
        });
    });

    // Prevent default for button-based tabs, Bootstrap still handles switching
    noteTabs.forEach(tabButton => {
        tabButton.addEventListener('click', function(event) {
            event.preventDefault();
        });
    });
}

// Loading States - Only apply on standalone input-order page
function showLoadingState() {
    // Only apply loading state if we're on the standalone input-order page
    if (!document.querySelector('.input-order-container')) return;

    const formElements = document.querySelectorAll('#order-form input, #order-form select');
    formElements.forEach(el => {
        if (!el.classList.contains('loading')) {
            // Store original values to restore later
            el.dataset.originalValue = el.value;
            el.dataset.originalPlaceholder = el.placeholder;

            el.classList.add('loading');
            el.disabled = true;

            // Clear value and placeholder to prevent white flash
            if (el.tagName === 'INPUT') {
                el.value = '';
                el.placeholder = '';
            }
        }
    });

    const datePickerContainer = document.querySelector('.date-picker-container');
    if (datePickerContainer) {
        datePickerContainer.classList.add('loading');
    }
}

function hideLoadingState() {
    // Only apply on standalone input-order page
    if (!document.querySelector('.input-order-container')) return;

    const formElements = document.querySelectorAll('#order-form input, #order-form select');
    formElements.forEach(el => {
        el.classList.remove('loading');
        el.disabled = false;

        // Restore original values
        if (el.dataset.originalValue !== undefined) {
            el.value = el.dataset.originalValue;
            delete el.dataset.originalValue;
        }
        if (el.dataset.originalPlaceholder !== undefined) {
            el.placeholder = el.dataset.originalPlaceholder;
            delete el.dataset.originalPlaceholder;
        }
    });

    const datePickerContainer = document.querySelector('.date-picker-container');
    if (datePickerContainer) {
        datePickerContainer.classList.remove('loading');
    }
}

// Form Progress
function updateFormProgress() {
    const progressBar = document.getElementById('form-progress-bar');
    if (!progressBar) return;

    const requiredFields = document.querySelectorAll('#order-form [required]');
    const filledFields = Array.from(requiredFields).filter(field => {
        if (field.type === 'text' || field.type === 'number') {
            return field.value.trim() !== '';
        }
        if (field.tagName === 'SELECT') {
            return field.value !== '';
        }
        return false;
    });

    const selectedDatesCount = selectedDates.size;
    const totalSteps = requiredFields.length + (selectedDatesCount > 0 ? 1 : 0);
    const completedSteps = filledFields.length + (selectedDatesCount > 0 ? 1 : 0);

    const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
    progressBar.style.width = `${Math.min(progress, 100)}%`;
}

// Form Validation
function setupFormValidation() {
    const customerInput = document.getElementById('customer-input');
    const packageSelect = document.getElementById('package-select');
    const orderQuantity = document.getElementById('order-quantity');

    if (customerInput) {
        customerInput.addEventListener('input', validateCustomerInput);
        customerInput.addEventListener('blur', validateCustomerInput);
    }

    if (packageSelect) {
        packageSelect.addEventListener('change', validatePackageSelect);
    }

    if (orderQuantity) {
        orderQuantity.addEventListener('input', validateOrderQuantity);
        orderQuantity.addEventListener('blur', validateOrderQuantity);
    }

    // Add event listeners to update progress
    const allInputs = document.querySelectorAll('#order-form input, #order-form select');
    allInputs.forEach(input => {
        input.addEventListener('input', updateFormProgress);
        input.addEventListener('change', updateFormProgress);
    });
}

function validateCustomerInput() {
    const input = document.getElementById('customer-input');
    const feedback = document.getElementById('customer-input-feedback');

    if (!input || !feedback) return;

    if (input.value.trim().length < 2) {
        input.classList.add('is-invalid');
        input.classList.remove('is-valid');
        feedback.textContent = 'Nama pelanggan minimal 2 karakter';
    } else {
        input.classList.remove('is-invalid');
        input.classList.add('is-valid');
        feedback.textContent = '';
    }
}

function validatePackageSelect() {
    const select = document.getElementById('package-select');
    const feedback = document.getElementById('package-select-feedback');

    if (!select || !feedback) return;

    if (select.value === '') {
        select.classList.add('is-invalid');
        select.classList.remove('is-valid');
        feedback.textContent = 'Pilih paket makanan';
    } else {
        select.classList.remove('is-invalid');
        select.classList.add('is-valid');
        feedback.textContent = '';
    }
}

function validateOrderQuantity() {
    const input = document.getElementById('order-quantity');
    const feedback = document.getElementById('order-quantity-feedback');

    if (!input || !feedback) return;

    const value = parseInt(input.value);
    if (isNaN(value) || value < 1) {
        input.classList.add('is-invalid');
        input.classList.remove('is-valid');
        feedback.textContent = 'Jumlah minimal 1';
    } else {
        input.classList.remove('is-invalid');
        input.classList.add('is-valid');
        feedback.textContent = '';
    }
}



// Quick Date Actions
function setupQuickDateActions() {
    const next7DaysBtn = document.getElementById('next-7-days-btn');
    const next14DaysBtn = document.getElementById('next-14-days-btn');

    if (next7DaysBtn) {
        next7DaysBtn.addEventListener('click', async () => await selectNext7Days());
    }

    if (next14DaysBtn) {
        next14DaysBtn.addEventListener('click', async () => await selectNext14Days());
    }
}

async function selectNext7Days() {
    selectedDates.clear();
    const today = new Date();

    for (let i = 1; i <= 7; i++) {
        const date = addDays(today, i);
        const dateStr = format(date, 'yyyy-MM-dd');

        // Skip holidays and Sundays
        if (!isHoliday(date) && getDay(date) !== 0) {
            selectedDates.add(dateStr);
        }
    }

    await updateSelectedDatesDisplay();
    updateFormProgress();
    showToast('Info', '7 hari ke depan dipilih (kecuali hari libur)', 'info');
}



async function selectNext14Days() {
    selectedDates.clear();
    const today = new Date();

    for (let i = 1; i <= 14; i++) {
        const date = addDays(today, i);
        const dateStr = format(date, 'yyyy-MM-dd');

        // Skip holidays and Sundays
        if (!isHoliday(date) && getDay(date) !== 0) {
            selectedDates.add(dateStr);
        }
    }

    await updateSelectedDatesDisplay();
    updateFormProgress();
    showToast('Info', '14 hari ke depan dipilih (kecuali hari libur)', 'info');
}

function isHoliday(date) {
    const dateStr = format(date, 'yyyy-MM-dd');
    return cachedHolidays.includes(dateStr);
}

// Update selected dates display with animation
async function updateSelectedDatesDisplay() {
    renderSelectedDates();
    await renderCalendar(displayedYear, displayedMonth);
    calculateTotalPayment();
}

// Mobile Enhancements
function setupMobileEnhancements() {
    // Only apply to standalone input-order page
    if (!document.querySelector('.input-order-container')) return;

    // Improve touch interactions
    improveTouchInteractions();

    // Setup mobile-specific event handlers
    setupMobileEventHandlers();
}

function setupMobileEventHandlers() {
    // Improve global touch handling for mobile devices
    if ('ontouchstart' in window) {
        // Handle global touch end to reset dragging state
        document.addEventListener('touchend', () => {
            isDragging = false;
        }, { passive: true });

        // Prevent default touch behaviors that might interfere
        document.addEventListener('touchmove', (e) => {
            // Only prevent default if we're dragging in the date picker
            if (isDragging && e.target.closest('.date-picker-container')) {
                e.preventDefault();
            }
        }, { passive: false });

        // Improve viewport handling on mobile
        const viewport = document.querySelector('meta[name="viewport"]');
        if (viewport) {
            viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
        }

        // Handle orientation changes
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                // Recalculate layout after orientation change
                const datePickerContainer = document.querySelector('.date-picker-container');
                if (datePickerContainer) {
                    datePickerContainer.style.maxWidth = '100%';
                }

                // Update form progress
                updateFormProgress();
            }, 100);
        });
    }

    // Improve select dropdown behavior on mobile
    const selects = document.querySelectorAll('select');
    selects.forEach(select => {
        // Add mobile-friendly change handler
        select.addEventListener('change', (e) => {
            // Trigger haptic feedback if available
            if (navigator.vibrate) {
                navigator.vibrate(30);
            }

            // Ensure proper focus handling
            e.target.blur();
        });
    });
}



function improveTouchInteractions() {
    // Improve form select interactions on mobile
    const selects = document.querySelectorAll('#order-form select');
    selects.forEach(select => {
        // Ensure proper mobile select behavior
        select.addEventListener('touchstart', (e) => {
            // Allow native select behavior on mobile
            e.stopPropagation();
        }, { passive: true });

        // Add visual feedback for touch
        select.addEventListener('touchstart', () => {
            select.style.transform = 'scale(0.98)';
        }, { passive: true });

        select.addEventListener('touchend', () => {
            setTimeout(() => {
                select.style.transform = '';
            }, 150);
        }, { passive: true });
    });

    // Improve button touch interactions
    const buttons = document.querySelectorAll('#order-form button, .date-picker-buttons button');
    buttons.forEach(button => {
        button.addEventListener('touchstart', () => {
            button.style.transform = 'scale(0.95)';
            button.style.opacity = '0.8';
        }, { passive: true });

        button.addEventListener('touchend', () => {
            setTimeout(() => {
                button.style.transform = '';
                button.style.opacity = '';
            }, 150);
        }, { passive: true });
    });

    // Improve input field interactions on mobile
    const inputs = document.querySelectorAll('#order-form input[type="text"], #order-form input[type="number"]');
    inputs.forEach(input => {
        // Prevent zoom on focus for number inputs
        if (input.type === 'number') {
            input.addEventListener('focus', () => {
                input.setAttribute('inputmode', 'numeric');
            });
        }

        // Add visual feedback
        input.addEventListener('touchstart', () => {
            input.style.borderColor = 'var(--tblr-primary)';
        }, { passive: true });

        input.addEventListener('blur', () => {
            if (!input.matches(':focus')) {
                input.style.borderColor = '';
            }
        });
    });

    // Improve textarea interactions
    const textareas = document.querySelectorAll('#order-form textarea');
    textareas.forEach(textarea => {
        textarea.addEventListener('touchstart', () => {
            textarea.style.borderColor = 'var(--tblr-primary)';
        }, { passive: true });

        textarea.addEventListener('blur', () => {
            if (!textarea.matches(':focus')) {
                textarea.style.borderColor = '';
            }
        });
    });

    // Prevent accidental form submission on mobile
    const form = document.getElementById('order-form');
    if (form) {
        form.addEventListener('touchmove', (e) => {
            // Allow scrolling within form
            e.stopPropagation();
        }, { passive: true });
    }

    // Improve modal interactions on mobile
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.addEventListener('touchstart', (e) => {
            // Prevent background scroll when modal is open
            if (e.target === modal) {
                e.preventDefault();
            }
        }, { passive: false });
    });
}

// Helper function for formatting currency
function formatRupiah(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
}

export { initialize, setupEventListeners, fetchHolidayDates, renderCalendar, fetchCustomers, fetchPackages, calculateTotalPayment, setupAddRemovePackageHandlers, resetForm };