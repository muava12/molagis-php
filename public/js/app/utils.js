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

    const bs = window.tabler?.bootstrap; // Use the Tabler-provided Bootstrap instance
    if (bs && bs.Toast) {
        const toastInstance = bs.Toast.getOrCreateInstance(toastElement);
        toastInstance.show();
    } else {
        console.error('Bootstrap Toast component (via window.tabler.bootstrap.Toast) not available.');
        alert(`${title}: ${message}`); // Fallback
    }
};
