/**
 * Flatpickr Month Select Plugin
 * Allows selecting only month and year
 */
function monthSelectPlugin(config = {}) {
    const defaultConfig = {
        shorthand: false,
        dateFormat: 'F Y',
        altFormat: 'F Y'
    };

    // Merge config with defaults (for future use)
    const pluginConfig = { ...defaultConfig, ...config };
    console.log('Month select plugin config:', pluginConfig);
    
    return function(fp) {
        return {
            onReady() {
                // Hide day elements and show only month/year
                const calendarContainer = fp.calendarContainer;
                
                // Hide days container
                const daysContainer = calendarContainer.querySelector('.flatpickr-days');
                if (daysContainer) {
                    daysContainer.style.display = 'none';
                }
                
                // Create month/year selector
                createMonthYearSelector(fp, calendarContainer);
            },
            
            onMonthChange() {
                // Update selected date when month changes
                updateSelectedDate(fp);
            },
            
            onYearChange() {
                // Update selected date when year changes  
                updateSelectedDate(fp);
            }
        };
    };
    
    function createMonthYearSelector(fp, container) {
        // Create custom month/year selector
        const monthYearContainer = document.createElement('div');
        monthYearContainer.className = 'flatpickr-month-year-selector';
        monthYearContainer.style.cssText = `
            padding: 20px;
            text-align: center;
            background: white;
            border-radius: 5px;
        `;
        
        // Month selector
        const monthSelect = document.createElement('select');
        monthSelect.className = 'form-select d-inline-block me-2';
        monthSelect.style.width = 'auto';
        
        const months = [
            'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ];
        
        months.forEach((month, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = month;
            monthSelect.appendChild(option);
        });
        
        // Year selector
        const yearSelect = document.createElement('select');
        yearSelect.className = 'form-select d-inline-block';
        yearSelect.style.width = 'auto';
        
        const currentYear = new Date().getFullYear();
        for (let year = currentYear - 5; year <= currentYear + 2; year++) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearSelect.appendChild(option);
        }
        
        // Set current values
        const now = fp.selectedDates[0] || new Date();
        monthSelect.value = now.getMonth();
        yearSelect.value = now.getFullYear();
        
        // Add event listeners
        monthSelect.addEventListener('change', () => {
            fp.currentMonth = parseInt(monthSelect.value);
            updateSelectedDate(fp);
        });
        
        yearSelect.addEventListener('change', () => {
            fp.currentYear = parseInt(yearSelect.value);
            updateSelectedDate(fp);
        });
        
        monthYearContainer.appendChild(monthSelect);
        monthYearContainer.appendChild(yearSelect);
        
        // Replace days container with month/year selector
        const daysContainer = container.querySelector('.flatpickr-days');
        if (daysContainer) {
            daysContainer.parentNode.insertBefore(monthYearContainer, daysContainer);
        }
    }
    
    function updateSelectedDate(fp) {
        const selectedDate = new Date(fp.currentYear, fp.currentMonth, 1);
        fp.setDate(selectedDate, true);
    }
}

// Make it available globally
window.monthSelectPlugin = monthSelectPlugin;
