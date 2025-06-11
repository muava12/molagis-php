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
let currentEditingId = null;

/**
 * Initialize the finance page
 */
document.addEventListener('DOMContentLoaded', function() {
    initializeDatePickers();
    initializeFormHandlers();
    initializeQuickCategories();
    initializeFilters();
    initializeTableActions();
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
}

/**
 * Initialize form handlers
 */
function initializeFormHandlers() {
    const expenseForm = document.getElementById('expense-form');
    if (expenseForm) {
        expenseForm.addEventListener('submit', handleExpenseFormSubmit);
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

        const url = currentEditingId ? `/api/finance/records/${currentEditingId}` : '/api/finance/records';
        const method = currentEditingId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
            showToast('Success', result.message, 'success');
            form.reset();
            
            // Reset date picker to today
            if (transactionDatePicker) {
                transactionDatePicker.setDate('today');
            }
            
            // Reset editing state
            currentEditingId = null;
            submitBtn.innerHTML = originalText.replace('Update', 'Save');
            
            // Reload page to show updated data
            setTimeout(() => {
                window.location.reload();
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
        const categorySelect = document.getElementById('category-select');
        let categoryId = '';
        for (const option of categorySelect.options) {
            if (option.textContent.trim() === categoryText) {
                categoryId = option.value;
                break;
            }
        }

        // Populate form with record data
        document.getElementById('transaction-date').value = transactionDate;
        document.getElementById('category-select').value = categoryId;
        document.getElementById('amount-input').value = amount;
        document.getElementById('description-input').value = description === '-' ? '' : description;
        
        // Update date picker
        if (transactionDatePicker) {
            transactionDatePicker.setDate(transactionDate);
        }
        
        // Set editing state
        currentEditingId = recordId;
        const submitBtn = document.getElementById('submit-btn');
        submitBtn.innerHTML = submitBtn.innerHTML.replace('Save', 'Update');
        
        // Scroll to form
        document.getElementById('expense-form').scrollIntoView({ behavior: 'smooth' });
        
        showToast('Info', 'Transaction data loaded for editing', 'info');
    } catch (error) {
        console.error('Error loading record for edit:', error);
        showToast('Error', 'An error occurred while loading data', 'error');
    }
}

/**
 * Handle delete record
 */
async function handleDeleteRecord(recordId) {
    if (!confirm('Are you sure you want to delete this transaction?')) {
        return;
    }

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
            
            // Remove row from table
            const row = document.querySelector(`tr[data-record-id="${recordId}"]`);
            if (row) {
                row.remove();
            }
            
            // Reload page to update summary
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } else {
            showToast('Error', result.message, 'error');
        }
    } catch (error) {
        console.error('Error deleting record:', error);
        showToast('Error', 'An error occurred while deleting the transaction', 'error');
    }
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
