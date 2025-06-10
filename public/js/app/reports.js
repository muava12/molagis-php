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
    
    // Initialize custom period modal
    initCustomPeriodModal();
    
    // Initialize card hover effects
    initCardHoverEffects();
    
    // Initialize dropdown interactions
    initDropdownInteractions();
    
    console.log('Reports page initialized successfully');
}

/**
 * Initialize custom period modal functionality
 */
function initCustomPeriodModal() {
    const customPeriodForm = document.getElementById('custom-period-form');
    const modal = document.getElementById('custom-period-modal');
    
    if (!customPeriodForm || !modal) {
        console.warn('Custom period modal elements not found');
        return;
    }
    
    // Handle form submission
    customPeriodForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = new FormData(customPeriodForm);
        const startDate = formData.get('start_date');
        const endDate = formData.get('end_date');
        
        // Validate dates
        if (!startDate || !endDate) {
            showToast('error', 'Silakan pilih tanggal mulai dan tanggal akhir');
            return;
        }
        
        if (new Date(startDate) > new Date(endDate)) {
            showToast('error', 'Tanggal mulai tidak boleh lebih besar dari tanggal akhir');
            return;
        }
        
        // Redirect with custom period parameters
        const url = new URL(window.location.href);
        url.searchParams.set('start_date', startDate);
        url.searchParams.set('end_date', endDate);
        url.searchParams.delete('period'); // Remove period filter if exists
        
        // Close modal and redirect
        const bootstrapModal = bootstrap.Modal.getInstance(modal);
        if (bootstrapModal) {
            bootstrapModal.hide();
        }
        
        // Show loading state
        showLoadingState();
        
        // Redirect to filtered page
        window.location.href = url.toString();
    });
    
    // Reset form when modal is hidden
    modal.addEventListener('hidden.bs.modal', function() {
        customPeriodForm.reset();
    });
    
    // Set default dates when modal is shown
    modal.addEventListener('shown.bs.modal', function() {
        const today = new Date();
        const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        const startDateInput = customPeriodForm.querySelector('input[name="start_date"]');
        const endDateInput = customPeriodForm.querySelector('input[name="end_date"]');
        
        if (startDateInput && endDateInput) {
            startDateInput.value = lastWeek.toISOString().split('T')[0];
            endDateInput.value = today.toISOString().split('T')[0];
        }
    });
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
