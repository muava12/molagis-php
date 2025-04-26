// Variabel global
let selectedCustomerId = null;
let customers = [];
let currentPage = 1;
let itemsPerPage = 100;
let fetchTimeout = null;

const refreshButton = document.getElementById('refresh-button');
const saveAddButton = document.getElementById('save-add');
const saveChangesButton = document.getElementById('save-changes');
const filterInput = document.getElementById('filterInput');
const itemsPerPageInput = document.getElementById('itemsPerPageInput');

// Fungsi utilitas
async function fetchCustomers() {
    const loadingDots = document.getElementById('loading-dots');
    loadingDots.classList.remove('d-none');
    refreshButton.classList.add('d-none');

    fetchTimeout = setTimeout(() => {
        loadingDots.classList.add('d-none');
        refreshButton.classList.remove('d-none');
    }, 15000);

    try {
        const response = await fetch('/api/customers', {
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });
        const result = await response.json();
        if (result.error) throw new Error(result.error);

        clearTimeout(fetchTimeout);
        customers = result.customers.map((customer, index) => ({
            ...customer,
            number: index + 1,
        }));

        loadingDots.classList.add('d-none');
        refreshButton.classList.add('d-none');
        renderCustomers(customers);
    } catch (error) {
        console.error('Error fetching customers:', error);
        clearTimeout(fetchTimeout);
        loadingDots.classList.add('d-none');
        refreshButton.classList.remove('d-none');
        showToast('Error', 'Gagal mengambil data pelanggan. Silakan cek koneksi internet.');
    }
}

function renderCustomers(customerData) {
    const customerList = document.getElementById('customer-list');
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedCustomers = customerData.slice(startIndex, endIndex);

    customerList.innerHTML = paginatedCustomers.map(customer => {
        const telepon = customer.telepon ? customer.telepon.replace(/^0/, '') : '';
        const teleponAlt = customer.telepon_alt ? customer.telepon_alt.replace(/^0/, '') : '';
        const teleponPemesan = customer.telepon_pemesan ? customer.telepon_pemesan.replace(/^0/, '') : '';
        return `
            <tr>
                <td class="w-5">${customer.number}</td>
                <td class="w-20">${customer.nama}</td>
                <td class="w-55">${customer.alamat || ''}</td>
                <td class="w-10">
                    <div class="tags-list">
                        ${customer.telepon ? `<a href="https://wa.me/62${telepon}" target="_blank" class="badge bg-teal-lt">${document.querySelector('.icon-tabler-brand-whatsapp').outerHTML}</a>` : ''}
                        ${customer.telepon_alt ? `<a href="https://wa.me/62${teleponAlt}" target="_blank" class="badge bg-cyan-lt">${document.querySelector('.icon-tabler-brand-whatsapp').outerHTML}</a>` : ''}
                        ${customer.telepon_pemesan ? `<a href="https://wa.me/62${teleponPemesan}" target="_blank" class="badge bg-indigo-lt">${document.querySelector('.icon-tabler-brand-whatsapp').outerHTML}</a>` : ''}
                        ${customer.maps ? `<a href="${customer.maps}" target="_blank" class="badge bg-blue-lt">${document.querySelector('.icon-tabler-map-pin').outerHTML}</a>` : ''}
                        ${customer.ongkir ? `<span class="badge bg-lime-lt">${document.querySelector('.icon-tabler-truck-delivery').outerHTML} ${customer.ongkir}</span>` : ''}
                    </div>
                </td>
                <td class="w-10">
                    <div class="btn-list">
                        <button type="button" class="btn btn-sm edit-btn" data-id="${customer.id}">Edit</button>
                        <button class="btn btn-sm btn-ghost-danger delete-btn" data-id="${customer.id}">Delete</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    updatePaginationControls(customerData.length);
    addEventListenersToButtons();
}

function updatePaginationControls(totalItems) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const paginationInfo = document.querySelector('.card-footer p');
    const paginationList = document.getElementById('pagination');

    paginationInfo.innerHTML = `Showing <span>${(currentPage - 1) * itemsPerPage + 1}</span> to <span>${Math.min(currentPage * itemsPerPage, totalItems)}</span> of <span>${totalItems}</span> entries`;

    paginationList.innerHTML = `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage - 1}">
                ${document.querySelector('.icon-tabler-chevron-left').outerHTML}
                prev
            </a>
        </li>
        ${Array.from({ length: totalPages }, (_, i) => `
            <li class="page-item ${i + 1 === currentPage ? 'active' : ''}">
                <a class="page-link" href="#" data-page="${i + 1}">${i + 1}</a>
            </li>
        `).join('')}
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage + 1}">
                next
                ${document.querySelector('.icon-tabler-chevron-right').outerHTML}
            </a>
        </li>
    `;
}

async function handleEditClick(event) {
    const customerId = event.target.getAttribute('data-id');
    if (!customerId) {
        showToast('Error', 'ID pelanggan tidak valid.');
        return;
    }

    // Cari pelanggan dari data lokal terlebih dahulu
    const customer = customers.find(cust => cust.id == customerId);
    if (customer) {
        document.getElementById('edit-nama').value = customer.nama;
        document.getElementById('edit-alamat').value = customer.alamat || '';
        document.getElementById('edit-telepon').value = customer.telepon || '';
        document.getElementById('edit-telepon-alt').value = customer.telepon_alt || '';
        document.getElementById('edit-telepon-pemesan').value = customer.telepon_pemesan || '';
        document.getElementById('edit-maps').value = customer.maps || '';
        document.getElementById('edit-ongkir').value = customer.ongkir || '';

        selectedCustomerId = customerId;
        const editModal = new bootstrap.Modal(document.getElementById('edit-modal'));
        editModal.show();
    } else {
        // Jika tidak ada di data lokal, ambil dari server
        try {
            const response = await fetch(`/api/customers?id=eq.${customerId}`, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            });
            const result = await response.json();
            if (result.error || !result.customers || result.customers.length === 0) {
                throw new Error(result.error || 'Pelanggan tidak ditemukan');
            }

            const customer = result.customers[0];
            document.getElementById('edit-nama').value = customer.nama;
            document.getElementById('edit-alamat').value = customer.alamat || '';
            document.getElementById('edit-telepon').value = customer.telepon || '';
            document.getElementById('edit-telepon-alt').value = customer.telepon_alt || '';
            document.getElementById('edit-telepon-pemesan').value = customer.telepon_pemesan || '';
            document.getElementById('edit-maps').value = customer.maps || '';
            document.getElementById('edit-ongkir').value = customer.ongkir || '';

            selectedCustomerId = customerId;
            const editModal = new bootstrap.Modal(document.getElementById('edit-modal'));
            editModal.show();
        } catch (error) {
            console.error('Error fetching customer:', error);
            showToast('Error', 'Gagal mengambil data pelanggan. Silakan cek koneksi internet.');
        }
    }
}

// async function saveChanges() {
//     saveChangesButton.classList.add('btn-loading');

//     if (!selectedCustomerId) {
//         saveChangesButton.classList.remove('btn-loading');
//         showToast('Error', 'ID pelanggan tidak valid.');
//         return;
//     }

//     const updatedCustomer = {
//         id: selectedCustomerId, // Kirim sebagai string, bukan integer
//         nama: document.getElementById('edit-nama').value,
//         alamat: document.getElementById('edit-alamat').value || null,
//         telepon: document.getElementById('edit-telepon').value || null,
//         telepon_alt: document.getElementById('edit-telepon-alt').value || null,
//         telepon_pemesan: document.getElementById('edit-telepon-pemesan').value || null,
//         maps: document.getElementById('edit-maps').value || null,
//         ongkir: document.getElementById('edit-ongkir').value || null,
//     };

//     try {
//         const response = await fetch('/api/customers/update', {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json',
//                 'X-Requested-With': 'XMLHttpRequest'
//             },
//             body: JSON.stringify(updatedCustomer)
//         });
//         const result = await response.json();
//         if (result.error) throw new Error(result.error);

//         saveChangesButton.classList.remove('btn-loading');
//         closeEditModal();
//         fetchCustomers();
//         showToast('Sukses', 'Perubahan pelanggan berhasil disimpan.');
//     } catch (error) {
//         console.error('Error updating customer:', error);
//         saveChangesButton.classList.remove('btn-loading');
//         showToast('Error', 'Gagal menyimpan perubahan: ' + error.message);
//     }
// }
async function saveChanges() {
    saveChangesButton.classList.add('btn-loading');

    if (!selectedCustomerId) {
        saveChangesButton.classList.remove('btn-loading');
        showToast('Error', 'ID pelanggan tidak valid.');
        return;
    }

    const updatedCustomer = {
        id: selectedCustomerId, // Kirim sebagai string, bukan integer
        nama: document.getElementById('edit-nama').value,
        alamat: document.getElementById('edit-alamat').value || null,
        telepon: document.getElementById('edit-telepon').value || null,
        telepon_alt: document.getElementById('edit-telepon-alt').value || null,
        telepon_pemesan: document.getElementById('edit-telepon-pemesan').value || null,
        maps: document.getElementById('edit-maps').value || null,
        ongkir: document.getElementById('edit-ongkir').value || null,
    };

    console.log('Sending updatedCustomer:', JSON.stringify(updatedCustomer)); // Tambahkan logging

    try {
        const response = await fetch('/api/customers/update', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify(updatedCustomer)
        });
        const result = await response.json();
        if (result.error) throw new Error(result.error);

        saveChangesButton.classList.remove('btn-loading');
        closeEditModal();
        fetchCustomers();
        showToast('Sukses', 'Perubahan pelanggan berhasil disimpan.');
    } catch (error) {
        console.error('Error updating customer:', error);
        saveChangesButton.classList.remove('btn-loading');
        showToast('Error', 'Gagal menyimpan perubahan: ' + error.message);
    }
}

// Fungsi lainnya tetap sama
function changePage(newPage) {
    currentPage = newPage;
    renderCustomers(customers);
}

async function filterTable() {
    const filter = filterInput.value.toLowerCase();
    const filteredCustomers = customers.filter(customer => customer.nama.toLowerCase().includes(filter));

    filteredCustomers.sort((a, b) => {
        const posA = a.nama.toLowerCase().indexOf(filter);
        const posB = b.nama.toLowerCase().indexOf(filter);
        return posA - posB;
    });

    renderCustomers(filteredCustomers);
}

async function saveNewCustomer() {
    saveAddButton.classList.add('btn-loading');

    const newCustomer = {
        nama: document.getElementById('add-nama').value,
        alamat: document.getElementById('add-alamat').value,
        telepon: document.getElementById('add-telepon').value,
        telepon_alt: document.getElementById('add-telepon-alt').value || null,
        telepon_pemesan: document.getElementById('add-telepon-pemesan').value || null,
        maps: document.getElementById('add-maps').value || null,
        ongkir: document.getElementById('add-ongkir').value || null,
    };

    try {
        const response = await fetch('/api/customers/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify(newCustomer)
        });
        const result = await response.json();
        if (result.error) throw new Error(result.error);

        saveAddButton.classList.remove('btn-loading');
        closeAddModal();
        fetchCustomers();
        showToast('Sukses', 'Pelanggan berhasil ditambahkan.');

        document.getElementById('add-nama').value = '';
        document.getElementById('add-alamat').value = '';
        document.getElementById('add-telepon').value = '';
        document.getElementById('add-telepon-alt').value = '';
        document.getElementById('add-telepon-pemesan').value = '';
        document.getElementById('add-maps').value = '';
        document.getElementById('add-ongkir').value = '';
    } catch (error) {
        console.error('Error adding customer:', error);
        saveAddButton.classList.remove('btn-loading');
        showToast('Error', 'Gagal menambahkan pelanggan. Silakan cek koneksi internet.');
    }
}

function handleDeleteClick(event) {
    const customerId = event.target.getAttribute('data-id');
    const customer = customers.find(cust => cust.id == customerId);

    if (!customer) {
        console.error('Customer not found');
        return;
    }

    showConfirmation(
        'Yakin mau dihapus?',
        `Data <strong>${customer.nama}</strong> akan dihapus permanen.`,
        async () => {
            try {
                const response = await fetch('/api/customers/delete', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    body: JSON.stringify({ id: customerId })
                });
                const result = await response.json();
                if (result.error) throw new Error(result.error);

                fetchCustomers();
                showToast('Sukses', 'Pelanggan berhasil dihapus.');
            } catch (error) {
                console.error('Error deleting customer:', error);
                showToast('Error', 'Gagal menghapus pelanggan. Silakan cek koneksi internet.');
            }
        },
        'Hapus'
    );
}

function closeAddModal() {
    const addModal = bootstrap.Modal.getInstance(document.getElementById('add-modal'));
    addModal.hide();
}

function closeEditModal() {
    const editModal = bootstrap.Modal.getInstance(document.getElementById('edit-modal'));
    editModal.hide();
}

function showConfirmation(title, message, onConfirm, confirmText = 'Konfirmasi') {
    const modal = new bootstrap.Modal(document.getElementById('delete-confirm-modal'));
    document.getElementById('delete-confirm-modal-title').textContent = title;
    document.getElementById('delete-confirm-modal-message').innerHTML = message;

    const confirmButton = document.getElementById('delete-confirm-modal-confirm');
    confirmButton.textContent = confirmText;
    confirmButton.replaceWith(confirmButton.cloneNode(true));

    document.getElementById('delete-confirm-modal-confirm').addEventListener('click', () => {
        if (typeof onConfirm === 'function') {
            onConfirm();
        }
        modal.hide();
    }, { once: true });

    modal.show();
}

function showToast(title, message) {
    const toast = new bootstrap.Toast(document.getElementById('toast'));
    document.getElementById('toast-title').textContent = title;
    document.getElementById('toast-message').textContent = message;
    toast.show();
}

// Event listener dalam satu fungsi
function setupEventListeners() {
    refreshButton.addEventListener('click', fetchCustomers);
    saveAddButton.addEventListener('click', saveNewCustomer);
    saveChangesButton.addEventListener('click', saveChanges);
    filterInput.addEventListener('input', filterTable);
    itemsPerPageInput.addEventListener('change', () => {
        itemsPerPage = parseInt(itemsPerPageInput.value, 10);
        currentPage = 1;
        renderCustomers(customers);
    });

    document.addEventListener('click', (event) => {
        if (event.target.classList.contains('page-link') && event.target.dataset.page) {
            event.preventDefault();
            const newPage = parseInt(event.target.dataset.page, 10);
            if (!isNaN(newPage)) {
                changePage(newPage);
            }
        }
    });
}

function addEventListenersToButtons() {
    document.querySelectorAll('.edit-btn').forEach(button => {
        button.removeEventListener('click', handleEditClick);
        button.addEventListener('click', handleEditClick);
    });
    document.querySelectorAll('.delete-btn').forEach(button => {
        button.removeEventListener('click', handleDeleteClick);
        button.addEventListener('click', handleDeleteClick);
    });
}

// Inisialisasi
async function initialize() {
    fetchCustomers();
    setupEventListeners();
}

initialize();