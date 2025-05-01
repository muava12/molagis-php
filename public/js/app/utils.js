export function renderErrorAlert(errorMessage) {
    const errorContainer = document.querySelector('#error-container');
    if (!errorContainer) {
        console.error('Error container not found');
        return;
    }
    const alert = document.createElement('div');
    alert.className = 'alert alert-danger alert-dismissible';
    alert.innerHTML = `
            <div>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="alert-icon">
                    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                    <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0"/>
                    <path d="M12 8l0 4"/>
                    <path d="M12 16l0 .01"/>
                </svg>
            </div>
            <div>
                <h4 class="alert-title">Koneksi Bermasalah 🫤</h4>
                <div class="alert-description">${errorMessage}</div>
            </div>
        <a class="btn-close" data-bs-dismiss="alert" aria-label="close"></a>
    `;
    errorContainer.innerHTML = ``;
    errorContainer.appendChild(alert);
}

export function showToast(title, message, isError = false) {
    const toastId = isError ? 'toast-error' : 'toast';
    const titleId = isError ? 'toast-error-title' : 'toast-title';
    const messageId = isError ? 'toast-error-message' : 'toast-message';
    const toast = new tabler.bootstrap.Toast(document.getElementById(toastId));
    document.getElementById(titleId).textContent = title;
    document.getElementById(messageId).textContent = message;
    toast.show();
}