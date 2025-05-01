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

async function initialize() {
    try {
        cachedHolidays = await fetchHolidayDates(new Date().getFullYear());
        await Promise.all([
            initializeCalendar(),
            fetchCustomers(),
            fetchPackages(),
        ]);
        setupEventListeners();
        setupAddRemovePackageHandlers();
        addPackageListeners(document.querySelector('.package-list'));
    } catch (error) {
        console.error('Initialization error:', error);
        showErrorToast('Gagal memuat data awal: ' + error.message);
    }
}

async function initializeCalendar() {
    try {
        await renderCalendar(new Date().getFullYear(), new Date().getMonth());
    } catch (error) {
        console.error('Failed to initialize calendar:', error);
        showErrorToast('Gagal memuat kalender');
    }
}

async function renderCalendar(year, month) {
    const displayedMonth = new Date(year, month, 1);
    calendarMonthYear.textContent = format(displayedMonth, 'MMMM yyyy', { locale: id });

    const firstDayOfMonth = startOfMonth(displayedMonth);
    const lastDayOfMonth = endOfMonth(displayedMonth);
    const firstDayIndex = (firstDayOfMonth.getDay() + 6) % 7; // Adjust to start week on Monday
    const daysInMonth = getDaysInMonth(displayedMonth);
    const prevMonthDays = firstDayIndex;
    const lastDayOfPrevMonth = endOfMonth(subMonths(displayedMonth, 1));
    const prevMonthDaysCount = lastDayOfPrevMonth.getDate();

    calendarDays.innerHTML = '';

    let dayCounter = 0;
    // Render days from previous month
    for (let i = prevMonthDays - 1; i >= 0; i--) {
        const day = prevMonthDaysCount - i;
        const date = new Date(year, month - 1, day);
        const fullDate = format(date, 'yyyy-MM-dd');
        const dayElement = createDayElement(date, fullDate, 'text-muted', dayCounter++);
        calendarDays.appendChild(dayElement);
    }

    // Render days from current month
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const fullDate = format(date, 'yyyy-MM-dd');
        const dayElement = createDayElement(date, fullDate, 'text-body', dayCounter++);
        if (isSameDay(date, new Date())) {
            dayElement.classList.add('today');
        }
        calendarDays.appendChild(dayElement);
    }

    // Render days from next month
    const totalDaysRendered = prevMonthDays + daysInMonth;
    const remainingDays = (7 - (totalDaysRendered % 7)) % 7;
    for (let day = 1; day <= remainingDays; day++) {
        const date = new Date(year, month + 1, day);
        const fullDate = format(date, 'yyyy-MM-dd');
        const dayElement = createDayElement(date, fullDate, 'text-muted', dayCounter++);
        calendarDays.appendChild(dayElement);
    }

    renderSelectedDates();
}

async function fetchHolidayDates(year) {
    try {
        if (cachedHolidays.length > 0) return cachedHolidays;
        const response = await fetch(`https://dayoffapi.vercel.app/api?year=${year}`);
        if (!response.ok) throw new Error('Gagal mengambil data hari libur');
        const holidays = await response.json();
        return holidays
            .filter(h => h.is_cuti === false)
            .map(h => ({ date: h.tanggal, name: h.keterangan }));
    } catch (error) {
        console.error('Failed to fetch holidays:', error);
        return [];
    }
}

function createDayElement(date, fullDate, textClass, index) {
    const dayElement = document.createElement('div');
    dayElement.classList.add('date-picker-day', textClass);
    dayElement.textContent = date.getDate();
    dayElement.dataset.date = fullDate;
    dayElement.dataset.index = index;

    const isSunday = getDay(date) === 0;
    const holiday = cachedHolidays.find(h => h.date === fullDate);
    if (isSunday) {
        dayElement.classList.add('disabled', 'text-muted');
    } else if (holiday) {
        dayElement.classList.add('holiday');
        dayElement.setAttribute('data-tooltip', holiday.name);
    }

    if (selectedDates.has(fullDate)) {
        dayElement.classList.add('selected');
        if (textClass === 'text-body') {
            dayElement.classList.remove('text-body');
        }
    }

    addDayEventListeners(dayElement, date);
    return dayElement;
}

function addDayEventListeners(dayElement, date) {
    const isSunday = getDay(date) === 0;
    if (isSunday) {
        return;
    }

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

    dayElement.addEventListener('mousedown', () => {
        isDragging = true;
        toggleDate(dayElement);
    });

    dayElement.addEventListener('mouseover', () => {
        if (isDragging) {
            toggleDate(dayElement);
        }
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

async function fetchCustomers() {
    try {
        const response = await fetch('/api/customers', {
            headers: { 'X-Requested-With': 'XMLHttpRequest' },
        });
        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
        }
        const customers = await response.json();
        console.log('Fetched customers:', customers);
        if (!Array.isArray(customers)) {
            throw new Error('Response is not an array');
        }
        displayCustomerSuggestions(customers);
    } catch (error) {
        console.error('Failed to fetch customers:', error);
        showErrorToast('Gagal memuat daftar pelanggan: ' + error.message);
    }
}

function displayCustomerSuggestions(customers) {
    const customerData = customers.map(customer => ({
        label: customer.nama,
        value: customer.id,
        ongkir: customer.ongkir
    }));
    console.log('Customer data for Awesomplete:', customerData);
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
            return li;
        }
    });
    customerInput.addEventListener('awesomplete-selectcomplete', (e) => {
        console.log('Selected customer:', e.text);
        const selectedCustomer = customerData.find(customer => customer.value === e.text.value);
        customerId = e.text.value;
        customerInput.value = e.text.label;
        currentCustomerOngkir = selectedCustomer ? parseFloat(selectedCustomer.ongkir) || 5000 : 5000;
        console.log('Selected customer (processed):', e.text.label, 'ID:', e.text.value, 'Ongkir:', currentCustomerOngkir);
        shippingCost.value = currentCustomerOngkir;
        shippingFastIcon.classList.toggle('d-none', parseFloat(shippingCost.value) !== currentCustomerOngkir);
        calculateTotalPayment();
    });
}

async function fetchPackages() {
    try {
        const response = await fetch('/api/packages', {
            headers: { 'X-Requested-With': 'XMLHttpRequest' },
        });
        if (!response.ok) throw new Error('Gagal mengambil daftar paket');
        packagesData = await response.json();
        if (!Array.isArray(packagesData)) {
            throw new Error('Package response is not an array');
        }
        if (packageSelect.options.length <= 1) {
            packageSelect.innerHTML = '<option value="" disabled selected>Pilih Paket Makanan</option>' +
                packagesData.map(p => `<option value="${p.id}">${p.nama} (Rp ${p.harga_jual.toLocaleString('id-ID')})</option>`).join('');
        }
    } catch (error) {
        console.error('Failed to fetch packages:', error);
        showErrorToast('Gagal memuat daftar paket makanan');
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
        totalPackageCost += packagePrice * orderQty;
        totalModalCost += packageModal * orderQty;
    });
    const additionalItemsCost = parseFloat(document.querySelector('.harga-item-tambahan').value) || 0;
    const additionalModalCost = parseFloat(document.querySelector('.harga-modal-item-tambahan').value) || 0;
    const shipping = parseFloat(shippingCost.value) || currentCustomerOngkir;
    const totalPerDayValue = totalPackageCost + additionalItemsCost;
    const totalModalPerDayValue = totalModalCost + additionalModalCost;
    const totalPaymentValue = (totalPerDayValue + shipping) * selectedDates.size;

    return {
        totalPerDay: totalPerDayValue,
        totalModalPerDay: totalModalPerDayValue,
        totalPayment: totalPaymentValue,
        shipping: shipping
    };
}

function setupAddRemovePackageHandlers() {
    const packageList = document.querySelector('.package-list');
    const packageTemplate = document.querySelector('.input-paket');
    const quantityTemplate = document.querySelector('.input-jumlah');

    addPackageBtn.addEventListener('click', () => {
        const newList = document.createElement('div');
        newList.classList.add('d-flex', 'package-list', 'mb-3', 'added-package');
        const newPackage = packageTemplate.cloneNode(true);
        const newQuantity = quantityTemplate.cloneNode(true);
        const newButton = document.createElement('div');
        newButton.classList.add('tambah-paket', 'ms-2');
        newButton.innerHTML = '<button type="button" class="btn btn-danger w-100 remove-package mt-4">-</button>';
        newPackage.querySelector('#package-select').selectedIndex = 0;
        newQuantity.querySelector('#order-quantity').value = 1;
        newList.append(newPackage, newQuantity, newButton);
        packageList.insertAdjacentElement('afterend', newList);
        addPackageListeners(newList);
        calculateTotalPayment();
    });

    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-package')) {
            e.target.closest('.added-package').remove();
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
    document.querySelector('.harga-item-tambahan').value = '';
    document.querySelector('.harga-modal-item-tambahan').value = '';
    document.querySelector('#order-notes').value = '';
    document.querySelector('#kitchen-notes').value = '';
    document.querySelector('#courier-notes').value = '';
    selectedDates.clear();
    renderCalendar(displayedYear, displayedMonth);
    renderSelectedDates();
    document.querySelectorAll('.added-package').forEach(el => el.remove());
    calculateTotalPayment();
}

async function submitOrder(e) {
    e.preventDefault();
    errorNotification.classList.add('d-none');

    if (selectedDates.size === 0) {
        showErrorNotification('Pilih setidaknya satu tanggal.');
        return;
    }
    if (!customerId) {
        showErrorNotification('Pilih pelanggan terlebih dahulu.');
        return;
    }
    const packageLists = document.querySelectorAll('.package-list');
    const packages = Array.from(packageLists).map(list => ({
        packageId: parseInt(list.querySelector('#package-select').value) || null,
        quantity: parseInt(list.querySelector('#order-quantity').value) || 1,
    }));
    if (packages.length === 0 || packages.some(pkg => !pkg.packageId)) {
        showErrorNotification('Pilih setidaknya satu paket makanan.');
        return;
    }

    const totals = calculateTotalPayment();
    const sortedDates = Array.from(selectedDates).sort((a, b) => new Date(a) - new Date(b));
    const deliveryDates = sortedDates.map(date => ({
        tanggal: date,
        kurir_id: parseInt(courierSelect.value) || null,
        ongkir: totals.shipping,
        status: 'pending',
        item_tambahan: document.getElementById('item-tambahan').value.trim(),
        harga_tambahan: parseFloat(document.querySelector('.harga-item-tambahan').value) || 0,
        harga_modal_tambahan: parseFloat(document.querySelector('.harga-modal-item-tambahan').value) || null,
        total_harga_perhari: totals.totalPerDay,
        total_modal_perhari: totals.totalModalPerDay
    }));

    const orderDetails = [];
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

    const formData = {
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

    try {
        const response = await fetch('/api/order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify(formData),
        });
        const result = await response.json();
        if (!result.success) {
            throw new Error(result.message);
        }
        displaySummaryModal(formData, result.order_id);
        resetForm();
        showSuccessToast('Pesanan berhasil disimpan');
    } catch (error) {
        console.error('Submit order error:', error);
        showErrorNotification('Gagal menyimpan pesanan: ' + error.message);
    }
}

function displaySummaryModal(order, orderId) {
    const modal = new bootstrap.Modal(document.getElementById('order-summary-modal'));
    const content = document.getElementById('order-summary-content');
    const customerName = customerInput.value;
    const courierName = courierSelect.querySelector(`option[value="${order.order_data.kurir_id}"]`)?.textContent || 'Tidak ada kurir';
    const packages = order.order_details.reduce((acc, detail) => {
        const packageData = packagesData.find(p => p.id === detail.paket_id);
        const packageName = packageData ? packageData.nama : 'Unknown';
        acc[packageName] = (acc[packageName] || 0) + detail.jumlah;
        return acc;
    }, {});

    content.innerHTML = `
        <p><strong>ID Pesanan:</strong> ${orderId}</p>
        <p><strong>Nama Pelanggan:</strong> ${customerName}</p>
        <p><strong>Tanggal Pesanan:</strong> ${order.order_data.tanggal_pesan}</p>
        <p><strong>Tanggal Pengiriman:</strong> ${order.delivery_dates.map(d => format(parse(d.tanggal, 'yyyy-MM-dd', new Date()), 'EEE, d MMM', { locale: id })).join(', ')}</p>
        <p><strong>Kurir:</strong> ${courierName}</p>
        <p><strong>Metode Pembayaran:</strong> ${order.order_data.metode_pembayaran}</p>
        <p><strong>Notes:</strong> ${order.order_data.notes || 'Tidak ada'}</p>
        <p><strong>Catatan Dapur:</strong> ${order.order_details[0]?.catatan_dapur || 'Tidak ada'}</p>
        <p><strong>Catatan Kurir:</strong> ${order.order_details[0]?.catatan_kurir || 'Tidak ada'}</p>
        <p><strong>Item Tambahan:</strong> ${order.delivery_dates[0]?.item_tambahan || 'Tidak ada'}</p>
        <p><strong>Harga Item Tambahan:</strong> Rp ${(order.delivery_dates[0]?.harga_tambahan || 0).toLocaleString('id-ID')}</p>
        <p><strong>Harga Modal Item Tambahan:</strong> Rp ${(order.delivery_dates[0]?.harga_modal_tambahan || 0).toLocaleString('id-ID')}</p>
        <p><strong>Ongkos Kirim:</strong> Rp ${(order.delivery_dates[0]?.ongkir || 0).toLocaleString('id-ID')}</p>
        <p><strong>Total Harga:</strong> Rp ${order.order_data.total_harga.toLocaleString('id-ID')}</p>
        <h4>Paket yang Dipesan:</h4>
        ${Object.entries(packages).map(([name, qty]) => `<p>${name}: ${qty}</p>`).join('')}
    `;
    modal.show();
}

function showSuccessToast(message) {
    const toast = new bootstrap.Toast(document.getElementById('toast'));
    document.getElementById('toast-title').textContent = 'Sukses';
    document.getElementById('toast-message').textContent = message;
    toast.show();
}

function showErrorToast(message) {
    const toast = new bootstrap.Toast(document.getElementById('toast-error'));
    document.getElementById('toast-error-title').textContent = 'Error';
    document.getElementById('toast-error-message').textContent = message;
    toast.show();
}

function showErrorNotification(message) {
    errorNotification.textContent = message;
    errorNotification.classList.remove('d-none');
    setTimeout(() => errorNotification.classList.add('d-none'), 5000);
}

function setupEventListeners() {
    prevMonthBtn.addEventListener('click', () => {
        displayedMonth--;
        if (displayedMonth < 0) {
            displayedMonth = 11;
            displayedYear--;
            cachedHolidays = [];
            fetchHolidayDates(displayedYear).then(holidays => {
                cachedHolidays = holidays;
                renderCalendar(displayedYear, displayedMonth);
            });
        } else {
            renderCalendar(displayedYear, displayedMonth);
        }
    });

    nextMonthBtn.addEventListener('click', () => {
        displayedMonth++;
        if (displayedMonth > 11) {
            displayedMonth = 0;
            displayedYear++;
            cachedHolidays = [];
            fetchHolidayDates(displayedYear).then(holidays => {
                cachedHolidays = holidays;
                renderCalendar(displayedYear, displayedMonth);
            });
        } else {
            renderCalendar(displayedYear, displayedMonth);
        }
    });

    todayBtn.addEventListener('click', () => {
        const today = new Date();
        displayedYear = today.getFullYear();
        displayedMonth = today.getMonth();
        renderCalendar(displayedYear, displayedMonth);
    });

    nextMonthButton.addEventListener('click', () => {
        const nextMonth = addMonths(new Date(displayedYear, displayedMonth, 1), 1);
        displayedYear = nextMonth.getFullYear();
        displayedMonth = nextMonth.getMonth();
        renderCalendar(displayedYear, displayedMonth);
    });

    clearButton.addEventListener('click', () => {
        selectedDates.clear();
        renderCalendar(displayedYear, displayedMonth);
        renderSelectedDates();
        calculateTotalPayment();
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
    });

    document.querySelector('.toggle-header').addEventListener('click', (e) => {
        e.currentTarget.parentElement.classList.toggle('active');
    });
    packageSelect.addEventListener('change', calculateTotalPayment);
    orderQuantity.addEventListener('input', calculateTotalPayment);
    shippingCost.addEventListener('input', () => {
        calculateTotalPayment();
        shippingFastIcon.classList.toggle('d-none', parseFloat(shippingCost.value) !== currentCustomerOngkir);
    });
    document.querySelector('.harga-item-tambahan').addEventListener('input', calculateTotalPayment);
    document.querySelector('.harga-modal-item-tambahan').addEventListener('input', calculateTotalPayment);
    orderForm.addEventListener('submit', submitOrder);
    document.getElementById('order-notes-label').addEventListener('click', () => {
        const textarea = document.getElementById('order-notes');
        textarea.classList.toggle('d-none');
        const icon = document.getElementById('order-notes-label').querySelector('svg');
        icon.classList.toggle('rotate-90');
    });
    document.getElementById('kitchen-notes-label').addEventListener('click', () => {
        const textarea = document.getElementById('kitchen-notes');
        textarea.classList.toggle('d-none');
        const icon = document.getElementById('kitchen-notes-label').querySelector('svg');
        icon.classList.toggle('rotate-90');
    });
    document.getElementById('courier-notes-label').addEventListener('click', () => {
        const textarea = document.getElementById('courier-notes');
        textarea.classList.toggle('d-none');
        const icon = document.getElementById('courier-notes-label').querySelector('svg');
        icon.classList.toggle('rotate-90');
    });
}

let displayedYear = new Date().getFullYear();
let displayedMonth = new Date().getMonth();
let isDragging = false;

initialize();