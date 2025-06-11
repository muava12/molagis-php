// public/js/app/utils.js
export function showToast(title, message, type = 'success') {
    let toastElementId;
    let titleElementId;
    let messageElementId;

    if (type === 'success') {
        toastElementId = 'toast';
        titleElementId = 'toast-title';
        messageElementId = 'toast-message';
    } else if (type === 'error') {
        toastElementId = 'toast-error';
        titleElementId = 'toast-error-title';
        messageElementId = 'toast-error-message';
    } else if (type === 'info') {
        // Use success toast for info messages
        toastElementId = 'toast';
        titleElementId = 'toast-title';
        messageElementId = 'toast-message';
    } else {
        console.error('Unknown toast type:', type);
        return;
    }

    const toastElement = document.getElementById(toastElementId);
    const titleElement = document.getElementById(titleElementId);
    const messageElement = document.getElementById(messageElementId);

    if (!toastElement || !titleElement || !messageElement) {
        console.error(`Toast elements not found for type '${type}'. DOM IDs: ${toastElementId}, ${titleElementId}, ${messageElementId}. Ensure toast.html.twig is included and IDs are correct.`);
        alert(`${title}: ${message}`); // Fallback
        return;
    }

    titleElement.textContent = title;
    messageElement.textContent = message;

    // Try multiple Bootstrap instances
    let toastInstance = null;

    if (window.bootstrap && window.bootstrap.Toast) {
        toastInstance = window.bootstrap.Toast.getOrCreateInstance(toastElement);
    } else if (window.tabler?.bootstrap?.Toast) {
        toastInstance = window.tabler.bootstrap.Toast.getOrCreateInstance(toastElement);
    } else if (typeof bootstrap !== 'undefined' && bootstrap.Toast) {
        toastInstance = bootstrap.Toast.getOrCreateInstance(toastElement);
    }

    if (toastInstance) {
        toastInstance.show();
    } else {
        console.error('Bootstrap Toast component not available. Falling back to alert.');
        alert(`${title}: ${message}`); // Fallback
    }
};

export function formatPhoneNumber(phoneNumber) {
    if (!phoneNumber) {
        return '';
    }
    // Remove non-numeric characters except '+'
    let cleaned = phoneNumber.replace(/[^\d+]/g, '');

    // If it starts with '+', assume it's already somewhat internationalized
    if (cleaned.startsWith('+')) {
        if (cleaned.startsWith('+62')) {
            // Already in +62 format, just ensure no extra chars after number
            return cleaned.replace(/[^+\d]/g, '');
        }
        // If it's something like +08 -> 08, then remove +
        cleaned = cleaned.substring(1);
    }

    // If starts with '0', replace with '62'
    if (cleaned.startsWith('0')) {
        cleaned = '62' + cleaned.substring(1);
    } else if (!cleaned.startsWith('62')) {
        // If it doesn't start with 0 or 62 (e.g. 812...), prepend 62
        cleaned = '62' + cleaned;
    }

    // Final clean to ensure only digits after potential initial '+'
    if (cleaned.startsWith('+')) {
         return '+' + cleaned.substring(1).replace(/[^\d]/g, '');
    }
    return cleaned.replace(/[^\d]/g, '');
}

export function renderErrorAlert(message, containerId = 'error-container') {
    const errorContainer = document.getElementById(containerId);
    if (!errorContainer) {
        console.error(`Error container with ID '${containerId}' not found.`);
        // Fallback to a generic alert if the container is missing
        showToast('Error', message, 'error');
        return;
    }

    // Clear previous errors
    errorContainer.innerHTML = '';

    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-danger alert-dismissible fade show';
    alertDiv.setAttribute('role', 'alert');

    // SVG icon for the alert
    const svgIcon = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon alert-icon icon-2">
            <path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0"></path>
            <path d="M12 8v4"></path>
            <path d="M12 16h.01"></path>
        </svg>`;

    alertDiv.innerHTML = `
        <div class="alert-icon">${svgIcon}</div>
        <div>
            <h4 class="alert-heading">Terjadi Kesalahan 🫤</h4>
            <div class="alert-description">${message}</div>
        </div>
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;

    errorContainer.appendChild(alertDiv);

    // Optional: Auto-dismiss after some time, though usually alerts require user action
    // setTimeout(() => {
    //     const bsAlert = new bootstrap.Alert(alertDiv);
    //     bsAlert.close();
    // }, 10000);
}

export function formatRupiah(amount, prefix = 'Rp. ') {
    if (amount === null || amount === undefined || isNaN(Number(amount))) {
        // Return empty or a placeholder if amount is not a valid number
        return prefix + '0'; // Or return '', or prefix + '-'
    }
    // Round to nearest integer, then convert to string.
    const numberString = String(Math.round(Number(amount)));

    const split = numberString.split(','); // Not typical for raw numbers, but handles if passed with comma
    const sisa = split[0].length % 3;
    let rupiah = split[0].substr(0, sisa);
    const ribuan = split[0].substr(sisa).match(/\d{3}/gi);

    if (ribuan) {
        const separator = sisa ? '.' : '';
        rupiah += separator + ribuan.join('.');
    }

    // Handle decimal part if it exists (e.g., from "12345,67")
    // For typical currency, we usually don't have comma decimals from backend for rupiah like this
    // but if needed, this could be extended. For now, assuming integer or float to be rounded.
    // rupiah = split[1] !== undefined ? rupiah + ',' + split[1] : rupiah;

    return prefix + rupiah;
}
