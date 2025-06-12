/*
 * File: reports.js
 * Description: JavaScript untuk halaman reports dan analytics
 * Features: State management dengan localStorage, improved Flatpickr UX
 */

// import { showToast } from './utils.js';

// Fallback showToast function
// This function is used if a more sophisticated showToast (e.g., from a UI library) is not defined.
function showToast(title, message, type = 'success') {
    const fullMessage = `${title}: ${message}`;
    console.log(`Toast [${type}]: ${fullMessage}`);
    // Use alert as a fallback for all types if a proper toast system isn't available.
    // This ensures the user gets a visible notification.
    alert(fullMessage);
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
                const btnText = btn.querySelector('.btn-text');
                const spinner = btn.querySelector('.spinner-border');

                if (btnText) btnText.textContent = 'Search';
                if (spinner) spinner.classList.add('d-none');

                // Fallback if no structured elements
                if (!btnText && !spinner) {
                    btn.innerHTML = `
                        <svg xmlns="http://www.w3.org/2000/svg" class="icon" width="16" height="16" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
                            <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                            <path d="M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0"/>
                            <path d="M21 21l-6 -6"/>
                        </svg>
                        <span class="btn-text d-none d-lg-inline">Search</span>
                        <span class="spinner-border spinner-border-sm d-none" role="status" aria-hidden="true"></span>
                    `;
                }
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

    // Initialize copy markdown functionality
    initializeCopyMarkdown();

    // Initialize customer detail week picker and reload button
    // initializeCustomerDetailControls(); // Old picker removed, functionality integrated with main filter

    // Update customer details period display based on URL or main filter's default
    updateCustomerDetailsPeriodDisplayFromURL();

    console.log('Reports page initialized successfully');
}

/**
 * Initialize customer detail week picker and reload button
 */
function initializeCustomerDetailControls() {
    // const customerDetailWeekPickerEl = document.getElementById('customer-detail-week-picker');
    // if (customerDetailWeekPickerEl) {
    //     const urlParams = new URLSearchParams(window.location.search);
    //     const currentCustomerWeek = urlParams.get('customer_week'); // e.g., "2024-W30"

    //     // Attempt to format for Flatpickr's weekSelect plugin if it expects YYYY-MM-DD for defaultDate
    //     // Or, if it directly supports "YYYY-Www", that's simpler.
    //     // For weekSelect, it usually derives week from a specific date.
    //     // Let's default to current date for the picker if no param, which weekSelect handles.
    //     let defaultDateForPicker = new Date();
    //     if (currentCustomerWeek) {
    //         try {
    //             const parts = currentCustomerWeek.match(/(\d{4})-W(\d{1,2})/);
    //             if (parts && parts.length === 3) {
    //                 const year = parseInt(parts[1], 10);
    //                 const weekNum = parseInt(parts[2], 10);
    //                 // Get the first day of that week (Monday)
    //                 const d = new Date(year, 0, 1 + (weekNum - 1) * 7);
    //                 const day = d.getDay();
    //                 const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust if day is Sunday
    //                 defaultDateForPicker = new Date(d.setDate(diff));
    //             }
    //         } catch (e) {
    //             console.warn("Could not parse 'customer_week' parameter for defaultDate:", currentCustomerWeek, e);
    //         }
    //     }

    //     flatpickr(customerDetailWeekPickerEl, {
    //         dateFormat: 'Y-W', // Format to match ISO week (Year-WWeekNumber)
    //         weekNumbers: true,
    //         locale: 'id',
    //         defaultDate: defaultDateForPicker,
    //         onChange: function(selectedDates, dateStr, instance) {
    //             if (dateStr) {
    //                 // dateStr from this format is YYYY-Www (e.g., "2024-W32")
    //                 const newUrl = new URL(window.location.href);
    //                 newUrl.searchParams.set('customer_week', dateStr);
    //                 // Remove other date params if they exist to avoid conflict
    //                 newUrl.searchParams.delete('start_date');
    //                 newUrl.searchParams.delete('end_date');
    //                 newUrl.searchParams.delete('period');
    //                 window.location.href = newUrl.toString();
    //             }
    //         }
    //     });
    //     console.log('Customer detail week picker initialized. Default date attempt:', defaultDateForPicker);
    // } else {
    //     console.log('Customer detail week picker element not found.');
    // }

    // const customerDetailReloadBtn = document.getElementById('customer-detail-reload-btn');
    // if (customerDetailReloadBtn) {
    //     customerDetailReloadBtn.addEventListener('click', function() {
    //         const weekPickerValue = customerDetailWeekPickerEl ? customerDetailWeekPickerEl.value : null;
    //         const newUrl = new URL(window.location.href);

    //         if (weekPickerValue && weekPickerValue.match(/\d{4}-W\d{1,2}/)) {
    //             newUrl.searchParams.set('customer_week', weekPickerValue);
    //              // Remove other date params if they exist to avoid conflict
    //             newUrl.searchParams.delete('start_date');
    //             newUrl.searchParams.delete('end_date');
    //             newUrl.searchParams.delete('period');
    //         } else {
    //             // If picker is empty or invalid, maybe reload without this specific param
    //             // or with default (current week), or do nothing.
    //             // For simplicity, if it's invalid/empty, we might just reload current URL state
    //             // or remove the param if it exists.
    //             newUrl.searchParams.delete('customer_week');
    //             console.log('Customer week picker value is empty or invalid, reloading without it or with existing params.');
    //         }
    //         window.location.href = newUrl.toString();
    //     });
    //     console.log('Customer detail reload button initialized.');
    // } else {
    //     console.log('Customer detail reload button not found.');
    // }
    console.log('initializeCustomerDetailControls() is now disabled as the dedicated week picker was removed.');
}

/**
 * Initialize copy markdown functionality
 */
function initializeCopyMarkdown() {
    const copyBtn = document.getElementById('copyMarkdownBtn');
    if (copyBtn) {
        copyBtn.addEventListener('click', copyAsMarkdown);
        console.log('Copy markdown button initialized');
    } else {
        console.log('Copy markdown button not found');
    }
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
        const btnText = applyBtn.querySelector('.btn-text');
        const spinner = applyBtn.querySelector('.spinner-border');

        if (btnText) btnText.textContent = 'Loading...';
        if (spinner) spinner.classList.remove('d-none');

        // Fallback if no structured elements
        if (!btnText && !spinner) {
            applyBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" class="icon" width="16" height="16" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
                  <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                  <path d="M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0"/>
                  <path d="M21 21l-6 -6"/>
                </svg>
                <span class="spinner-border spinner-border-sm d-none" role="status" aria-hidden="true"></span>
                <span class="btn-text d-none d-lg-inline">Loading...</span>
            `;
        }
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
 * Copy financial overview as Markdown
 */
function copyAsMarkdown() {
    try {
        // Get period info
        const periodElement = document.querySelector('.badge.rounded-pill');
        const period = periodElement ? periodElement.textContent.trim() : 'Periode tidak diketahui';

        // Get all financial data from DOM
        const financialData = extractFinancialDataFromDOM();

        // Generate markdown
        const markdown = generateFinancialMarkdown(period, financialData);

        // Copy to clipboard
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(markdown).then(() => {
                // Success!
                showToast('Berhasil', 'Laporan keuangan disalin ke clipboard!', 'success');
            }).catch(err => {
                // Error copying
                console.error('Failed to copy markdown to clipboard:', err);
                showToast('Gagal', 'Gagal menyalin laporan ke clipboard.', 'error');
            });
        } else {
            // Fallback for older browsers if navigator.clipboard is not supported
            console.warn('navigator.clipboard.writeText not supported.');
            // Attempt to use a textarea fallback for copying (basic)
            try {
                const textArea = document.createElement("textarea");
                textArea.value = markdown;
                textArea.style.position = "fixed";  // Prevent scrolling to bottom of page in MS Edge.
                textArea.style.left = "-9999px";
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                showToast('Berhasil (Fallback)', 'Laporan keuangan disalin ke clipboard!', 'success');
            } catch (fallbackErr) {
                console.error('Fallback copy method failed:', fallbackErr);
                showToast('Gagal', 'Copy to clipboard not supported by this browser and fallback failed.', 'error');
            }
        }
    } catch (error) {
        console.error('Error copying markdown:', error);
        showToast('Error', 'Terjadi kesalahan saat menyalin data.', 'error');
    }
}

/**
 * Extract financial data from DOM elements
 */
function extractFinancialDataFromDOM() {
    const data = {};

    // Revenue section
    const revenueSection = document.querySelector('[data-section="revenue"]');
    if (revenueSection) {
        const revenueItems = revenueSection.querySelectorAll('.list-group-item');
        data.productRevenue = revenueItems[0]?.querySelector('strong')?.textContent?.trim() || 'N/A';
        data.deliveryRevenue = revenueItems[1]?.querySelector('strong')?.textContent?.trim() || 'N/A';
        data.totalRevenue = revenueSection.querySelector('.border strong:last-child')?.textContent?.trim() || 'N/A';
    }

    // COGS section
    const cogsSection = document.querySelector('[data-section="cogs"]');
    if (cogsSection) {
        data.productCost = cogsSection.querySelector('.text-orange')?.textContent?.trim() || 'N/A';
    }

    // Gross profit section
    const grossProfitSection = document.querySelector('[data-section="gross-profit"]');
    if (grossProfitSection) {
        data.grossProfit = grossProfitSection.querySelector('.h4')?.textContent?.trim() || 'N/A';
        const marginText = grossProfitSection.querySelector('small')?.textContent || '';
        const marginMatch = marginText.match(/(\d+(?:\.\d+)?)%/);
        data.grossMargin = marginMatch ? marginMatch[1] + '%' : 'N/A';
    }

    // Operating expenses section
    const opexSection = document.querySelector('[data-section="operating-expenses"]');
    if (opexSection) {
        const opexItems = opexSection.querySelectorAll('.list-group-item');
        data.deliveryCost = opexItems[0]?.querySelector('.text-muted')?.textContent?.trim() || 'N/A';
        data.otherExpenses = opexItems[1]?.querySelector('.text-muted')?.textContent?.trim() || 'N/A';
        data.totalOperatingExpenses = opexSection.querySelector('.border strong:last-child')?.textContent?.trim() || 'N/A';
    }

    // Net profit breakdown section
    const netProfitBreakdownSection = document.querySelector('[data-section="net-profit-breakdown"]');
    if (netProfitBreakdownSection) {
        const profitItems = netProfitBreakdownSection.querySelectorAll('.list-group-item');
        data.dailyCateringProfit = profitItems[0]?.querySelector('strong')?.textContent?.trim() || 'N/A';
        data.eventCateringProfit = profitItems[1]?.querySelector('strong')?.textContent?.trim() || 'N/A';
        data.deliveryProfit = profitItems[2]?.querySelector('strong')?.textContent?.trim() || 'N/A';
    }

    // Net profit section
    const netProfitSection = document.querySelector('[data-section="net-profit"]');
    if (netProfitSection) {
        data.netProfit = netProfitSection.querySelector('.h3')?.textContent?.trim() || 'N/A';
        const marginText = netProfitSection.querySelector('small')?.textContent || '';
        const marginMatch = marginText.match(/(\d+(?:\.\d+)?)%/);
        data.netMargin = marginMatch ? marginMatch[1] + '%' : 'N/A';
    }

    return data;
}

/**
 * Generate formatted markdown from financial data
 */
function generateFinancialMarkdown(period, data) {
    const currentDate = new Date().toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    return `# 📊 Overview Keuangan

**${period}**
*Laporan dibuat: ${currentDate}*

---

## 💰 Pendapatan (Revenue)

| Kategori | Jumlah |
|----------|--------|
| 🍱 Pendapatan Catering Harian | ${data.productRevenue} |
| 🚚 Pendapatan Jasa Kirim (Ongkir) | ${data.deliveryRevenue} |
| **💰 Total Pendapatan** | **${data.totalRevenue}** |

---

## 🏭 Biaya Pokok Penjualan (COGS)

| Kategori | Jumlah |
|----------|--------|
| 🏭 Modal Catering Harian | ${data.productCost} |

---

## 💎 Laba Kotor Catering Harian

| Metrik | Nilai |
|--------|-------|
| 💎 Laba Kotor Catering | ${data.grossProfit} |
| 📈 Margin | ${data.grossMargin} |

*Formula: Pendapatan Catering Harian - Modal Produk*

---

## 💸 Biaya Operasional (Operating Expenses)

| Kategori | Jumlah |
|----------|--------|
| 🛵 Beban Jasa Kirim (Fee Kurir) | ${data.deliveryCost} |
| 🏢 Pengeluaran Operasional Lain | ${data.otherExpenses} |
| **💸 Total Biaya Operasional** | **${data.totalOperatingExpenses}** |

---

## 🔍 Rincian Laba Bersih per Lini Bisnis

| Lini Bisnis | Laba Bersih |
|-------------|-------------|
| 🍱 Laba Catering Harian | ${data.dailyCateringProfit} |
| 🎉 Laba Catering Event | ${data.eventCateringProfit} |
| 🚚 Laba Bersih Pengiriman | ${data.deliveryProfit} |

---

## 🏆 Laba Bersih Total (Net Profit)

| Metrik | Nilai |
|--------|-------|
| 🏆 Laba Bersih Total | ${data.netProfit} |
| 📊 Margin | ${data.netMargin} |

*Formula: Laba Catering Harian + Laba Event + Laba Pengiriman*

---

*Laporan ini dibuat secara otomatis dari sistem Molagis*`;
}

/**
 * Initialize customer details functionality
 */
function initializeCustomerDetails() {
    console.log('Initializing customer details functionality...');

    // Initialize search functionality
    const searchInput = document.getElementById('customer-search');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(filterCustomers, 300));
    }

    // Initialize sort functionality
    const sortSelect = document.getElementById('customer-sort');
    if (sortSelect) {
        sortSelect.addEventListener('change', sortCustomers);
    }

    // Initialize filter functionality
    const filterSelect = document.getElementById('customer-filter');
    if (filterSelect) {
        filterSelect.addEventListener('change', filterCustomers);
    }

    // Initialize clear filters button
    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', clearAllFilters);
    }

    // Initialize refresh button
    const refreshBtn = document.getElementById('refresh-customer-data-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', refreshCustomerData);
    }

    // Initialize export buttons
    const exportExcelBtn = document.getElementById('export-excel-btn');
    const exportPdfBtn = document.getElementById('export-pdf-btn');
    
    if (exportExcelBtn) {
        exportExcelBtn.addEventListener('click', function(e) {
            e.preventDefault();
            exportCustomerDataToExcel();
        });
    }

    if (exportPdfBtn) {
        exportPdfBtn.addEventListener('click', function(e) {
            e.preventDefault();
            exportCustomerDataToPDF();
        });
    }

    console.log('Customer details functionality initialized');
}

/**
 * Debounce function to limit search frequency
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Filter customers based on search and filter criteria
 */
function filterCustomers() {
    const searchTerm = document.getElementById('customer-search').value.toLowerCase();
    const filterValue = document.getElementById('customer-filter').value;
    const rows = document.querySelectorAll('#customer-orders-tbody .customer-row');

    let visibleCount = 0;

    rows.forEach(row => {
        const customerName = row.dataset.customerName;
        const customerStatus = row.dataset.status;
        
        // Check search term
        const matchesSearch = !searchTerm || customerName.includes(searchTerm);
        
        // Check filter
        let matchesFilter = true;
        switch (filterValue) {
            case 'vip':
                matchesFilter = customerStatus === 'vip';
                break;
            case 'new':
                matchesFilter = customerStatus === 'new';
                break;
            case 'active':
                matchesFilter = customerStatus === 'active';
                break;
            case 'all':
            default:
                matchesFilter = true;
                break;
        }

        const shouldShow = matchesSearch && matchesFilter;
        row.style.display = shouldShow ? '' : 'none';
        
        if (shouldShow) {
            visibleCount++;
            // Update row number
            const numberCell = row.querySelector('td:first-child');
            if (numberCell) {
                numberCell.textContent = visibleCount;
            }
        }
    });

    // Update summary if no results
    if (visibleCount === 0) {
        showNoResultsMessage();
    } else {
        hideNoResultsMessage();
    }

    // Update summary totals
    updateSummaryTotals();
}

/**
 * Sort customers based on selected criteria
 */
function sortCustomers() {
    const sortValue = document.getElementById('customer-sort').value;
    const tbody = document.getElementById('customer-orders-tbody');
    const rows = Array.from(tbody.querySelectorAll('.customer-row'));

    rows.sort((a, b) => {
        switch (sortValue) {
            case 'name_asc':
                return a.dataset.customerName.localeCompare(b.dataset.customerName);
            case 'name_desc':
                return b.dataset.customerName.localeCompare(a.dataset.customerName);
            case 'total_desc':
                const totalA = parseFloat(a.querySelector('td:nth-child(7) .fw-bold').textContent.replace(/[^\d]/g, ''));
                const totalB = parseFloat(b.querySelector('td:nth-child(7) .fw-bold').textContent.replace(/[^\d]/g, ''));
                return totalB - totalA;
            case 'total_asc':
                const totalA2 = parseFloat(a.querySelector('td:nth-child(7) .fw-bold').textContent.replace(/[^\d]/g, ''));
                const totalB2 = parseFloat(b.querySelector('td:nth-child(7) .fw-bold').textContent.replace(/[^\d]/g, ''));
                return totalA2 - totalB2;
            case 'orders_desc':
                const ordersA = parseInt(a.querySelector('td:nth-child(3) .badge').textContent.replace(/[^\d]/g, ''));
                const ordersB = parseInt(b.querySelector('td:nth-child(3) .badge').textContent.replace(/[^\d]/g, ''));
                return ordersB - ordersA;
            case 'orders_asc':
                const ordersA2 = parseInt(a.querySelector('td:nth-child(3) .badge').textContent.replace(/[^\d]/g, ''));
                const ordersB2 = parseInt(b.querySelector('td:nth-child(3) .badge').textContent.replace(/[^\d]/g, ''));
                return ordersA2 - ordersB2;
            default:
                return 0;
        }
    });

    // Re-append sorted rows
    rows.forEach((row, index) => {
        tbody.appendChild(row);
        // Update row numbers
        const numberCell = row.querySelector('td:first-child');
        if (numberCell && row.style.display !== 'none') {
            numberCell.textContent = index + 1;
        }
    });

    // Re-apply filters to update numbering
    filterCustomers();
}

/**
 * Clear all filters and search
 */
function clearAllFilters() {
    document.getElementById('customer-search').value = '';
    document.getElementById('customer-filter').value = 'all';
    document.getElementById('customer-sort').value = 'total_desc';
    
    filterCustomers();
    sortCustomers();
    
    showToast('Info', 'Filter dan pencarian telah direset', 'success');
}

/**
 * Show no results message
 */
function showNoResultsMessage() {
    let noResultsRow = document.getElementById('no-results-row');
    if (!noResultsRow) {
        const tbody = document.getElementById('customer-orders-tbody');
        noResultsRow = document.createElement('tr');
        noResultsRow.id = 'no-results-row';
        noResultsRow.innerHTML = `
            <td colspan="10" class="text-center py-4">
                <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-lg text-muted mb-2" width="48" height="48" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
                    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                    <path d="M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0"/>
                    <path d="M21 21l-6 -6"/>
                </svg>
                <div class="text-muted">Tidak ada customer yang sesuai dengan kriteria pencarian</div>
                <button class="btn btn-sm btn-outline mt-2" onclick="clearAllFilters()">Reset Filter</button>
            </td>
        `;
        tbody.appendChild(noResultsRow);
    }
    noResultsRow.style.display = '';
}

/**
 * Hide no results message
 */
function hideNoResultsMessage() {
    const noResultsRow = document.getElementById('no-results-row');
    if (noResultsRow) {
        noResultsRow.style.display = 'none';
    }
}

/**
 * Update summary totals based on visible rows
 */
function updateSummaryTotals() {
    const visibleRows = document.querySelectorAll('#customer-orders-tbody .customer-row[style=""], #customer-orders-tbody .customer-row:not([style])');
    
    let totalCustomers = visibleRows.length;
    let totalOrders = 0;
    let totalRevenue = 0;
    let totalShipping = 0;
    let totalCost = 0;
    let totalProfit = 0;

    visibleRows.forEach(row => {
        // Extract numbers from cells
        const orders = parseInt(row.querySelector('td:nth-child(3) .badge').textContent.replace(/[^\d]/g, '')) || 0;
        const revenue = parseFloat(row.querySelector('td:nth-child(4) .fw-bold').textContent.replace(/[^\d]/g, '')) || 0;
        const shipping = parseFloat(row.querySelector('td:nth-child(5) .fw-bold').textContent.replace(/[^\d]/g, '')) || 0;
        const cost = parseFloat(row.querySelector('td:nth-child(6) .fw-bold').textContent.replace(/[^\d]/g, '')) || 0;
        const profit = parseFloat(row.querySelector('td:nth-child(8) .fw-bold').textContent.replace(/[^\d]/g, '')) || 0;

        totalOrders += orders;
        totalRevenue += revenue;
        totalShipping += shipping;
        totalCost += cost;
        totalProfit += profit;
    });

    // Update summary elements
    document.getElementById('total-customers').textContent = totalCustomers;
    document.getElementById('total-orders').textContent = totalOrders;
    document.getElementById('total-revenue').textContent = 'Rp ' + totalRevenue.toLocaleString('id-ID');
    document.getElementById('total-shipping').textContent = 'Rp ' + totalShipping.toLocaleString('id-ID');
    document.getElementById('total-cost').textContent = 'Rp ' + totalCost.toLocaleString('id-ID');
    document.getElementById('total-profit').textContent = 'Rp ' + totalProfit.toLocaleString('id-ID');
}

/**
 * Refresh customer data
 */
function refreshCustomerData() {
    const refreshBtn = document.getElementById('refresh-customer-data-btn');
    if (refreshBtn) {
        // Add loading state
        refreshBtn.disabled = true;
        refreshBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-sm spinning" width="16" height="16" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                <path d="M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4"/>
                <path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4"/>
            </svg>
            <span class="d-sm-none d-lg-inline">Refreshing...</span>
        `;

        // Simulate refresh (replace with actual API call)
        setTimeout(() => {
            refreshBtn.disabled = false;
            refreshBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-sm" width="16" height="16" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
                    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                    <path d="M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4"/>
                    <path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4"/>
                </svg>
                <span class="d-sm-none d-lg-inline">Refresh</span>
            `;
            showToast('Berhasil', 'Data customer telah diperbarui', 'success');
        }, 1500);
    }
}

/**
 * View customer details (placeholder for modal or detail page)
 */
function viewCustomerDetails(customerId) {
    console.log('Viewing details for customer ID:', customerId);
    showToast('Info', `Membuka detail customer ID: ${customerId}`, 'success');
    // TODO: Implement modal or redirect to customer detail page
}

/**
 * Export individual customer data
 */
function exportCustomerData(customerId) {
    console.log('Exporting data for customer ID:', customerId);
    showToast('Info', `Mengekspor data customer ID: ${customerId}`, 'success');
    // TODO: Implement individual customer export
}

/**
 * Export all customer data to Excel
 */
function exportCustomerDataToExcel() {
    console.log('Exporting all customer data to Excel');
    showToast('Info', 'Mengekspor data ke Excel...', 'success');
    // TODO: Implement Excel export functionality
}

/**
 * Export all customer data to PDF
 */
function exportCustomerDataToPDF() {
    console.log('Exporting all customer data to PDF');
    showToast('Info', 'Mengekspor data ke PDF...', 'success');
    // TODO: Implement PDF export functionality
}

/**
 * Export functions for potential external use
 */
window.ReportsPage = {
    updateCardValues,
    formatNumber,
    formatCurrency,
    showLoadingState,
    hideLoadingState,
    copyAsMarkdown
};

// Global functions for onclick handlers
window.viewCustomerDetails = viewCustomerDetails;
window.exportCustomerData = exportCustomerData;
window.clearAllFilters = clearAllFilters;

// Function to format the date range for display in "Rincian Pesanan per Customer"
function formatDateRangeForDisplay(startDate, endDate) {
    const options = { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' };
    if (!endDate || startDate.getTime() === endDate.getTime()) { // Single date
        // If it's a single day, or if flatpickr for monthly returns just one date
        const periodTypeLabel = document.getElementById('period-type-label')?.textContent.trim().toLowerCase();
        if (periodTypeLabel === 'monthly') {
            return startDate.toLocaleDateString('id-ID', { year: 'numeric', month: 'long' });
        }
        return startDate.toLocaleDateString('id-ID', options);
    }
    // For weekly or custom range
    return `${startDate.toLocaleDateString('id-ID', options)} - ${endDate.toLocaleDateString('id-ID', options)}`;
}

// Function to update the customer details period display based on URL parameters
function updateCustomerDetailsPeriodDisplayFromURL() {
    const customerPeriodDisplay = document.getElementById('customer-details-current-period');
    if (!customerPeriodDisplay) return;

    const urlParams = new URLSearchParams(window.location.search);
    const urlStartDateStr = urlParams.get('start_date');
    const urlEndDateStr = urlParams.get('end_date');

    if (urlStartDateStr && urlEndDateStr) {
        try {
            const startDate = new Date(urlStartDateStr);
            const endDate = new Date(urlEndDateStr);

            // Adjust for time zone issues if necessary, assuming dates from URL are local
            const adjustedStartDate = new Date(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate());
            const adjustedEndDate = new Date(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate());

            const formattedDateRange = formatDateRangeForDisplay(adjustedStartDate, adjustedEndDate);
            customerPeriodDisplay.textContent = 'Periode: ' + formattedDateRange;
        } catch (e) {
            console.error("Error parsing dates from URL for customer details display:", e);
            customerPeriodDisplay.textContent = 'Periode: Rentang tidak valid';
        }
    } else {
        // Fallback if no dates in URL - try to use main flatpickr's current selection if available
        // This case should ideally be handled by the main filter defaulting and page reloading
        const mainPeriodInput = document.getElementById('period-input');
        if (mainPeriodInput && mainPeriodInput._flatpickr && mainPeriodInput._flatpickr.selectedDates.length > 0) {
            let fpStartDate = mainPeriodInput._flatpickr.selectedDates[0];
            let fpEndDate = mainPeriodInput._flatpickr.selectedDates.length > 1 ? mainPeriodInput._flatpickr.selectedDates[1] : fpStartDate;

            const periodType = document.getElementById('period-type-label')?.textContent.trim().toLowerCase();
            if (periodType === 'monthly') {
                 // For monthly, Flatpickr might just select the first day. We want the full month.
                fpStartDate = new Date(fpStartDate.getFullYear(), fpStartDate.getMonth(), 1);
                fpEndDate = new Date(fpStartDate.getFullYear(), fpStartDate.getMonth() + 1, 0);
            } else if (periodType === 'weekly' && mainPeriodInput._flatpickr.config.plugins.find(p => p.name === 'weekSelect')) {
                // If weekSelect plugin is used, it might give only the start of the week.
                // The getWeekRange function is defined inside initDynamicPeriodPicker, so not directly accessible here.
                // This part might need refinement if weekSelect doesn't set selectedDates as a range.
                // For now, assume selectedDates from weekSelect is already a range [start, end] or handled by updateInputDisplay.
            }


            const formattedDateRange = formatDateRangeForDisplay(fpStartDate, fpEndDate);
            customerPeriodDisplay.textContent = 'Periode: ' + formattedDateRange;
        } else {
            customerPeriodDisplay.textContent = 'Periode: Data Bulan Berjalan'; // Default text
        }
    }
}


document.addEventListener('DOMContentLoaded', function () {
    console.log('Initializing toggle details column script...');
    const toggleButton = document.getElementById('toggle-details-column-external');
    const table = document.getElementById('new-customer-details-table');

    console.log('Toggle button:', toggleButton);
    console.log('Table:', table);

    if (toggleButton && table) {
        const toggleButtonText = toggleButton.querySelector('.toggle-text');
        const detailHeader = table.querySelector('thead th.details-th'); // Specific class for the Details TH

        console.log('Toggle button text element:', toggleButtonText);
        console.log('Detail header (th.details-th):', detailHeader);

        if (!toggleButtonText) {
            console.error('Span with class "toggle-text" not found inside the button.');
        }
        if (!detailHeader) {
            console.error('Details column header (th.details-th) not found.');
        }

        let detailsVisible;

        // Function to update view
        const updateDetailsView = () => {
            console.log('updateDetailsView called. detailsVisible:', detailsVisible);
            const detailCells = table.querySelectorAll('.details-cell');
            console.log('Found detailCells count:', detailCells.length);

            if (detailsVisible) {
                if (toggleButtonText) toggleButtonText.textContent = 'Sembunyikan Detail';
                detailCells.forEach(cell => cell.classList.remove('d-none'));
                if (detailHeader) detailHeader.classList.remove('d-none');
            } else {
                if (toggleButtonText) toggleButtonText.textContent = 'Tampilkan Detail';
                detailCells.forEach(cell => cell.classList.add('d-none'));
                if (detailHeader) detailHeader.classList.add('d-none');
            }
        };

        // Initial state detection logic:
        if (detailHeader && getComputedStyle(detailHeader).display === 'none') {
            console.log('Initial state: detailHeader is display:none.');
            detailsVisible = false;
        } else if (!detailHeader) {
            console.error("Details header 'th.details-th' not found during initial state check!");
            detailsVisible = false; // Assume hidden if header is missing, though this is an error state
        } else {
            console.log('Initial state: detailHeader is visible or not found (error). Defaulting detailsVisible to true.');
            detailsVisible = true; // Default to visible if header exists and is not display:none
        }

        console.log('Initial detailsVisible state:', detailsVisible);
        updateDetailsView(); // Set initial button text and view based on detected state

        toggleButton.addEventListener('click', () => {
            console.log('Toggle button clicked.');
            detailsVisible = !detailsVisible;
            console.log('New detailsVisible state:', detailsVisible);
            updateDetailsView();
        });

        console.log('Toggle details column script fully initialized.');
    } else {
        console.error('Toggle button or table not found. Toggle script not fully initialized.');
    }
});
