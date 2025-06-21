/*
 * File: customers.js
 * Description: Logika untuk halaman manajemen pelanggan, termasuk pengambilan, penyaringan, edit, dan penghapusan data pelanggan.
 */

// Variabel global
let selectedCustomerId = null;
let customers = [];
let allLabels = []; // Menyimpan semua label yang tersedia
let currentPage = 1;
let itemsPerPage = 100;
let fetchTimeout = null;
const bootstrap = window.tabler?.bootstrap;

const refreshButton = document.getElementById('refresh-button');
const filterInput = document.getElementById('filterInput');
const itemsPerPageInput = document.getElementById('itemsPerPageInput');

// Impor modul
import { initAddCustomerModal } from './add-customer-modal.js';
import autosize from '../autosize.esm.js';
import { showToast, showErrorToast } from './utils.js';

// --- FUNGSI PENGAMBILAN DATA ---

async function fetchCustomers() {
    const loadingDots = document.getElementById('loading-dots');
    loadingDots.classList.remove('d-none');
    refreshButton.classList.add('d-none');

    fetchTimeout = setTimeout(() => {
        loadingDots.classList.add('d-none');
        refreshButton.classList.remove('d-none');
    }, 15000);

    try {
        const response = await fetch('/api/customers/all', {
            headers: { 'X-Requested-With': 'XMLHttpRequest' },
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
        showErrorToast('Error', 'Gagal mengambil data pelanggan. Silakan cek koneksi internet.');
    }
}

async function fetchLabels() {
    try {
        const response = await fetch('/api/labels/all');
        const result = await response.json();
        if (result.error) throw new Error(result.error);
        allLabels = result.labels;
    } catch (error) {
        console.error('Error fetching labels:', error);
        showErrorToast('Error', 'Gagal mengambil daftar label.');
    }
}


// --- FUNGSI RENDER ---

function renderCustomers(customerData) {
    const customerList = document.getElementById('customer-list');
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedCustomers = customerData.slice(startIndex, endIndex);

    customerList.innerHTML = paginatedCustomers
        .map((customer) => {
            const telepon = customer.telepon ? customer.telepon.replace(/^0/, '') : '';
            const teleponAlt = customer.telepon_alt ? customer.telepon_alt.replace(/^0/, '') : '';
            const teleponPemesan = customer.telepon_pemesan ? customer.telepon_pemesan.replace(/^0/, '') : '';

            // Render labels
            const labelsHtml = customer.labels.map(label =>
                `<span class="badge bg-${label.color}-lt me-1">${label.name}</span>`
            ).join('');

            return `
            <tr>
                <td class="w-5">${customer.number}</td>
                <td class="w-20">
                    <div>${customer.nama}</div>
                    <div class="mt-1">${labelsHtml}</div>
                </td>
                <td class="w-55">${customer.alamat || ''}</td>
                <td class="w-10">
                    <div class="tags-list">
                        ${
                            customer.telepon
                                ? `<a href="https://wa.me/62${telepon}" target="_blank" class="badge bg-teal-lt">${document.querySelector('.icon-tabler-brand-whatsapp').outerHTML}</a>`
                                : ''
                        }
                        ${
                            customer.telepon_alt
                                ? `<a href="https://wa.me/62${teleponAlt}" target="_blank" class="badge bg-cyan-lt">${document.querySelector('.icon-tabler-brand-whatsapp').outerHTML}</a>`
                                : ''
                        }
                        ${
                            customer.telepon_pemesan
                                ? `<a href="https://wa.me/62${teleponPemesan}" target="_blank" class="badge bg-indigo-lt">${document.querySelector('.icon-tabler-brand-whatsapp').outerHTML}</a>`
                                : ''
                        }
                        ${
                            customer.maps
                                ? `<a href="${customer.maps}" target="_blank" class="badge bg-blue-lt">${document.querySelector('.icon-tabler-map-pin').outerHTML}</a>`
                                : ''
                        }
                        ${
                            customer.ongkir
                                ? `<span class="badge bg-lime-lt">${document.querySelector('.icon-tabler-truck-delivery').outerHTML} ${customer.ongkir}</span>`
                                : ''
                        }
                    </div>
                </td>
                <td class="w-10">
                    <div class="btn-list flex-nowrap">
                         <button class="btn btn-sm" data-bs-toggle="modal" data-bs-target="#manage-labels-modal" data-customer-id="${customer.id}">
                           Labels
                        </button>
                        <button type="button" class="btn btn-sm edit-btn" data-id="${customer.id}">Edit</button>
                        <button class="btn btn-sm btn-ghost-danger delete-btn" data-id="${customer.id}">Delete</button>
                    </div>
                </td>
            </tr>
        `;
        })
        .join('');

    updatePaginationControls(customerData.length);
    addEventListenersToButtons();
}

function updatePaginationControls(totalItems) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const paginationInfo = document.querySelector('.card-footer p');
    const paginationList = document.getElementById('pagination');

    paginationInfo.innerHTML = `Showing <span>${(currentPage - 1) * itemsPerPage + 1}</span> to <span>${Math.min(
        currentPage * itemsPerPage,
        totalItems
    )}</span> of <span>${totalItems}</span> entries`;

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

function renderLabelsInModal(customerId) {
    const modalBody = document.getElementById('manage-labels-modal-body');
    const customer = customers.find(c => c.id == customerId);
    if (!customer) {
        modalBody.innerHTML = '<p>Pelanggan tidak ditemukan.</p>';
        return;
    }

    const customerLabelIds = new Set(customer.labels.map(l => l.id));

    // Group labels by category
    const labelsByCategory = allLabels.reduce((acc, label) => {
        if (!acc[label.category]) {
            acc[label.category] = [];
        }
        acc[label.category].push(label);
        return acc;
    }, {});

    // Build accordion HTML
    const accordionId = `labels-accordion-${customerId}`;
    let accordionHtml = `<div class="accordion" id="${accordionId}">`;

    Object.keys(labelsByCategory).forEach((category, index) => {
        const collapseId = `collapse-${category.replace(/\s+/g, '-')}-${index}`;
        accordionHtml += `
            <div class="accordion-item">
                <h2 class="accordion-header" id="heading-${index}">
                    <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#${collapseId}" aria-expanded="false">
                        ${category}
                    </button>
                </h2>
                <div id="${collapseId}" class="accordion-collapse collapse" data-bs-parent="#${accordionId}">
                    <div class="accordion-body">
                        ${labelsByCategory[category].map(label => `
                            <div class="form-check">
                                <input class="form-check-input label-checkbox" type="checkbox" value="${label.id}" id="label-${label.id}-${customerId}" data-customer-id="${customerId}" ${customerLabelIds.has(label.id) ? 'checked' : ''}>
                                <label class="form-check-label" for="label-${label.id}-${customerId}">
                                    ${label.name}
                                </label>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    });

    accordionHtml += '</div>';
    modalBody.innerHTML = accordionHtml;
}


// --- FUNGSI HANDLER ---

async function handleLabelChange(event) {
    const checkbox = event.target;
    const customerId = checkbox.dataset.customerId;
    const labelId = checkbox.value;
    const isChecked = checkbox.checked;

    const endpoint = '/api/customers/labels';
    const method = isChecked ? 'POST' : 'DELETE';
    const body = JSON.stringify({
        customer_id: customerId,
        label_id: labelId
    });

    try {
        const response = await fetch(endpoint, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body
        });

        const result = await response.json();
        if (result.error) {
            throw new Error(result.error);
        }

        // Update local customer data for instant UI feedback
        const customerIndex = customers.findIndex(c => c.id == customerId);
        if (customerIndex !== -1) {
            if (isChecked) {
                const labelToAdd = allLabels.find(l => l.id == labelId);
                if (labelToAdd) {
                    customers[customerIndex].labels.push(labelToAdd);
                }
            } else {
                customers[customerIndex].labels = customers[customerIndex].labels.filter(l => l.id != labelId);
            }
        }
        
        // No full re-render, just show success
        showToast('Sukses', `Label berhasil ${isChecked ? 'ditambahkan' : 'dihapus'}.`);

    } catch (error) {
        console.error('Error updating label:', error);
        showErrorToast('Error', 'Gagal memperbarui label.');
        // Revert checkbox state on error
        checkbox.checked = !isChecked;
    }
}

async function handleEditClick(event) {
    const customerId = event.target.getAttribute('data-id');
    if (!customerId) {
        showErrorToast('Error', 'ID pelanggan tidak valid.');
        return;
    }

    // Cari pelanggan dari data lokal terlebih dahulu
    const customer = customers.find((cust) => cust.id == customerId);
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
                headers: { 'X-Requested-With': 'XMLHttpRequest' },
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
            showErrorToast('Error', 'Gagal mengambil data pelanggan. Silakan cek koneksi internet.');
        }
    }
}

async function saveChanges(event) {
    event.preventDefault(); // Mencegah submit default

    const form = document.getElementById('edit-modal-form');
    const saveButtons = [
        document.getElementById('edit-save-changes'),
        document.getElementById('edit-save-changes-mobile'),
    ];

    // Validasi form
    if (!form.checkValidity()) {
        form.reportValidity(); // Tampilkan pesan validasi HTML5
        return;
    }

    // Nonaktifkan tombol submit
    saveButtons.forEach((button) => {
        if (button) {
            button.classList.add('btn-loading');
            button.disabled = true;
        }
    });

    if (!selectedCustomerId) {
        saveButtons.forEach((button) => {
            if (button) {
                button.classList.remove('btn-loading');
                button.disabled = false;
            }
        });
        showErrorToast('Error', 'ID pelanggan tidak valid.');
        return;
    }

    const updatedCustomer = {
        id: selectedCustomerId, // Kirim sebagai string, bukan integer
        nama: document.getElementById('edit-nama').value.trim(),
        alamat: document.getElementById('edit-alamat').value.trim() || null,
        telepon: document.getElementById('edit-telepon').value.trim() || null,
        telepon_alt: document.getElementById('edit-telepon-alt').value.trim() || null,
        telepon_pemesan: document.getElementById('edit-telepon-pemesan').value.trim() || null,
        maps: document.getElementById('edit-maps').value.trim() || null,
        ongkir: document.getElementById('edit-ongkir').value.trim() ? parseFloat(document.getElementById('edit-ongkir').value.trim()) : null,
    };

    console.log('Sending updatedCustomer:', JSON.stringify(updatedCustomer)); // Logging untuk debugging

    try {
        const response = await fetch('/api/customers/update', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify(updatedCustomer),
        });
        const result = await response.json();
        if (result.error) throw new Error(result.error);

        form.reset();
        closeEditModal();
        fetchCustomers();
        showToast('Sukses', 'Perubahan pelanggan berhasil disimpan.');
    } catch (error) {
        console.error('Error updating customer:', error);
        showErrorToast('Error', 'Gagal menyimpan perubahan: ' + error.message);
    } finally {
        // Aktifkan kembali tombol submit
        saveButtons.forEach((button) => {
            if (button) {
                button.classList.remove('btn-loading');
                button.disabled = false;
            }
        });
    }
}

function changePage(newPage) {
    currentPage = newPage;
    renderCustomers(customers);
}

async function filterTable() {
    const filter = filterInput.value.toLowerCase();
    const filteredCustomers = customers.filter((customer) => customer.nama.toLowerCase().includes(filter));

    filteredCustomers.sort((a, b) => {
        const posA = a.nama.toLowerCase().indexOf(filter);
        const posB = b.nama.toLowerCase().indexOf(filter);
        return posA - posB;
    });

    renderCustomers(filteredCustomers);
}

function handleDeleteClick(event) {
    const customerId = event.target.getAttribute('data-id');
    const customer = customers.find((cust) => cust.id == customerId);

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
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                    body: JSON.stringify({ id: customerId }),
                });
                const result = await response.json();
                if (result.error) throw new Error(result.error);

                fetchCustomers();
                showToast('Sukses', 'Pelanggan berhasil dihapus.');
            } catch (error) {
                console.error('Error deleting customer:', error);
                showErrorToast('Error', 'Gagal menghapus pelanggan. Silakan cek koneksi internet.');
            }
        },
        'Hapus'
    );
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

    document.getElementById('delete-confirm-modal-confirm').addEventListener(
        'click',
        () => {
            if (typeof onConfirm === 'function') {
                onConfirm();
            }
            modal.hide();
        },
        { once: true }
    );

    modal.show();
}

function addEventListenersToButtons() {
    document.querySelectorAll('.edit-btn').forEach(button => {
        button.addEventListener('click', handleEditClick);
    });
    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', handleDeleteClick);
    });
}

function setupEventListeners() {
    refreshButton.addEventListener('click', fetchCustomers);
    filterInput.addEventListener('input', filterTable);
    itemsPerPageInput.addEventListener('change', () => {
        itemsPerPage = parseInt(itemsPerPageInput.value, 10);
        currentPage = 1;
        renderCustomers(customers.filter(c => c.nama.toLowerCase().includes(filterInput.value.toLowerCase())));
    });
    document.getElementById('edit-modal-form').addEventListener('submit', saveChanges);

    const manageLabelsModal = document.getElementById('manage-labels-modal');
    manageLabelsModal.addEventListener('show.bs.modal', function (event) {
        const button = event.relatedTarget;
        const customerId = button.getAttribute('data-customer-id');
        renderLabelsInModal(customerId);
    });
    
    manageLabelsModal.addEventListener('change', function(event) {
        if (event.target.classList.contains('label-checkbox')) {
            handleLabelChange(event);
        }
    });
    
     manageLabelsModal.addEventListener('hidden.bs.modal', function () {
        // Re-render only the filtered customers to reflect label changes
        filterTable();
    });

    document.getElementById('pagination').addEventListener('click', event => {
        event.preventDefault();
        const page = event.target.closest('a')?.dataset.page;
        if (page) {
            changePage(parseInt(page));
        }
    });
}

// Inisialisasi
async function initialize() {
    await Promise.all([fetchCustomers(), fetchLabels()]);
    setupEventListeners();
    
    // Initialize the add customer modal
    initAddCustomerModal('add-modal', {
        showToast,
        showErrorToast,
        onSuccess: fetchCustomers // Refresh customer list on success
    });
}

document.addEventListener('DOMContentLoaded', initialize);