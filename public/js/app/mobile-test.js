// Mobile interaction test utility for input order functionality
// This file helps test and debug mobile touch interactions

class MobileTestUtility {
    constructor() {
        this.touchEvents = [];
        this.clickEvents = [];
        this.isTestMode = false;
    }

    // Enable test mode to log all touch and click events
    enableTestMode() {
        this.isTestMode = true;
        this.setupEventLogging();
        console.log('Mobile test mode enabled. Touch and click events will be logged.');
    }

    // Setup event logging for debugging
    setupEventLogging() {
        // Log touch events
        document.addEventListener('touchstart', (e) => {
            this.logEvent('touchstart', e);
        }, { passive: true });

        document.addEventListener('touchmove', (e) => {
            this.logEvent('touchmove', e);
        }, { passive: true });

        document.addEventListener('touchend', (e) => {
            this.logEvent('touchend', e);
        }, { passive: true });

        // Log click events
        document.addEventListener('click', (e) => {
            this.logEvent('click', e);
        }, { passive: true });

        // Log select changes
        document.addEventListener('change', (e) => {
            if (e.target.tagName === 'SELECT') {
                this.logEvent('select-change', e);
            }
        }, { passive: true });
    }

    // Log event details
    logEvent(eventType, event) {
        if (!this.isTestMode) return;

        const eventData = {
            type: eventType,
            timestamp: Date.now(),
            target: event.target.tagName + (event.target.className ? '.' + event.target.className.split(' ').join('.') : ''),
            targetId: event.target.id || 'no-id',
            coordinates: this.getEventCoordinates(event)
        };

        if (eventType.startsWith('touch')) {
            this.touchEvents.push(eventData);
        } else {
            this.clickEvents.push(eventData);
        }

        console.log(`[${eventType}]`, eventData);
    }

    // Get coordinates from event
    getEventCoordinates(event) {
        if (event.touches && event.touches.length > 0) {
            return {
                x: event.touches[0].clientX,
                y: event.touches[0].clientY
            };
        } else if (event.clientX !== undefined) {
            return {
                x: event.clientX,
                y: event.clientY
            };
        }
        return null;
    }

    // Test date picker touch interactions
    testDatePickerTouch() {
        const datePicker = document.querySelector('.date-picker-container');
        if (!datePicker) {
            console.error('Date picker not found');
            return false;
        }

        const days = datePicker.querySelectorAll('.date-picker-day:not(.disabled)');
        if (days.length === 0) {
            console.error('No selectable days found');
            return false;
        }

        console.log(`Found ${days.length} selectable days`);
        
        // Test touch on first available day
        const firstDay = days[0];
        this.simulateTouch(firstDay);
        
        return true;
    }

    // Test select dropdown interactions
    testSelectDropdowns() {
        const selects = document.querySelectorAll('#order-form select');
        console.log(`Found ${selects.length} select elements`);
        
        selects.forEach((select, index) => {
            console.log(`Select ${index + 1}:`, {
                id: select.id,
                options: select.options.length,
                disabled: select.disabled,
                value: select.value
            });
        });

        return selects.length > 0;
    }

    // Simulate touch event for testing
    simulateTouch(element) {
        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        // Create touch events
        const touchStart = new TouchEvent('touchstart', {
            touches: [new Touch({
                identifier: 0,
                target: element,
                clientX: centerX,
                clientY: centerY
            })]
        });

        const touchEnd = new TouchEvent('touchend', {
            touches: []
        });

        console.log('Simulating touch on element:', element);
        element.dispatchEvent(touchStart);
        setTimeout(() => {
            element.dispatchEvent(touchEnd);
        }, 100);
    }

    // Get test results summary
    getTestResults() {
        return {
            touchEvents: this.touchEvents.length,
            clickEvents: this.clickEvents.length,
            lastTouchEvent: this.touchEvents[this.touchEvents.length - 1],
            lastClickEvent: this.clickEvents[this.clickEvents.length - 1]
        };
    }

    // Check if device supports touch
    isTouchDevice() {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    }

    // Get device info for debugging
    getDeviceInfo() {
        return {
            userAgent: navigator.userAgent,
            touchSupport: this.isTouchDevice(),
            screenSize: {
                width: window.screen.width,
                height: window.screen.height
            },
            viewportSize: {
                width: window.innerWidth,
                height: window.innerHeight
            },
            devicePixelRatio: window.devicePixelRatio || 1
        };
    }

    // Run comprehensive mobile test
    runMobileTest() {
        console.log('Starting mobile interaction test...');
        console.log('Device info:', this.getDeviceInfo());
        
        this.enableTestMode();
        
        // Test date picker
        const datePickerTest = this.testDatePickerTouch();
        console.log('Date picker test:', datePickerTest ? 'PASSED' : 'FAILED');
        
        // Test select dropdowns
        const selectTest = this.testSelectDropdowns();
        console.log('Select dropdown test:', selectTest ? 'PASSED' : 'FAILED');
        
        // Wait for events to be logged
        setTimeout(() => {
            console.log('Test results:', this.getTestResults());
        }, 1000);
    }
}

// Create global instance for testing
window.mobileTestUtility = new MobileTestUtility();

// Auto-run test if URL contains test parameter
if (window.location.search.includes('mobile-test=true')) {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            window.mobileTestUtility.runMobileTest();
        }, 2000);
    });
}

export default MobileTestUtility;
