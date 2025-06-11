/*
 * File: reports.js
 * Description: JavaScript untuk halaman reports dan analytics
 * Features: State management dengan localStorage, improved Flatpickr UX
 */

// import { showToast } from './utils.js';

// Fallback showToast function
function showToast(title, message, type = 'success') {
    console.log(`Toast [${type}]: ${title} - ${message}`);
    // Simple alert fallback for testing
    if (type === 'error') {
        alert(`${title}: ${message}`);
    }
}

// Constants for localStorage keys
const STORAGE_KEYS = {
    PERIOD_TYPE: 'reports_period_type',
    SELECTED_DATES: 'reports_selected_dates',
    LAST_QUERY: 'reports_last_query'
};

/**
 * Hide loading state and restore normal state - Robust implementation
 */
function hideLoadingState() {
    try {
        // Remove loading class from cards
        const cards = document.querySelectorAll('.row-cards .card');
        cards.forEach(card => {
            if (card && card.classList) {
                card.classList.remove('loading');
            }
        });

        // Restore apply buttons with correct search icon
        const applyBtn = document.getElementById('apply-period-btn');
        const applyBtnMobile = document.getElementById('apply-period-btn-mobile');

        [applyBtn, applyBtnMobile].forEach(btn => {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" class="icon" width="16" height="16" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
                        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                        <path d="M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0"/>
                        <path d="M21 21l-6 -6"/>
                    </svg>
                `;
            }
        });

        // Restore navigation buttons
        const navButtons = ['period-nav-prev', 'period-nav-today', 'period-nav-next'];
        navButtons.forEach(id => {
            const btn = document.getElementById(id);
            if (btn && btn.classList) {
                btn.disabled = false;
                btn.classList.remove('disabled', 'btn-loading');
                btn.removeAttribute('aria-busy');
            }
        });
    } catch (error) {
        console.error('Error hiding loading state:', error);
    }
}

/**
 * Initialize reports page functionality
 */
document.addEventListener('DOMContentLoaded', function() {
    initializeReportsPage();
});

/**
 * Ensure loading state is cleared when page is fully loaded
 */
window.addEventListener('load', function() {
    // Clear any loading states after page is fully loaded
    setTimeout(() => {
        hideLoadingState();
    }, 500);
});

/**
 * Main initialization function for reports page
 */
function initializeReportsPage() {
    console.log('Initializing Reports page...');

    // Hide any existing loading state
    hideLoadingState();

    // Initialize dynamic period picker with state management
    initDynamicPeriodPicker();

    // Initialize card hover effects
    initCardHoverEffects();

    // Initialize dropdown interactions
    initDropdownInteractions();

    console.log('Reports page initialized successfully');
}

/**
 * Initialize dynamic period picker with Flatpickr and state management
 */
function initDynamicPeriodPicker() {
    console.log('Starting initDynamicPeriodPicker...');

    const periodInput = document.getElementById('period-input');
    const periodInputMobile = document.getElementById('period-input-mobile');
    const periodTypeDropdown = document.getElementById('period-type-dropdown');
    const periodTypeLabel = document.getElementById('period-type-label');
    const applyBtn = document.getElementById('apply-period-btn');
    const applyBtnMobile = document.getElementById('apply-period-btn-mobile');
    const periodTypeOptions = document.querySelectorAll('.period-type-option');

    // Navigation buttons
    const navPrev = document.getElementById('period-nav-prev');
    const navToday = document.getElementById('period-nav-today');
    const navNext = document.getElementById('period-nav-next');

    console.log('Elements found:', {
        periodInput: !!periodInput,
        periodInputMobile: !!periodInputMobile,
        periodTypeDropdown: !!periodTypeDropdown,
        periodTypeLabel: !!periodTypeLabel,
        applyBtn: !!applyBtn,
        applyBtnMobile: !!applyBtnMobile,
        periodTypeOptions: periodTypeOptions.length,
        navPrev: !!navPrev,
        navToday: !!navToday,
        navNext: !!navNext
    });

    if (!periodInput || !periodTypeDropdown || !periodTypeLabel || !applyBtn) {
        console.warn('Period picker elements not found');
        return;
    }

    let currentPeriodType = 'monthly';
    let flatpickrInstance = null;
    let flatpickrInstanceMobile = null;
    let selectedDates = null;
    let isNavigating = false;

    // Initialize with state management (URL params + localStorage)
    initializeFromState();

    // Handle period type selection
    periodTypeOptions.forEach(option => {
        option.addEventListener('click', function(e) {
            e.preventDefault();
            const newPeriodType = this.dataset.period;
            changePeriodType(newPeriodType);

            // Auto-apply filter with default dates for better UX
            setTimeout(() => {
                if (selectedDates && selectedDates.length > 0) {
                    saveStateToStorage();
                    applyPeriodFilter();
                }
            }, 100);
        });
    });

    // Handle reset filter button
    const resetBtn = document.getElementById('reset-filter-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', function(e) {
            e.preventDefault();
            resetFilter();
        });
    }

    // Handle apply buttons (desktop & mobile)
    [applyBtn, applyBtnMobile].forEach(btn => {
        if (btn) {
            btn.addEventListener('click', function() {
                if (selectedDates) {
                    saveStateToStorage();
                    applyPeriodFilter();
                } else {
                    showToast('Peringatan', 'Silakan pilih periode terlebih dahulu', 'error');
                }
            });
        }
    });

    // Handle navigation buttons
    if (navPrev) {
        navPrev.addEventListener('click', function(e) {
            e.preventDefault();
            navigatePeriod('prev');
        });
    }

    if (navToday) {
        navToday.addEventListener('click', function(e) {
            e.preventDefault();
            navigatePeriod('today');
        });
    }

    if (navNext) {
        navNext.addEventListener('click', function(e) {
            e.preventDefault();
            navigatePeriod('next');
        });
    }

    /**
     * Initialize period picker based on URL parameters and localStorage
     */
    function initializeFromState() {
        const urlParams = new URLSearchParams(window.location.search);
        const urlStartDate = urlParams.get('start_date');
        const urlEndDate = urlParams.get('end_date');

        // Priority: URL params > localStorage > defaults
        if (urlStartDate && urlEndDate) {
            // URL has date parameters - use them
            currentPeriodType = determinePeriodTypeFromDates(urlStartDate, urlEndDate);
            selectedDates = [new Date(urlStartDate), new Date(urlEndDate)];
        } else {
            // Try to restore from localStorage
            const savedPeriodType = localStorage.getItem(STORAGE_KEYS.PERIOD_TYPE);
            const savedDates = localStorage.getItem(STORAGE_KEYS.SELECTED_DATES);

            if (savedPeriodType && savedDates) {
                currentPeriodType = savedPeriodType;
                try {
                    const parsedDates = JSON.parse(savedDates);
                    selectedDates = parsedDates.map(dateStr => new Date(dateStr));
                } catch (e) {
                    console.warn('Failed to parse saved dates:', e);
                    selectedDates = null;
                }
            } else {
                // Use defaults
                currentPeriodType = 'monthly';
                selectedDates = null;
            }
        }

        changePeriodType(currentPeriodType);
    }

    /**
     * Determine period type based on date range
     */
    function determinePeriodTypeFromDates(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

        // Check if it's a week (6-7 days) and starts on Monday
        if (diffDays >= 6 && diffDays <= 7 && start.getDay() === 1) {
            return 'weekly';
        }

        // Check if it's a full month
        const isFirstDay = start.getDate() === 1;
        const isLastDay = end.getDate() === new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate();
        if (isFirstDay && isLastDay && start.getMonth() === end.getMonth()) {
            return 'monthly';
        }

        return 'custom';
    }

    /**
     * Save current state to localStorage
     */
    function saveStateToStorage() {
        localStorage.setItem(STORAGE_KEYS.PERIOD_TYPE, currentPeriodType);

        if (selectedDates && selectedDates.length > 0) {
            const dateStrings = selectedDates.map(date => date.toISOString());
            localStorage.setItem(STORAGE_KEYS.SELECTED_DATES, JSON.stringify(dateStrings));
        }

        // Save query timestamp
        localStorage.setItem(STORAGE_KEYS.LAST_QUERY, new Date().toISOString());
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

        // Destroy existing Flatpickr instances
        if (flatpickrInstance) {
            flatpickrInstance.destroy();
            flatpickrInstance = null;
        }
        if (flatpickrInstanceMobile) {
            flatpickrInstanceMobile.destroy();
            flatpickrInstanceMobile = null;
        }

        // Set default dates based on type
        setDefaultDatesForType(newType);

        // Initialize new Flatpickr based on type
        initializeFlatpickr(newType);
    }

    /**
     * Set default dates based on period type
     */
    function setDefaultDatesForType(type) {
        switch (type) {
            case 'weekly':
                selectedDates = getDefaultWeekRange();
                break;
            case 'monthly':
                selectedDates = [new Date()]; // Current month
                break;
            case 'custom':
                selectedDates = getDefaultCustomRange(); // Last 7 days
                break;
        }
    }

    /**
     * Initialize Flatpickr based on period type with improved UX
     */
    function initializeFlatpickr(type) {
        console.log('Initializing Flatpickr for type:', type);

        const baseConfig = {
            locale: 'id',
            allowInput: false,
            clickOpens: true,
            onChange: function(selectedDatesArray, dateStr, instance) {
                console.log('Flatpickr onChange:', selectedDatesArray);
                selectedDates = selectedDatesArray;
                updateInputDisplay(selectedDatesArray, type);
                // Don't auto-save here, only save when user clicks apply
            }
        };

        let config = { ...baseConfig };

        switch (type) {
            case 'weekly':
                // Check if weekSelect plugin is available
                if (typeof weekSelect === 'function') {
                    config = {
                        ...baseConfig,
                        plugins: [new weekSelect({})],
                        dateFormat: '\\W\\e\\e\\k #W, Y',
                        altFormat: 'd M Y',
                        defaultDate: selectedDates && selectedDates.length > 0 ? selectedDates[0] : new Date(),
                        placeholder: 'Pilih minggu (Senin - Minggu)',
                        onChange: function(selectedDatesArray, dateStr, instance) {
                            console.log('Week selected:', selectedDatesArray);
                            // Extract the week number
                            const weekNumber = selectedDatesArray[0]
                                ? instance.config.getWeek(selectedDatesArray[0])
                                : null;
                            console.log('Week number:', weekNumber);

                            // Store the selected dates for later use
                            selectedDates = selectedDatesArray;

                            // For display purposes, show as week range
                            if (selectedDatesArray.length > 0) {
                                const weekRange = getWeekRange(selectedDatesArray[0]);
                                updateInputDisplay(weekRange, type);
                            }
                        }
                    };
                } else {
                    console.warn('weekSelect plugin not available, using fallback');
                    config = {
                        ...baseConfig,
                        mode: 'range',
                        dateFormat: 'd M Y',
                        defaultDate: selectedDates || getDefaultWeekRange(),
                        placeholder: 'Pilih minggu (Senin - Minggu)',
                        onReady: function(selectedDatesArray, dateStr, instance) {
                            console.log('Week picker ready (fallback)');
                            setupWeekSelection(instance);
                        },
                        onMonthChange: function(selectedDatesArray, dateStr, instance) {
                            setupWeekSelection(instance);
                        }
                    };
                }
                break;

            case 'monthly':
                // Check if monthSelectPlugin is available
                console.log('monthSelectPlugin type:', typeof monthSelectPlugin);
                console.log('monthSelectPlugin function:', monthSelectPlugin);

                if (typeof monthSelectPlugin === 'function') {
                    console.log('Using monthSelectPlugin');
                    config = {
                        ...baseConfig,
                        plugins: [new monthSelectPlugin({
                            shorthand: false,
                            dateFormat: 'F Y',
                            altFormat: 'F Y',
                            theme: 'light'
                        })],
                        defaultDate: selectedDates && selectedDates.length > 0 ? selectedDates[0] : new Date(),
                        placeholder: 'Pilih bulan',
                        onChange: function(selectedDatesArray, dateStr, instance) {
                            console.log('Month selected:', selectedDatesArray);
                            selectedDates = selectedDatesArray;
                            updateInputDisplay(selectedDatesArray, type);
                        }
                    };
                } else {
                    console.warn('monthSelectPlugin not available, using fallback');
                    config = {
                        ...baseConfig,
                        dateFormat: 'F Y',
                        defaultDate: selectedDates && selectedDates.length > 0 ? selectedDates[0] : new Date(),
                        placeholder: 'Pilih bulan'
                    };
                }
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

        try {
            // Initialize desktop instance
            console.log('Creating desktop Flatpickr instance');
            flatpickrInstance = flatpickr(periodInput, config);

            // Initialize mobile instance if element exists
            if (periodInputMobile) {
                console.log('Creating mobile Flatpickr instance');
                flatpickrInstanceMobile = flatpickr(periodInputMobile, config);
            }

            // Set initial dates if available
            if (selectedDates && selectedDates.length > 0) {
                console.log('Setting initial dates:', selectedDates);
                flatpickrInstance.setDate(selectedDates, true);
                if (flatpickrInstanceMobile) {
                    flatpickrInstanceMobile.setDate(selectedDates, true);
                }
                // Update display immediately
                updateInputDisplay(selectedDates, type);
            }

            console.log('Flatpickr initialized successfully');
        } catch (error) {
            console.error('Error initializing Flatpickr:', error);
        }
    }

    /**
     * Setup simple week selection for Flatpickr
     */
    function setupWeekSelection(instance) {
        const calendar = instance.calendarContainer;

        function handleWeekClick(e) {
            if (!e.target.classList.contains('flatpickr-day')) return;

            e.preventDefault();
            e.stopPropagation();

            const clickedDate = new Date(e.target.dateObj);
            const weekRange = getWeekRange(clickedDate);

            // Set the week range
            instance.setDate(weekRange, true);

            // Close the calendar
            setTimeout(() => {
                instance.close();
            }, 100);
        }

        // Remove existing listener to avoid duplicates
        calendar.removeEventListener('click', handleWeekClick);
        // Add click listener
        calendar.addEventListener('click', handleWeekClick);
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
     * Navigate period (prev/next/today) - Robust implementation
     */
    function navigatePeriod(direction) {
        try {
            console.log('Navigating period:', direction, 'Current type:', currentPeriodType);

            // Prevent multiple rapid clicks
            if (isNavigating) {
                console.log('Navigation already in progress, skipping');
                return;
            }

            isNavigating = true;

            // Ensure we have valid dates
            if (!selectedDates || selectedDates.length === 0) {
                console.log('No selected dates, setting defaults');
                setDefaultDatesForType(currentPeriodType);
            }

            // Add loading state to navigation buttons
            setNavigationLoadingState(true);

            let newDates;
            const currentDate = selectedDates && selectedDates.length > 0 ? selectedDates[0] : new Date();

            switch (currentPeriodType) {
                case 'weekly':
                    newDates = navigateWeek(currentDate, direction);
                    break;
                case 'monthly':
                    newDates = navigateMonth(currentDate, direction);
                    break;
                case 'custom':
                    newDates = navigateCustom(currentDate, direction);
                    break;
                default:
                    console.warn('Unknown period type:', currentPeriodType);
                    newDates = null;
            }

            if (newDates && newDates.length > 0) {
                selectedDates = newDates;

                // Update both instances safely
                try {
                    if (flatpickrInstance && typeof flatpickrInstance.setDate === 'function') {
                        flatpickrInstance.setDate(newDates, true);
                    }
                    if (flatpickrInstanceMobile && typeof flatpickrInstanceMobile.setDate === 'function') {
                        flatpickrInstanceMobile.setDate(newDates, true);
                    }
                } catch (flatpickrError) {
                    console.warn('Error updating Flatpickr instances:', flatpickrError);
                }

                // Update display
                updateInputDisplay(newDates, currentPeriodType);

                // Auto-apply the new period with delay
                setTimeout(() => {
                    try {
                        saveStateToStorage();
                        applyPeriodFilter();
                    } catch (applyError) {
                        console.error('Error applying filter:', applyError);
                    } finally {
                        // Always reset navigation state
                        isNavigating = false;
                        setNavigationLoadingState(false);
                    }
                }, 200);
            } else {
                console.warn('Failed to generate new dates for navigation');
                isNavigating = false;
                setNavigationLoadingState(false);
            }

        } catch (error) {
            console.error('Error in navigatePeriod:', error);
            isNavigating = false;
            setNavigationLoadingState(false);
        }
    }

    /**
     * Set loading state for navigation buttons - Robust implementation
     */
    function setNavigationLoadingState(isLoading) {
        try {
            const buttons = [
                document.getElementById('period-nav-prev'),
                document.getElementById('period-nav-today'),
                document.getElementById('period-nav-next')
            ];

            buttons.forEach(btn => {
                if (btn && btn.classList) {
                    if (isLoading) {
                        btn.disabled = true;
                        btn.classList.add('disabled');
                        btn.setAttribute('aria-busy', 'true');
                    } else {
                        btn.disabled = false;
                        btn.classList.remove('disabled');
                        btn.removeAttribute('aria-busy');
                    }
                }
            });
        } catch (error) {
            console.error('Error setting navigation loading state:', error);
        }
    }

    /**
     * Navigate week periods - Robust implementation
     */
    function navigateWeek(currentDate, direction) {
        try {
            const date = new Date(currentDate);

            // Validate date
            if (isNaN(date.getTime())) {
                console.warn('Invalid date for week navigation, using current date');
                return getDefaultWeekRange();
            }

            switch (direction) {
                case 'prev':
                    date.setDate(date.getDate() - 7);
                    break;
                case 'next':
                    date.setDate(date.getDate() + 7);
                    break;
                case 'today':
                    return getDefaultWeekRange();
                default:
                    console.warn('Unknown direction for week navigation:', direction);
                    return getDefaultWeekRange();
            }

            return getWeekRange(date);
        } catch (error) {
            console.error('Error in navigateWeek:', error);
            return getDefaultWeekRange();
        }
    }

    /**
     * Navigate month periods - Robust implementation
     */
    function navigateMonth(currentDate, direction) {
        try {
            const date = new Date(currentDate);

            // Validate date
            if (isNaN(date.getTime())) {
                console.warn('Invalid date for month navigation, using current date');
                return [new Date()];
            }

            switch (direction) {
                case 'prev':
                    date.setMonth(date.getMonth() - 1);
                    break;
                case 'next':
                    date.setMonth(date.getMonth() + 1);
                    break;
                case 'today':
                    return [new Date()];
                default:
                    console.warn('Unknown direction for month navigation:', direction);
                    return [new Date()];
            }

            return [date];
        } catch (error) {
            console.error('Error in navigateMonth:', error);
            return [new Date()];
        }
    }

    /**
     * Navigate custom periods - Robust implementation
     */
    function navigateCustom(currentDate, direction) {
        try {
            const startDate = new Date(selectedDates && selectedDates[0] ? selectedDates[0] : currentDate);
            const endDate = new Date(selectedDates && selectedDates[1] ? selectedDates[1] : currentDate);

            // Validate dates
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                console.warn('Invalid dates for custom navigation, using default range');
                return getDefaultCustomRange();
            }

            const daysDiff = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)));

            switch (direction) {
                case 'prev':
                    startDate.setDate(startDate.getDate() - daysDiff - 1);
                    endDate.setDate(endDate.getDate() - daysDiff - 1);
                    break;
                case 'next':
                    startDate.setDate(startDate.getDate() + daysDiff + 1);
                    endDate.setDate(endDate.getDate() + daysDiff + 1);
                    break;
                case 'today':
                    return getDefaultCustomRange();
                default:
                    console.warn('Unknown direction for custom navigation:', direction);
                    return getDefaultCustomRange();
            }

            return [startDate, endDate];
        } catch (error) {
            console.error('Error in navigateCustom:', error);
            return getDefaultCustomRange();
        }
    }

    /**
     * Update input display based on selected dates and type
     */
    function updateInputDisplay(dates, type) {
        if (!dates || dates.length === 0) {
            periodInput.value = '';
            if (periodInputMobile) periodInputMobile.value = '';
            return;
        }

        const formatDate = (date) => {
            return date.toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
        };

        let displayValue = '';

        switch (type) {
            case 'weekly':
                if (dates.length === 2) {
                    displayValue = `${formatDate(dates[0])} - ${formatDate(dates[1])}`;
                }
                break;

            case 'monthly':
                if (dates.length === 1) {
                    displayValue = dates[0].toLocaleDateString('id-ID', {
                        month: 'long',
                        year: 'numeric'
                    });
                }
                break;

            case 'custom':
                if (dates.length === 2) {
                    displayValue = `${formatDate(dates[0])} - ${formatDate(dates[1])}`;
                } else if (dates.length === 1) {
                    displayValue = formatDate(dates[0]);
                }
                break;
        }

        // Update both desktop and mobile inputs
        periodInput.value = displayValue;
        if (periodInputMobile) {
            periodInputMobile.value = displayValue;
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
     * Apply period filter and redirect with state preservation
     */
    function applyPeriodFilter() {
        if (!selectedDates || selectedDates.length === 0) {
            showToast('Peringatan', 'Silakan pilih periode terlebih dahulu', 'error');
            return;
        }

        const url = new URL(window.location.href);
        url.searchParams.delete('period');
        url.searchParams.delete('start_date');
        url.searchParams.delete('end_date');

        switch (currentPeriodType) {
            case 'weekly':
                if (selectedDates.length >= 1) {
                    // For weekSelect plugin, convert single date to week range
                    const weekRange = selectedDates.length === 1
                        ? getWeekRange(selectedDates[0])
                        : selectedDates;

                    const startDate = formatDateLocal(weekRange[0]);
                    const endDate = formatDateLocal(weekRange[1]);
                    url.searchParams.set('start_date', startDate);
                    url.searchParams.set('end_date', endDate);
                }
                break;

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

        // Save state before redirect
        saveStateToStorage();

        // Show loading state
        showLoadingState();

        // Redirect to filtered page
        window.location.href = url.toString();
    }

    /**
     * Clear saved state (for reset functionality)
     */
    function clearSavedState() {
        localStorage.removeItem(STORAGE_KEYS.PERIOD_TYPE);
        localStorage.removeItem(STORAGE_KEYS.SELECTED_DATES);
        localStorage.removeItem(STORAGE_KEYS.LAST_QUERY);
    }

    /**
     * Reset filter to default state
     */
    function resetFilter() {
        // Clear saved state
        clearSavedState();

        // Reset to default values
        currentPeriodType = 'monthly';
        selectedDates = null;

        // Update UI
        changePeriodType(currentPeriodType);

        // Hide state indicator
        const stateIndicator = document.getElementById('state-indicator');
        if (stateIndicator) {
            stateIndicator.classList.add('d-none');
        }

        // Show confirmation
        showToast('Info', 'Filter telah direset ke default', 'success');

        // Redirect to clean URL
        const url = new URL(window.location.href);
        url.searchParams.delete('start_date');
        url.searchParams.delete('end_date');
        url.searchParams.delete('period');

        if (url.toString() !== window.location.href) {
            window.location.href = url.toString();
        }
    }

    // Expose functions for external use
    window.ReportsPeriodPicker = {
        clearSavedState,
        saveStateToStorage,
        resetFilter
    };

    // Show state restoration notification if applicable
    const lastQueryInfo = getLastQueryInfo();
    if (lastQueryInfo && lastQueryInfo.isRecent) {
        setTimeout(() => {
            showStateRestoredNotification(lastQueryInfo.periodType, lastQueryInfo.timestamp);
        }, 500);
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

    // Disable apply button during loading
    const applyBtn = document.getElementById('apply-period-btn');
    if (applyBtn) {
        applyBtn.disabled = true;
        applyBtn.innerHTML = `
            <div class="spinner-border spinner-border-sm me-2" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            Memuat...
        `;
    }

    // Show loading toast
    showToast('Loading', 'Memuat data...', 'success');
}



/**
 * Show state restoration notification
 */
function showStateRestoredNotification(periodType, lastQuery) {
    const lastQueryInfo = getLastQueryInfo();
    if (lastQueryInfo && lastQueryInfo.isRecent) {
        const timeAgo = getTimeAgo(lastQueryInfo.timestamp);

        // Show toast notification
        showToast('Filter Dipulihkan', `Filter terakhir dipulihkan (${periodType}, ${timeAgo})`, 'success');

        // Show visual indicator
        const stateIndicator = document.getElementById('state-indicator');
        if (stateIndicator) {
            stateIndicator.classList.remove('d-none');
            stateIndicator.title = `Filter dipulihkan dari ${timeAgo}`;

            // Auto-hide after 5 seconds
            setTimeout(() => {
                stateIndicator.classList.add('d-none');
            }, 5000);
        }
    }
}

/**
 * Get human readable time ago
 */
function getTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffMins < 1) return 'baru saja';
    if (diffMins < 60) return `${diffMins} menit lalu`;
    if (diffHours < 24) return `${diffHours} jam lalu`;
    return 'kemarin';
}

/**
 * Get last query info from localStorage (moved from inner function)
 */
function getLastQueryInfo() {
    const lastQuery = localStorage.getItem(STORAGE_KEYS.LAST_QUERY);
    const periodType = localStorage.getItem(STORAGE_KEYS.PERIOD_TYPE);

    if (lastQuery && periodType) {
        return {
            timestamp: new Date(lastQuery),
            periodType: periodType,
            isRecent: (new Date() - new Date(lastQuery)) < 24 * 60 * 60 * 1000 // 24 hours
        };
    }

    return null;
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
    showToast('Error', 'Terjadi kesalahan saat memuat data. Silakan coba lagi.', 'error');
}

/**
 * Export functions for potential external use
 */
window.ReportsPage = {
    updateCardValues,
    formatNumber,
    formatCurrency,
    showLoadingState,
    hideLoadingState
};
