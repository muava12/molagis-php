/**
 * Month Selection Plugin for Flatpickr
 * Simplified month/year picker
 */
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = global || self, factory(global.monthSelect = {}));
}(this, (function (exports) { 'use strict';

    function monthSelect(config) {
        return function(fp) {
            const defaultConfig = {
                shorthand: false,
                dateFormat: 'F Y',
                altFormat: 'F Y'
            };
            
            const pluginConfig = Object.assign({}, defaultConfig, config);
            
            function createMonthYearPicker() {
                const container = document.createElement('div');
                container.className = 'flatpickr-month-year-container';
                container.style.cssText = `
                    padding: 1rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    background: var(--tblr-bg-surface);
                    border-bottom: 1px solid var(--tblr-border-color);
                `;
                
                // Month dropdown
                const monthSelect = document.createElement('select');
                monthSelect.className = 'flatpickr-month-select';
                monthSelect.style.cssText = `
                    appearance: none;
                    background: var(--tblr-bg-surface);
                    border: 1px solid var(--tblr-border-color);
                    border-radius: var(--tblr-border-radius);
                    color: var(--tblr-body-color);
                    cursor: pointer;
                    font-size: 0.875rem;
                    outline: none;
                    padding: 0.375rem 0.75rem;
                    min-width: 120px;
                `;
                
                // Populate months
                const months = fp.l10n.months.longhand || [
                    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
                ];
                
                months.forEach((month, index) => {
                    const option = document.createElement('option');
                    option.value = index;
                    option.textContent = month;
                    monthSelect.appendChild(option);
                });
                
                // Year input
                const yearInput = document.createElement('input');
                yearInput.type = 'number';
                yearInput.className = 'flatpickr-year-input';
                yearInput.style.cssText = `
                    background: var(--tblr-bg-surface);
                    border: 1px solid var(--tblr-border-color);
                    border-radius: var(--tblr-border-radius);
                    color: var(--tblr-body-color);
                    font-size: 0.875rem;
                    padding: 0.375rem 0.75rem;
                    text-align: center;
                    width: 80px;
                    outline: none;
                `;
                
                // Set current values
                const now = fp.selectedDates[0] || new Date();
                monthSelect.value = now.getMonth();
                yearInput.value = now.getFullYear();
                
                // Event listeners
                function updateDate() {
                    const month = parseInt(monthSelect.value);
                    const year = parseInt(yearInput.value);
                    const newDate = new Date(year, month, 1);
                    
                    fp.setDate(newDate, true);
                    fp.close();
                }
                
                monthSelect.addEventListener('change', updateDate);
                yearInput.addEventListener('change', updateDate);
                yearInput.addEventListener('keypress', function(e) {
                    if (e.key === 'Enter') {
                        updateDate();
                    }
                });
                
                container.appendChild(monthSelect);
                container.appendChild(yearInput);
                
                return container;
            }
            
            return {
                onReady: function() {
                    // Hide the calendar days
                    const daysContainer = fp.calendarContainer.querySelector('.flatpickr-days');
                    if (daysContainer) {
                        daysContainer.style.display = 'none';
                    }
                    
                    // Hide the current month display
                    const currentMonth = fp.calendarContainer.querySelector('.flatpickr-current-month');
                    if (currentMonth) {
                        currentMonth.style.display = 'none';
                    }
                    
                    // Add our custom month/year picker
                    const monthYearPicker = createMonthYearPicker();
                    fp.calendarContainer.insertBefore(monthYearPicker, fp.calendarContainer.firstChild);
                    
                    // Set date format
                    fp.config.dateFormat = pluginConfig.dateFormat;
                    fp.config.altFormat = pluginConfig.altFormat;
                },
                
                onValueUpdate: function() {
                    // Update the month/year picker when date changes
                    const monthSelect = fp.calendarContainer.querySelector('.flatpickr-month-select');
                    const yearInput = fp.calendarContainer.querySelector('.flatpickr-year-input');
                    
                    if (monthSelect && yearInput && fp.selectedDates[0]) {
                        const date = fp.selectedDates[0];
                        monthSelect.value = date.getMonth();
                        yearInput.value = date.getFullYear();
                    }
                }
            };
        };
    }

    exports.default = monthSelect;
    exports.monthSelect = monthSelect;

    Object.defineProperty(exports, '__esModule', { value: true });

})));

// Make it available globally
if (typeof window !== 'undefined') {
    window.monthSelect = monthSelect;
}
