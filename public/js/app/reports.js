/*
 * File: reports.js
 * Description: JavaScript untuk halaman reports dan analytics
 */

import { showToast } from './utils.js';

/**
 * Initialize reports page functionality
 */
document.addEventListener('DOMContentLoaded', function() {
    initializeReportsPage();
});

/**
 * Main initialization function for reports page
 */
function initializeReportsPage() {
    console.log('Initializing Reports page...');

    // Initialize dynamic period picker
    initDynamicPeriodPicker();

    // Initialize card hover effects
    initCardHoverEffects();

    // Initialize dropdown interactions
    initDropdownInteractions();

    console.log('Reports page initialized successfully');
}

/**
 * Initialize dynamic period picker with Flatpickr
 */
function initDynamicPeriodPicker() {
    const periodInput = document.getElementById('period-input');
    const periodTypeDropdown = document.getElementById('period-type-dropdown');
    const periodTypeLabel = document.getElementById('period-type-label');
    const applyBtn = document.getElementById('apply-period-btn');
    const periodTypeOptions = document.querySelectorAll('.period-type-option');

    if (!periodInput || !periodTypeDropdown || !periodTypeLabel || !applyBtn) {
        console.warn('Period picker elements not found');
        return;
    }

    let currentPeriodType = 'monthly';
    let flatpickrInstance = null;
    let selectedDates = null;

    // Initialize with current period type from URL
    initializeFromURL();

    // Handle period type selection
    periodTypeOptions.forEach(option => {
        option.addEventListener('click', function(e) {
            e.preventDefault();
            const newPeriodType = this.dataset.period;
            changePeriodType(newPeriodType);
        });
    });

    // Handle apply button
    applyBtn.addEventListener('click', function() {
        if (selectedDates) {
            applyPeriodFilter();
        } else {
            showToast('warning', 'Silakan pilih periode terlebih dahulu');
        }
    });

    /**
     * Initialize period picker based on current URL parameters
     */
    function initializeFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const period = urlParams.get('period');
        const startDate = urlParams.get('start_date');
        const endDate = urlParams.get('end_date');

        if (startDate && endDate) {
            currentPeriodType = 'custom';
            selectedDates = [startDate, endDate];
        } else if (period === 'weekly') {
            currentPeriodType = 'weekly';
        } else {
            currentPeriodType = 'monthly';
        }

        changePeriodType(currentPeriodType);
    }

    /**
     * Change period type and reinitialize Flatpickr
     */
    function changePeriodType(newType) {
        currentPeriodType = newType;

        // Update dropdown label
        const labels = {
            'monthly': 'Monthly',
            'weekly': 'Weekly',
            'custom': 'Custom Range'
        };
        periodTypeLabel.textContent = labels[newType];

        // Update active state
        periodTypeOptions.forEach(opt => {
            opt.classList.toggle('active', opt.dataset.period === newType);
        });

        // Destroy existing Flatpickr instance
        if (flatpickrInstance) {
            flatpickrInstance.destroy();
            flatpickrInstance = null;
        }

        // Initialize new Flatpickr based on type
        initializeFlatpickr(newType);
    }

    /**
     * Initialize Flatpickr based on period type
     */
    function initializeFlatpickr(type) {
        const baseConfig = {
            locale: 'id',
            allowInput: false,
            clickOpens: true,
            onChange: function(selectedDatesArray, dateStr, instance) {
                selectedDates = selectedDatesArray;
                updateInputDisplay(selectedDatesArray, type);
            }
        };

        let config = { ...baseConfig };

        switch (type) {
            case 'weekly':
                config = {
                    ...baseConfig,
                    mode: 'range',
                    dateFormat: 'd M Y',
                    defaultDate: getDefaultWeekRange(),
                    onReady: function(selectedDatesArray, dateStr, instance) {
                        // Custom week selection logic
                        instance.calendarContainer.addEventListener('click', function(e) {
                            if (e.target.classList.contains('flatpickr-day')) {
                                const clickedDate = new Date(e.target.dateObj);
                                const weekRange = getWeekRange(clickedDate);
                                instance.setDate(weekRange, true);
                            }
                        });
                    },
                    placeholder: 'Pilih minggu (Senin - Minggu)'
                };
                break;

            case 'monthly':
                config = {
                    ...baseConfig,
                    plugins: [monthSelectPlugin({
                        shorthand: true,
                        dateFormat: 'F Y',
                        altFormat: 'F Y'
                    })],
                    defaultDate: new Date(),
                    placeholder: 'Pilih bulan'
                };
                break;

            case 'custom':
                config = {
                    ...baseConfig,
                    mode: 'range',
                    dateFormat: 'd M Y',
                    defaultDate: selectedDates || getDefaultCustomRange(),
                    placeholder: 'Pilih rentang tanggal'
                };
                break;
        }

        flatpickrInstance = flatpickr(periodInput, config);

        // Set initial dates if available
        if (selectedDates && selectedDates.length > 0) {
            flatpickrInstance.setDate(selectedDates, true);
        }
    }

    /**
     * Get week range starting from Monday
     */
    function getWeekRange(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday

        const monday = new Date(d.setDate(diff));
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);

        return [monday, sunday];
    }

    /**
     * Get default week range (current week)
     */
    function getDefaultWeekRange() {
        return getWeekRange(new Date());
    }

    /**
     * Get default custom range (last 7 days)
     */
    function getDefaultCustomRange() {
        const today = new Date();
        const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        return [lastWeek, today];
    }

    /**
     * Update input display based on selected dates and type
     */
    function updateInputDisplay(dates, type) {
        if (!dates || dates.length === 0) {
            periodInput.value = '';
            return;
        }

        const formatDate = (date) => {
            return date.toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
        };

        switch (type) {
            case 'weekly':
                if (dates.length === 2) {
                    periodInput.value = `${formatDate(dates[0])} - ${formatDate(dates[1])}`;
                }
                break;

            case 'monthly':
                if (dates.length === 1) {
                    periodInput.value = dates[0].toLocaleDateString('id-ID', {
                        month: 'long',
                        year: 'numeric'
                    });
                }
                break;

            case 'custom':
                if (dates.length === 2) {
                    periodInput.value = `${formatDate(dates[0])} - ${formatDate(dates[1])}`;
                } else if (dates.length === 1) {
                    periodInput.value = formatDate(dates[0]);
                }
                break;
        }
    }

    /**
     * Format date to YYYY-MM-DD without timezone conversion
     */
    function formatDateLocal(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * Apply period filter and redirect
     */
    function applyPeriodFilter() {
        if (!selectedDates || selectedDates.length === 0) {
            showToast('warning', 'Silakan pilih periode terlebih dahulu');
            return;
        }

        const url = new URL(window.location.href);
        url.searchParams.delete('period');
        url.searchParams.delete('start_date');
        url.searchParams.delete('end_date');

        switch (currentPeriodType) {
            case 'weekly':
            case 'custom':
                if (selectedDates.length === 2) {
                    const startDate = formatDateLocal(selectedDates[0]);
                    const endDate = formatDateLocal(selectedDates[1]);
                    url.searchParams.set('start_date', startDate);
                    url.searchParams.set('end_date', endDate);
                }
                break;

            case 'monthly':
                if (selectedDates.length === 1) {
                    const date = selectedDates[0];
                    const startDate = new Date(date.getFullYear(), date.getMonth(), 1);
                    const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);

                    url.searchParams.set('start_date', formatDateLocal(startDate));
                    url.searchParams.set('end_date', formatDateLocal(endDate));
                }
                break;
        }

        // Show loading state
        showLoadingState();

        // Redirect to filtered page
        window.location.href = url.toString();
    }
}

/**
 * Initialize card hover effects and animations
 */
function initCardHoverEffects() {
    const cards = document.querySelectorAll('.row-cards .card');
    
    cards.forEach(card => {
        // Add smooth transition for hover effects
        card.style.transition = 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out';
        
        // Optional: Add click handler for future drill-down functionality
        card.addEventListener('click', function(e) {
            // Prevent click if clicking on dropdown
            if (e.target.closest('.dropdown')) {
                return;
            }
            
            // Future: Add drill-down functionality
            console.log('Card clicked:', card);
        });
    });
}

/**
 * Initialize dropdown interactions
 */
function initDropdownInteractions() {
    const dropdowns = document.querySelectorAll('.dropdown-toggle');
    
    dropdowns.forEach(dropdown => {
        // Add click handler for dropdown items
        const dropdownMenu = dropdown.nextElementSibling;
        if (dropdownMenu && dropdownMenu.classList.contains('dropdown-menu')) {
            const items = dropdownMenu.querySelectorAll('.dropdown-item');
            
            items.forEach(item => {
                item.addEventListener('click', function(e) {
                    // Handle period filter clicks
                    if (item.href && item.href.includes('/reports')) {
                        e.preventDefault();
                        showLoadingState();
                        window.location.href = item.href;
                    }
                });
            });
        }
    });
}

/**
 * Show loading state for page transitions
 */
function showLoadingState() {
    // Add loading class to cards
    const cards = document.querySelectorAll('.row-cards .card');
    cards.forEach(card => {
        card.classList.add('loading');
    });
    
    // Show loading toast
    showToast('info', 'Memuat data...', 1000);
}

/**
 * Format number with Indonesian locale
 */
function formatNumber(number) {
    return new Intl.NumberFormat('id-ID').format(number);
}

/**
 * Format currency with Indonesian Rupiah
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
 * Update card values (for future real-time updates)
 */
function updateCardValues(data) {
    if (!data) return;
    
    // Update total orders
    const totalOrdersElement = document.querySelector('[data-metric="total_orders"]');
    if (totalOrdersElement && data.total_orders !== undefined) {
        totalOrdersElement.textContent = formatNumber(data.total_orders);
    }
    
    // Update total revenue
    const totalRevenueElement = document.querySelector('[data-metric="total_revenue"]');
    if (totalRevenueElement && data.total_revenue !== undefined) {
        totalRevenueElement.textContent = formatCurrency(data.total_revenue);
    }
    
    // Update active customers
    const activeCustomersElement = document.querySelector('[data-metric="active_customers"]');
    if (activeCustomersElement && data.active_customers !== undefined) {
        activeCustomersElement.textContent = formatNumber(data.active_customers);
    }
    
    // Update average order value
    const avgOrderValueElement = document.querySelector('[data-metric="average_order_value"]');
    if (avgOrderValueElement && data.average_order_value !== undefined) {
        avgOrderValueElement.textContent = formatCurrency(data.average_order_value);
    }
}

/**
 * Handle API errors
 */
function handleApiError(error) {
    console.error('API Error:', error);
    showToast('error', 'Terjadi kesalahan saat memuat data. Silakan coba lagi.');
}

/**
 * Export functions for potential external use
 */
window.ReportsPage = {
    updateCardValues,
    formatNumber,
    formatCurrency,
    showLoadingState
};
