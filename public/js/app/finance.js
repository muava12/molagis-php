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
    // Add global error handler for unhandled promise rejections
    window.addEventListener('unhandledrejection', function(event) {
        console.error('Unhandled promise rejection:', event.reason);
        // Don't show toast for unhandled rejections to avoid confusion
    });

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
        // Remove existing event listeners by cloning
        const newUpdateBtn = updateRecordBtn.cloneNode(true);
        updateRecordBtn.parentNode.replaceChild(newUpdateBtn, updateRecordBtn);
        
        // Add new event listener
        newUpdateBtn.addEventListener('click', handleEditFormSubmit);
    }

    const filterForm = document.getElementById('filter-form');
    if (filterForm) {
        filterForm.addEventListener('submit', handleFilterFormSubmit);
    }

    const clearFilterBtn = document.getElementById('clear-filter-btn');
    if (clearFilterBtn) {
        clearFilterBtn.addEventListener('click', handleClearFilter);
    }

    // Initialize records per page change handler
    const recordsPerPageSelect = document.getElementById('records-per-page');
    if (recordsPerPageSelect) {
        recordsPerPageSelect.addEventListener('change', function() {
            currentLimit = parseInt(this.value);
            currentPage = 1; // Reset to first page
            updateURL();
        });
    }

    // Initialize utilities handlers
    initializeUtilities();
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
    // Use event delegation for better performance and dynamic content support
    document.addEventListener('click', function(e) {
        // Handle edit buttons
        if (e.target.closest('.edit-record-btn')) {
            e.preventDefault();
            const btn = e.target.closest('.edit-record-btn');
            const recordId = btn.dataset.recordId;
            if (recordId) {
                handleEditRecord(recordId);
            }
        }
        
        // Handle delete buttons
        if (e.target.closest('.delete-record-btn')) {
            e.preventDefault();
            const btn = e.target.closest('.delete-record-btn');
            const recordId = btn.dataset.recordId;
            if (recordId) {
                handleDeleteRecord(recordId);
            }
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

        console.log('Add response status:', response.status);
        console.log('Add response ok:', response.ok);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Add response:', result);

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
            showToast('Error', result.message || 'Failed to add transaction', 'error');
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
    console.log('handleEditRecord called with recordId:', recordId);
    
    try {
        // Get record data from the table row
        const row = document.querySelector(`tr[data-record-id="${recordId}"]`);
        if (!row) {
            console.error('Row not found for recordId:', recordId);
            showToast('Error', 'Transaction data not found', 'error');
            return;
        }

        console.log('Found row:', row);

        // Get all cells in the row
        const cells = row.querySelectorAll('td');
        console.log('Found cells:', cells.length);

        if (cells.length < 4) {
            console.error('Expected 4 cells, found:', cells.length);
            showToast('Error', 'Invalid table structure', 'error');
            return;
        }

        // Extract data with fallbacks
        let dateText = '';
        let description = '';
        let categoryText = '';
        let amountText = '';

        try {
            // Date cell (first cell)
            const dateElement = cells[0].querySelector('.text-muted');
            dateText = dateElement ? dateElement.textContent.trim() : cells[0].textContent.trim();
            
            // Description and category cell (second cell)
            const descriptionElement = cells[1].querySelector('.text-truncate');
            description = descriptionElement ? descriptionElement.textContent.trim() : cells[1].textContent.trim();
            
            const categoryElement = cells[1].querySelector('.badge');
            categoryText = categoryElement ? categoryElement.textContent.trim() : 'Other';
            
            // Amount cell (third cell)
            amountText = cells[2].textContent.trim();
            
        } catch (extractError) {
            console.error('Error extracting data from cells:', extractError);
            showToast('Error', 'Could not extract transaction data', 'error');
            return;
        }

        console.log('Extracted data:', { dateText, description, categoryText, amountText });

        // Parse date (format: dd/mm/yyyy)
        let transactionDate = '';
        try {
            const dateParts = dateText.split('/');
            if (dateParts.length === 3) {
                transactionDate = `${dateParts[2]}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}`;
            } else {
                // Try to parse as ISO date
                const date = new Date(dateText);
                if (!isNaN(date.getTime())) {
                    transactionDate = date.toISOString().split('T')[0];
                } else {
                    throw new Error('Invalid date format');
                }
            }
        } catch (dateError) {
            console.error('Date parsing error:', dateError);
            showToast('Error', 'Invalid date format', 'error');
            return;
        }

        // Parse amount (remove Rp and dots)
        let amount = '0';
        try {
            amount = amountText.replace(/[Rp\s.]/g, '').replace(',', '.');
            if (isNaN(parseFloat(amount))) {
                amount = '0';
            }
        } catch (amountError) {
            console.error('Amount parsing error:', amountError);
            amount = '0';
        }

        // Find category ID by display name
        const editCategorySelect = document.getElementById('edit-category');
        if (!editCategorySelect) {
            console.error('Edit category select not found');
            showToast('Error', 'Category dropdown not found', 'error');
            return;
        }

        let categoryId = '';
        for (const option of editCategorySelect.options) {
            if (option.textContent.trim() === categoryText) {
                categoryId = option.value;
                break;
            }
        }

        // If category not found, use first available option
        if (!categoryId && editCategorySelect.options.length > 1) {
            categoryId = editCategorySelect.options[1].value; // Skip the "Select category" option
        }

        console.log('Parsed data:', { transactionDate, amount, categoryId });

        // Populate modal form with record data
        const formElements = {
            date: document.getElementById('edit-transaction-date'),
            category: document.getElementById('edit-category'),
            amount: document.getElementById('edit-amount'),
            description: document.getElementById('edit-description'),
            recordId: document.getElementById('edit-record-id')
        };

        // Check if all form elements exist
        const missingElements = Object.entries(formElements)
            .filter(([key, element]) => !element)
            .map(([key]) => key);

        if (missingElements.length > 0) {
            console.error('Missing form elements:', missingElements);
            showToast('Error', 'Edit form elements not found', 'error');
            return;
        }

        // Set form values
        formElements.date.value = transactionDate;
        formElements.category.value = categoryId;
        formElements.amount.value = amount;
        formElements.description.value = description === '-' ? '' : description;
        formElements.recordId.value = recordId;

        // Update date picker if available
        if (editTransactionDatePicker) {
            try {
                editTransactionDatePicker.setDate(transactionDate);
            } catch (pickerError) {
                console.warn('Could not set date picker:', pickerError);
            }
        }

        // Show modal
        const modalElement = document.getElementById('edit-record-modal');
        if (!modalElement) {
            console.error('Edit modal element not found');
            showToast('Error', 'Edit modal not found', 'error');
            return;
        }

        // Try different ways to initialize Bootstrap modal
        let modal = null;
        try {
            if (window.bootstrap && window.bootstrap.Modal) {
                modal = new window.bootstrap.Modal(modalElement);
            } else if (window.tabler && window.tabler.bootstrap && window.tabler.bootstrap.Modal) {
                modal = new window.tabler.bootstrap.Modal(modalElement);
            } else if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
                modal = new bootstrap.Modal(modalElement);
            } else {
                // Fallback: show modal manually
                modalElement.style.display = 'block';
                modalElement.classList.add('show');
                modalElement.setAttribute('aria-hidden', 'false');
                document.body.classList.add('modal-open');
                
                // Add backdrop
                const backdrop = document.createElement('div');
                backdrop.className = 'modal-backdrop fade show';
                document.body.appendChild(backdrop);
                
                console.log('Modal shown using fallback method');
                return;
            }

            if (modal) {
                modal.show();
                console.log('Edit modal shown successfully');
            } else {
                throw new Error('Failed to create modal instance');
            }
        } catch (modalError) {
            console.error('Modal error:', modalError);
            showToast('Error', 'Failed to open edit modal', 'error');
        }

    } catch (error) {
        console.error('Error loading record for edit:', error);
        console.error('Error details:', error.message, error.stack);
        showToast('Error', 'An error occurred while loading data', 'error');
    }
}

/**
 * Handle delete record
 */
function handleDeleteRecord(recordId) {
    console.log('handleDeleteRecord called with recordId:', recordId);
    
    try {
        // Get record info for confirmation message
        const row = document.querySelector(`tr[data-record-id="${recordId}"]`);
        let recordInfo = '';
        
        if (row) {
            try {
                const cells = row.querySelectorAll('td');
                if (cells.length >= 3) {
                    const dateText = cells[0].querySelector('.text-muted')?.textContent.trim() || cells[0].textContent.trim();
                    const description = cells[1].querySelector('.text-truncate')?.textContent.trim() || cells[1].textContent.trim();
                    const amountText = cells[2].textContent.trim();
                    
                    recordInfo = `\n\nDate: ${dateText}\nAmount: ${amountText}\nDescription: ${description === '-' ? 'No description' : description}`;
                }
            } catch (extractError) {
                console.warn('Could not extract record info for confirmation:', extractError);
                recordInfo = `\n\nRecord ID: ${recordId}`;
            }
        } else {
            recordInfo = `\n\nRecord ID: ${recordId}`;
        }

        showConfirmation(
            'Delete Transaction',
            `Are you sure you want to delete this transaction? This action cannot be undone.${recordInfo}`,
            () => performDeleteRecord(recordId),
            'Delete'
        );
    } catch (error) {
        console.error('Error in handleDeleteRecord:', error);
        showToast('Error', 'An error occurred while preparing delete confirmation', 'error');
    }
}

/**
 * Perform actual delete operation
 */
async function performDeleteRecord(recordId) {
    console.log('performDeleteRecord called with recordId:', recordId);
    try {
        const response = await fetch(`/api/finance/records/${recordId}`, {
            method: 'DELETE',
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        });

        console.log('Delete response status:', response.status);
        const result = await response.json();
        console.log('Delete response:', result);

        if (result.success) {
            showToast('Success', result.message, 'success');

            // Reload page to update everything including summary
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } else {
            showToast('Error', result.message || 'Failed to delete transaction', 'error');
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
    console.log('showConfirmation called with:', { title, message, confirmText });
    
    try {
        const modalElement = document.getElementById('delete-confirm-modal');
        if (!modalElement) {
            console.error('Delete confirmation modal element not found');
            showToast('Error', 'Delete confirmation modal not found', 'error');
            return;
        }

        // Set modal content
        const titleElement = document.getElementById('delete-confirm-modal-title');
        const messageElement = document.getElementById('delete-confirm-modal-message');
        
        if (titleElement) titleElement.textContent = title;
        if (messageElement) messageElement.innerHTML = message.replace(/\n/g, '<br>');

        // Set up confirm button
        const confirmButton = document.getElementById('delete-confirm-modal-confirm');
        if (!confirmButton) {
            console.error('Delete confirm button not found');
            showToast('Error', 'Delete confirm button not found', 'error');
            return;
        }

        confirmButton.textContent = confirmText;
        
        // Remove existing event listeners by cloning the button
        const newConfirmButton = confirmButton.cloneNode(true);
        confirmButton.parentNode.replaceChild(newConfirmButton, confirmButton);

        // Add new event listener
        newConfirmButton.addEventListener('click', () => {
            console.log('Delete confirmation clicked');
            try {
                if (typeof onConfirm === 'function') {
                    onConfirm();
                }
            } catch (confirmError) {
                console.error('Error in confirmation callback:', confirmError);
                showToast('Error', 'An error occurred during deletion', 'error');
            }
            
            // Hide modal
            try {
                const modal = bootstrap.Modal.getInstance(modalElement);
                if (modal) {
                    modal.hide();
                } else {
                    // Fallback: hide manually
                    modalElement.style.display = 'none';
                    modalElement.classList.remove('show');
                    modalElement.setAttribute('aria-hidden', 'true');
                    document.body.classList.remove('modal-open');
                    
                    // Remove backdrop
                    const backdrop = document.querySelector('.modal-backdrop');
                    if (backdrop) {
                        backdrop.remove();
                    }
                }
            } catch (hideError) {
                console.warn('Could not hide modal properly:', hideError);
            }
        }, { once: true });

        // Show modal
        let modal = null;
        try {
            if (window.bootstrap && window.bootstrap.Modal) {
                modal = new window.bootstrap.Modal(modalElement);
            } else if (window.tabler && window.tabler.bootstrap && window.tabler.bootstrap.Modal) {
                modal = new window.tabler.bootstrap.Modal(modalElement);
            } else if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
                modal = new bootstrap.Modal(modalElement);
            } else {
                // Fallback: show modal manually
                modalElement.style.display = 'block';
                modalElement.classList.add('show');
                modalElement.setAttribute('aria-hidden', 'false');
                document.body.classList.add('modal-open');
                
                // Add backdrop
                const backdrop = document.createElement('div');
                backdrop.className = 'modal-backdrop fade show';
                document.body.appendChild(backdrop);
                
                console.log('Delete confirmation modal shown using fallback method');
                return;
            }

            if (modal) {
                modal.show();
                console.log('Delete confirmation modal shown successfully');
            } else {
                throw new Error('Failed to create delete modal instance');
            }
        } catch (modalError) {
            console.error('Delete modal error:', modalError);
            showToast('Error', 'Failed to open delete confirmation modal', 'error');
        }
        
    } catch (error) {
        console.error('Error in showConfirmation:', error);
        showToast('Error', 'An error occurred while showing confirmation modal', 'error');
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

/**
 * Handle edit form submission
 */
async function handleEditFormSubmit(e) {
    e.preventDefault();
    console.log('handleEditFormSubmit called');

    const form = document.getElementById('edit-expense-form');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    const recordId = data.record_id;

    console.log('Form data:', data);

    // Validate required fields
    if (!data.transaction_date || !data.category_id || !data.amount || !recordId) {
        console.error('Validation failed:', { transaction_date: data.transaction_date, category_id: data.category_id, amount: data.amount, recordId });
        showToast('Error', 'Please fill in all required fields', 'error');
        return;
    }

    // Validate amount
    const amount = parseFloat(data.amount);
    if (isNaN(amount) || amount <= 0) {
        console.error('Amount validation failed:', amount);
        showToast('Error', 'Amount must be a number greater than 0', 'error');
        return;
    }

    const updateBtn = document.getElementById('update-record-btn');
    const originalText = updateBtn.innerHTML;

    try {
        // Show loading state
        updateBtn.disabled = true;
        updateBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Updating...';

        const requestData = {
            transaction_date: data.transaction_date,
            category_id: data.category_id,
            amount: data.amount,
            description: data.description
        };

        console.log('Sending update request:', requestData);

        const response = await fetch(`/api/finance/records/${recordId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify(requestData)
        });

        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);

        const result = await response.json();
        console.log('Update response:', result);

        if (result.success) {
            console.log('Edit successful, showing success toast');
            showToast('Success', result.message, 'success');

            // Hide modal - try multiple approaches
            try {
                console.log('Attempting to hide modal...');
                const modalElement = document.getElementById('edit-record-modal');
                if (modalElement) {
                    console.log('Modal element found, trying to hide...');
                    // Try Bootstrap modal first
                    if (window.bootstrap && window.bootstrap.Modal) {
                        console.log('Using window.bootstrap.Modal');
                        const modal = window.bootstrap.Modal.getInstance(modalElement);
                        if (modal) {
                            console.log('Found existing modal instance, hiding...');
                            modal.hide();
                        } else {
                            console.log('No existing modal instance, creating new one...');
                            // Try creating new instance
                            const newModal = new window.bootstrap.Modal(modalElement);
                            newModal.hide();
                        }
                    } else if (window.tabler && window.tabler.bootstrap && window.tabler.bootstrap.Modal) {
                        console.log('Using window.tabler.bootstrap.Modal');
                        const modal = window.tabler.bootstrap.Modal.getInstance(modalElement);
                        if (modal) {
                            modal.hide();
                        }
                    } else if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
                        console.log('Using global bootstrap.Modal');
                        const modal = bootstrap.Modal.getInstance(modalElement);
                        if (modal) {
                            modal.hide();
                        }
                    } else {
                        console.log('Using fallback manual hide method');
                        // Fallback: hide manually
                        modalElement.style.display = 'none';
                        modalElement.classList.remove('show');
                        modalElement.setAttribute('aria-hidden', 'true');
                        document.body.classList.remove('modal-open');
                        
                        // Remove backdrop
                        const backdrop = document.querySelector('.modal-backdrop');
                        if (backdrop) {
                            backdrop.remove();
                        }
                    }
                    console.log('Modal hide attempt completed');
                } else {
                    console.warn('Modal element not found');
                }
            } catch (modalError) {
                console.warn('Could not hide modal properly:', modalError);
                // Don't show error toast for modal hiding issues
            }

            // Reload page to update everything including summary
            console.log('Scheduling page reload...');
            setTimeout(() => {
                console.log('Reloading page...');
                window.location.reload();
            }, 1000);
            
            // Return early to prevent any further execution
            return;
        } else {
            console.log('Edit failed, showing error toast');
            showToast('Error', result.message || 'Failed to update transaction', 'error');
        }
    } catch (error) {
        console.error('Error updating expense:', error);
        showToast('Error', 'An error occurred while updating the transaction', 'error');
    } finally {
        // Restore button state
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
                <td colspan="4" class="text-center py-5">
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
                    <div class="text-truncate" style="max-width: 200px;" title="${description}">
                        ${description}
                    </div>
                    <div class="mt-1">
                        <span class="badge category-badge bg-secondary-lt">
                            ${categoryName}
                        </span>
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

/**
 * Initialize utilities functionality
 */
function initializeUtilities() {
    // Create label modal handlers
    initializeCreateLabelModal();
    
    // Export/Import handlers
    initializeExportImport();
}

/**
 * Initialize create label modal functionality
 */
function initializeCreateLabelModal() {
    const createLabelBtn = document.getElementById('create-label-btn');
    const createLabelForm = document.getElementById('create-label-form');
    const labelPresetColors = document.getElementById('label-preset-colors');
    const labelColor = document.getElementById('label-color');

    // Handle preset color selection
    if (labelPresetColors && labelColor) {
        labelPresetColors.addEventListener('change', function() {
            const selectedColor = this.value;
            if (selectedColor) {
                labelColor.value = selectedColor;
            }
        });
    }

    // Handle create label form submission
    if (createLabelBtn) {
        createLabelBtn.addEventListener('click', handleCreateLabel);
    }

    // Auto-generate display name from name
    const labelName = document.getElementById('label-name');
    const labelDisplayName = document.getElementById('label-display-name');
    
    if (labelName && labelDisplayName) {
        labelName.addEventListener('input', function() {
            if (!labelDisplayName.value) {
                // Auto-generate display name from name
                const displayName = this.value
                    .replace(/[_-]/g, ' ') // Replace underscore and dash with space
                    .replace(/\b\w/g, l => l.toUpperCase()); // Capitalize first letter of each word
                labelDisplayName.value = displayName;
            }
        });
    }
}

/**
 * Handle create label form submission
 */
async function handleCreateLabel() {
    const form = document.getElementById('create-label-form');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    // Validate required fields
    if (!data.name || !data.display_name) {
        showToast('Error', 'Nama label dan nama tampilan wajib diisi', 'error');
        return;
    }

    // Validate name format (no spaces, only alphanumeric and underscore)
    if (!/^[a-zA-Z0-9_]+$/.test(data.name)) {
        showToast('Error', 'Nama label hanya boleh berisi huruf, angka, dan underscore', 'error');
        return;
    }

    const createBtn = document.getElementById('create-label-btn');
    const originalText = createBtn.innerHTML;

    try {
        // Show loading state
        createBtn.disabled = true;
        createBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Membuat Label...';

        // Prepare data
        const requestData = {
            name: data.name,
            display_name: data.display_name,
            color: data.color || '#206bc4',
            description: data.description || '',
            is_active: data.is_active === 'on'
        };

        console.log('Creating label with data:', requestData);

        const response = await fetch('/api/finance/labels', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify(requestData)
        });

        const result = await response.json();
        console.log('Create label response:', result);

        if (result.success) {
            showToast('Success', 'Label berhasil dibuat', 'success');
            
            // Reset form
            form.reset();
            
            // Hide modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('create-label-modal'));
            if (modal) {
                modal.hide();
            }

            // Reload page to refresh categories
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } else {
            showToast('Error', result.message || 'Gagal membuat label', 'error');
        }
    } catch (error) {
        console.error('Error creating label:', error);
        showToast('Error', 'Terjadi kesalahan saat membuat label', 'error');
    } finally {
        // Restore button state
        createBtn.disabled = false;
        createBtn.innerHTML = originalText;
    }
}

/**
 * Initialize export/import functionality
 */
function initializeExportImport() {
    const exportBtn = document.getElementById('export-data-btn');
    const importBtn = document.getElementById('import-data-btn');

    if (exportBtn) {
        exportBtn.addEventListener('click', handleExportData);
    }

    if (importBtn) {
        importBtn.addEventListener('click', handleImportData);
    }
}

/**
 * Handle export data functionality
 */
async function handleExportData() {
    try {
        showToast('Info', 'Menyiapkan data untuk export...', 'info');

        const response = await fetch('/api/finance/export', {
            method: 'GET',
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `finance_data_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            showToast('Success', 'Data berhasil di-export', 'success');
        } else {
            showToast('Error', 'Gagal mengexport data', 'error');
        }
    } catch (error) {
        console.error('Error exporting data:', error);
        showToast('Error', 'Terjadi kesalahan saat export data', 'error');
    }
}

/**
 * Handle import data functionality
 */
function handleImportData() {
    // Create file input
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.xlsx,.xls,.csv';
    fileInput.style.display = 'none';
    
    fileInput.addEventListener('change', async function(e) {
        const file = e.target.files[0];
        if (!file) return;

        try {
            showToast('Info', 'Mengupload dan memproses data...', 'info');

            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/finance/import', {
                method: 'POST',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                showToast('Success', `Berhasil import ${result.imported_count} data`, 'success');
                
                // Reload page to show imported data
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } else {
                showToast('Error', result.message || 'Gagal import data', 'error');
            }
        } catch (error) {
            console.error('Error importing data:', error);
            showToast('Error', 'Terjadi kesalahan saat import data', 'error');
        } finally {
            // Clean up
            document.body.removeChild(fileInput);
        }
    });

    document.body.appendChild(fileInput);
    fileInput.click();
}
