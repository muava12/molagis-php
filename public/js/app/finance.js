/*
 * File: finance.js
 * Description: Logic for finance page, including expense form input,
 *              transaction filtering, and financial records management.
 */
import { showToast, formatRupiah } from './utils.js';

// Global variables
let transactionDatePicker = null;
let filterStartDatePicker = null;
let filterEndDatePicker = null;
let editTransactionDatePicker = null;
let currentPage = 1;
let currentLimit = 500;
let totalRecords = 0;
let totalPages = 1;

/**
 * Initialize the finance page
 */
document.addEventListener('DOMContentLoaded', function() {
    initializeDatePickers();
    initializeFormHandlers();
    initializeQuickCategories();
    initializeFilters();
    initializeTableActions();
    initializePagination();
});

/**
 * Initialize Flatpickr date pickers
 */
function initializeDatePickers() {
    // Transaction date picker
    const transactionDateInput = document.getElementById('transaction-date');
    if (transactionDateInput) {
        transactionDatePicker = flatpickr(transactionDateInput, {
            locale: 'id',
            dateFormat: 'Y-m-d',
            defaultDate: 'today',
            allowInput: true,
            clickOpens: true
        });
    }

    // Filter date pickers
    const filterStartDateInput = document.getElementById('filter-start-date');
    if (filterStartDateInput) {
        filterStartDatePicker = flatpickr(filterStartDateInput, {
            locale: 'id',
            dateFormat: 'Y-m-d',
            allowInput: true,
            clickOpens: true
        });
    }

    const filterEndDateInput = document.getElementById('filter-end-date');
    if (filterEndDateInput) {
        filterEndDatePicker = flatpickr(filterEndDateInput, {
            locale: 'id',
            dateFormat: 'Y-m-d',
            allowInput: true,
            clickOpens: true
        });
    }

    // Edit modal date picker
    const editTransactionDateInput = document.getElementById('edit-transaction-date');
    if (editTransactionDateInput) {
        editTransactionDatePicker = flatpickr(editTransactionDateInput, {
            locale: 'id',
            dateFormat: 'Y-m-d',
            allowInput: true,
            clickOpens: true
        });
    }
}

/**
 * Initialize form handlers
 */
function initializeFormHandlers() {
    const expenseForm = document.getElementById('expense-form');
    if (expenseForm) {
        expenseForm.addEventListener('submit', handleExpenseFormSubmit);
    }

    const editExpenseForm = document.getElementById('edit-expense-form');
    if (editExpenseForm) {
        editExpenseForm.addEventListener('submit', handleEditFormSubmit);
    }

    const updateRecordBtn = document.getElementById('update-record-btn');
    if (updateRecordBtn) {
        updateRecordBtn.addEventListener('click', handleEditFormSubmit);
    }

    const filterForm = document.getElementById('filter-form');
    if (filterForm) {
        filterForm.addEventListener('submit', handleFilterFormSubmit);
    }

    const clearFilterBtn = document.getElementById('clear-filter-btn');
    if (clearFilterBtn) {
        clearFilterBtn.addEventListener('click', handleClearFilter);
    }
}

/**
 * Initialize quick category buttons
 */
function initializeQuickCategories() {
    const quickCategoryBtns = document.querySelectorAll('.quick-category-btn');
    quickCategoryBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const categoryId = this.dataset.categoryId;
            const categoryName = this.dataset.categoryName;
            
            // Set category in form
            const categorySelect = document.getElementById('category-select');
            if (categorySelect) {
                categorySelect.value = categoryId;
            }

            // Focus on amount input
            const amountInput = document.getElementById('amount-input');
            if (amountInput) {
                amountInput.focus();
            }

            showToast('Info', `Category "${categoryName}" selected`, 'info');
        });
    });
}

/**
 * Initialize filter functionality
 */
function initializeFilters() {
    // Auto-submit filter when date changes
    const filterStartDate = document.getElementById('filter-start-date');
    const filterEndDate = document.getElementById('filter-end-date');
    const filterCategory = document.getElementById('filter-category');

    [filterStartDate, filterEndDate, filterCategory].forEach(element => {
        if (element) {
            element.addEventListener('change', function() {
                // Auto-submit filter after a short delay
                setTimeout(() => {
                    const filterForm = document.getElementById('filter-form');
                    if (filterForm) {
                        handleFilterFormSubmit({ preventDefault: () => {} });
                    }
                }, 300);
            });
        }
    });
}

/**
 * Initialize table action buttons
 */
function initializeTableActions() {
    // Edit buttons
    document.addEventListener('click', function(e) {
        if (e.target.closest('.edit-record-btn')) {
            const btn = e.target.closest('.edit-record-btn');
            const recordId = btn.dataset.recordId;
            handleEditRecord(recordId);
        }
    });

    // Delete buttons
    document.addEventListener('click', function(e) {
        if (e.target.closest('.delete-record-btn')) {
            const btn = e.target.closest('.delete-record-btn');
            const recordId = btn.dataset.recordId;
            handleDeleteRecord(recordId);
        }
    });
}

/**
 * Handle expense form submission
 */
async function handleExpenseFormSubmit(e) {
    e.preventDefault();

    const form = e.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    // Validate required fields
    if (!data.transaction_date || !data.category_id || !data.amount) {
        showToast('Error', 'Please fill in all required fields', 'error');
        return;
    }

    // Validate amount
    const amount = parseFloat(data.amount);
    if (isNaN(amount) || amount <= 0) {
        showToast('Error', 'Amount must be a number greater than 0', 'error');
        return;
    }

    const submitBtn = document.getElementById('submit-btn');
    const originalText = submitBtn.innerHTML;

    try {
        // Show loading state
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';

        // Main form is only for adding new records
        const response = await fetch('/api/finance/records', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (result.success) {
            showToast('Success', result.message, 'success');
            form.reset();

            // Reset date picker to today
            if (transactionDatePicker) {
                transactionDatePicker.setDate('today');
            }

            // Reload transaction history and summary
            setTimeout(() => {
                window.location.reload(); // Reload to update summary as well
            }, 1000);
        } else {
            showToast('Error', result.message, 'error');
        }
    } catch (error) {
        console.error('Error submitting expense:', error);
        showToast('Error', 'An error occurred while saving the transaction', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

/**
 * Handle filter form submission
 */
function handleFilterFormSubmit(e) {
    e.preventDefault();

    const filterBtn = document.getElementById('filter-btn');
    const btnText = filterBtn.querySelector('.btn-text');
    const spinner = filterBtn.querySelector('.spinner-border');

    // Show loading state
    filterBtn.disabled = true;
    if (btnText) btnText.textContent = 'Filtering...';
    if (spinner) spinner.classList.remove('d-none');

    const form = document.getElementById('filter-form');
    const formData = new FormData(form);
    const params = new URLSearchParams();

    // Add non-empty values to params
    for (const [key, value] of formData.entries()) {
        if (value.trim()) {
            params.append(key, value);
        }
    }

    // Redirect with filter parameters
    const url = '/finance' + (params.toString() ? '?' + params.toString() : '');
    window.location.href = url;
}

/**
 * Handle clear filter
 */
function handleClearFilter() {
    window.location.href = '/finance';
}

/**
 * Handle edit record
 */
async function handleEditRecord(recordId) {
    try {
        // Get record data from the table row
        const row = document.querySelector(`tr[data-record-id="${recordId}"]`);
        if (!row) {
            showToast('Error', 'Transaction data not found', 'error');
            return;
        }

        // Extract data from table row
        const cells = row.querySelectorAll('td');
        const dateText = cells[0].querySelector('.text-muted').textContent.trim();
        const categoryText = cells[1].querySelector('.badge').textContent.trim();
        const description = cells[2].querySelector('.text-truncate').textContent.trim();
        const amountText = cells[3].textContent.trim();

        // Parse date (format: dd/mm/yyyy)
        const dateParts = dateText.split('/');
        const transactionDate = `${dateParts[2]}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}`;

        // Parse amount (remove Rp and dots)
        const amount = amountText.replace(/[Rp\s.]/g, '').replace(',', '.');

        // Find category ID by display name
        const editCategorySelect = document.getElementById('edit-category');
        let categoryId = '';
        for (const option of editCategorySelect.options) {
            if (option.textContent.trim() === categoryText) {
                categoryId = option.value;
                break;
            }
        }

        // Populate modal form with record data
        document.getElementById('edit-transaction-date').value = transactionDate;
        document.getElementById('edit-category').value = categoryId;
        document.getElementById('edit-amount').value = amount;
        document.getElementById('edit-description').value = description === '-' ? '' : description;
        document.getElementById('edit-record-id').value = recordId;

        // Update date picker
        if (editTransactionDatePicker) {
            editTransactionDatePicker.setDate(transactionDate);
        }

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('edit-record-modal'));
        modal.show();

    } catch (error) {
        console.error('Error loading record for edit:', error);
        showToast('Error', 'An error occurred while loading data', 'error');
    }
}

/**
 * Handle delete record
 */
function handleDeleteRecord(recordId) {
    showConfirmation(
        'Delete Transaction',
        'Are you sure you want to delete this transaction? This action cannot be undone.',
        () => performDeleteRecord(recordId),
        'Delete'
    );
}

/**
 * Perform actual delete operation
 */
async function performDeleteRecord(recordId) {
    try {
        const response = await fetch(`/api/finance/records/${recordId}`, {
            method: 'DELETE',
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        });

        const result = await response.json();

        if (result.success) {
            showToast('Success', result.message, 'success');

            // Reload transaction history
            loadTransactionHistory();
        } else {
            showToast('Error', result.message, 'error');
        }
    } catch (error) {
        console.error('Error deleting record:', error);
        showToast('Error', 'An error occurred while deleting the transaction', 'error');
    }
}

/**
 * Show confirmation modal
 */
function showConfirmation(title, message, onConfirm, confirmText = 'Confirm') {
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

/**
 * Format currency for display
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

/**
 * Format number with thousand separators
 */
function formatNumber(number) {
    return new Intl.NumberFormat('id-ID').format(number);
}

/**
 * Handle edit form submission
 */
async function handleEditFormSubmit(e) {
    e.preventDefault();

    const form = document.getElementById('edit-expense-form');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    const recordId = data.record_id;

    // Validate required fields
    if (!data.transaction_date || !data.category_id || !data.amount || !recordId) {
        showToast('Error', 'Please fill in all required fields', 'error');
        return;
    }

    // Validate amount
    const amount = parseFloat(data.amount);
    if (isNaN(amount) || amount <= 0) {
        showToast('Error', 'Amount must be a number greater than 0', 'error');
        return;
    }

    const updateBtn = document.getElementById('update-record-btn');
    const originalText = updateBtn.innerHTML;

    try {
        // Show loading state
        updateBtn.disabled = true;
        updateBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Updating...';

        const response = await fetch(`/api/finance/records/${recordId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({
                transaction_date: data.transaction_date,
                category_id: data.category_id,
                amount: data.amount,
                description: data.description
            })
        });

        const result = await response.json();

        if (result.success) {
            showToast('Success', result.message, 'success');

            // Hide modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('edit-record-modal'));
            modal.hide();

            // Reload transaction history
            loadTransactionHistory();
        } else {
            showToast('Error', result.message, 'error');
        }
    } catch (error) {
        console.error('Error updating expense:', error);
        showToast('Error', 'An error occurred while updating the transaction', 'error');
    } finally {
        updateBtn.disabled = false;
        updateBtn.innerHTML = originalText;
    }
}

/**
 * Initialize pagination
 */
function initializePagination() {
    // Get pagination info from server data or URL params
    if (window.financePageData) {
        currentPage = window.financePageData.currentPage;
        currentLimit = window.financePageData.currentLimit;
        totalRecords = window.financePageData.totalRecords;
        totalPages = window.financePageData.totalPages;
    } else {
        const urlParams = new URLSearchParams(window.location.search);
        currentPage = parseInt(urlParams.get('page')) || 1;
        currentLimit = parseInt(urlParams.get('limit')) || 500;
    }

    // Set records per page dropdown
    const recordsPerPageSelect = document.getElementById('records-per-page');
    if (recordsPerPageSelect) {
        recordsPerPageSelect.value = currentLimit;
        recordsPerPageSelect.addEventListener('change', function() {
            currentLimit = parseInt(this.value);
            currentPage = 1; // Reset to first page
            updateURL();
        });
    }

    // Update pagination info on initial load
    updatePaginationInfo();
}

/**
 * Load transaction history with pagination
 */
async function loadTransactionHistory() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        urlParams.set('page', currentPage);
        urlParams.set('limit', currentLimit);

        const response = await fetch(`/api/finance/records?${urlParams.toString()}`, {
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        });

        const result = await response.json();

        if (result.success) {
            updateTransactionTable(result.data);

            // Update pagination info from response
            if (result.pagination) {
                totalRecords = result.pagination.total_records;
                totalPages = result.pagination.total_pages;
                currentPage = result.pagination.current_page;
                currentLimit = result.pagination.per_page;
            }

            updatePaginationInfo();
        } else {
            showToast('Error', 'Failed to load transaction history', 'error');
        }
    } catch (error) {
        console.error('Error loading transaction history:', error);
        showToast('Error', 'An error occurred while loading transactions', 'error');
    }
}

/**
 * Update transaction table with new data
 */
function updateTransactionTable(records) {
    const tbody = document.getElementById('records-tbody');
    if (!tbody) return;

    if (records.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-5">
                    <div class="empty">
                        <div class="empty-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" class="icon" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
                                <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                                <path d="M14 3v4a1 1 0 0 0 1 1h4"/>
                                <path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z"/>
                                <path d="M10 12l4 4m0 -4l-4 4"/>
                            </svg>
                        </div>
                        <p class="empty-title">No transactions yet</p>
                        <p class="empty-subtitle text-muted">
                            Start adding expense transactions using the form on the left.
                        </p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = records.map(record => {
        // Parse transaction date properly to avoid timezone issues
        const transactionDate = new Date(record.transaction_date + 'T00:00:00');
        const categoryName = record.expense_categories?.display_name || 'Other';
        const description = record.description || '-';
        const amount = formatNumber(record.amount);

        return `
            <tr data-record-id="${record.id}">
                <td>
                    <div class="text-muted">${transactionDate.toLocaleDateString('id-ID', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        timeZone: 'Asia/Makassar'
                    })}</div>
                </td>
                <td>
                    <span class="badge category-badge bg-secondary-lt">
                        ${categoryName}
                    </span>
                </td>
                <td>
                    <div class="text-truncate" style="max-width: 200px;" title="${description}">
                        ${description}
                    </div>
                </td>
                <td class="text-end amount-cell text-danger">
                    Rp ${amount}
                </td>
                <td>
                    <div class="btn-list flex-nowrap">
                        <button class="btn btn-sm btn-outline-primary edit-record-btn" data-record-id="${record.id}" title="Edit">
                            <svg xmlns="http://www.w3.org/2000/svg" class="icon" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
                                <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                                <path d="M7 7h-1a2 2 0 0 0 -2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2 -2v-1"/>
                                <path d="M20.385 6.585a2.1 2.1 0 0 0 -2.97 -2.97l-8.415 8.385v3h3l8.385 -8.415z"/>
                                <path d="M16 5l3 3"/>
                            </svg>
                        </button>
                        <button class="btn btn-sm btn-outline-danger delete-record-btn" data-record-id="${record.id}" title="Delete">
                            <svg xmlns="http://www.w3.org/2000/svg" class="icon" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
                                <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                                <path d="M4 7l16 0"/>
                                <path d="M10 11l0 6"/>
                                <path d="M14 11l0 6"/>
                                <path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12"/>
                                <path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3"/>
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Update pagination info and controls
 */
function updatePaginationInfo() {
    // Update records count info
    const recordsInfo = document.getElementById('records-info');
    if (recordsInfo) {
        const start = ((currentPage - 1) * currentLimit) + 1;
        const end = Math.min(currentPage * currentLimit, totalRecords);
        recordsInfo.innerHTML = `
            <span id="records-count">
                Showing ${start}-${end} of ${formatNumber(totalRecords)} transactions
            </span>
        `;
    }

    // Update pagination controls
    updatePaginationControls();
}

/**
 * Update pagination controls
 */
function updatePaginationControls() {
    const pagination = document.getElementById('pagination');
    if (!pagination) return;

    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }

    let paginationHTML = '';

    // Previous button
    if (currentPage > 1) {
        paginationHTML += `
            <li class="page-item">
                <a class="page-link" href="#" onclick="goToPage(${currentPage - 1}); return false;">
                    <svg xmlns="http://www.w3.org/2000/svg" class="icon" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
                        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                        <path d="M15 6l-6 6l6 6"/>
                    </svg>
                    prev
                </a>
            </li>
        `;
    }

    // Page numbers
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    if (startPage > 1) {
        paginationHTML += `<li class="page-item"><a class="page-link" href="#" onclick="goToPage(1); return false;">1</a></li>`;
        if (startPage > 2) {
            paginationHTML += `<li class="page-item disabled"><span class="page-link">…</span></li>`;
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        const activeClass = i === currentPage ? 'active' : '';
        paginationHTML += `
            <li class="page-item ${activeClass}">
                <a class="page-link" href="#" onclick="goToPage(${i}); return false;">${i}</a>
            </li>
        `;
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHTML += `<li class="page-item disabled"><span class="page-link">…</span></li>`;
        }
        paginationHTML += `<li class="page-item"><a class="page-link" href="#" onclick="goToPage(${totalPages}); return false;">${totalPages}</a></li>`;
    }

    // Next button
    if (currentPage < totalPages) {
        paginationHTML += `
            <li class="page-item">
                <a class="page-link" href="#" onclick="goToPage(${currentPage + 1}); return false;">
                    next
                    <svg xmlns="http://www.w3.org/2000/svg" class="icon" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
                        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                        <path d="M9 6l6 6l-6 6"/>
                    </svg>
                </a>
            </li>
        `;
    }

    pagination.innerHTML = paginationHTML;
}

/**
 * Go to specific page
 */
function goToPage(page) {
    if (page < 1 || page > totalPages || page === currentPage) return;

    currentPage = page;
    updateURL();
}

/**
 * Update URL with current pagination parameters
 */
function updateURL() {
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.set('page', currentPage);
    urlParams.set('limit', currentLimit);

    const newURL = window.location.pathname + '?' + urlParams.toString();
    window.location.href = newURL;
}
