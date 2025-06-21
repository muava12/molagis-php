document.addEventListener('DOMContentLoaded', () => {
    const BLUR_STATE_KEY = 'numbersBlurred';
    const BLUR_CLASS = 'blurred-text';
    const TARGET_SELECTOR = '.blur-target';

    const toggle = document.getElementById('blur-numbers-toggle');

    // Function to generate a random string of the same length as the original number
    const generateRandomChars = (length) => {
        let result = '';
        const chars = 'abcdefghijklmnopqrstuvwxyz';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    };

    // Function to apply or remove the blur effect
    const applyBlurState = (isBlurred) => {
        document.querySelectorAll(TARGET_SELECTOR).forEach(el => {
            if (isBlurred) {
                // Store original value if not already stored
                if (!el.dataset.originalValue) {
                    el.dataset.originalValue = el.textContent;
                }
                const originalText = el.dataset.originalValue;
                // Match numbers (including currency formats like Rp 1.000.000)
                const numberRegex = /[\d,.]+/g;
                let newText = originalText.replace(numberRegex, (match) => {
                    // Generate random letters for the length of the number part only
                    return generateRandomChars(match.length);
                });
                
                el.textContent = newText;
                el.classList.add(BLUR_CLASS);
            } else {
                // Restore original value if it exists
                if (el.dataset.originalValue) {
                    el.textContent = el.dataset.originalValue;
                }
                el.classList.remove(BLUR_CLASS);
            }
        });
    };
    
    // Set initial state from localStorage
    const savedState = localStorage.getItem(BLUR_STATE_KEY) === 'true';
    if (toggle) {
        toggle.checked = savedState;
    }
    applyBlurState(savedState);

    // Add event listener to the toggle
    if (toggle) {
        toggle.addEventListener('change', (e) => {
            const isBlurred = e.target.checked;
            localStorage.setItem(BLUR_STATE_KEY, isBlurred);
            applyBlurState(isBlurred);
        });
    }
}); 