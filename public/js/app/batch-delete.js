// public/js/app/batch-delete.js

function initializeBatchDeleteToast() {
    const toastElement = document.getElementById('batch-delete-toast');
    if (!toastElement) {
        // If the toast element isn't on the page, don't do anything.
        // This allows the script to be included on all pages without error.
        return;
    }

    const bootstrapToast = new bootstrap.Toast(toastElement, { autohide: false });
    const selectedCountElement = document.getElementById('selected-count');
    const deleteSelectedBtnToast = document.getElementById('delete-selected-btn-toast');
    // The close button is handled by Bootstrap's data-bs-dismiss attribute.

    function showBatchDeleteToast(count) {
        if (selectedCountElement) {
            selectedCountElement.textContent = count;
        }
        bootstrapToast.show();
    }

    function hideBatchDeleteToast() {
        bootstrapToast.hide();
    }

    if (deleteSelectedBtnToast) {
        deleteSelectedBtnToast.addEventListener('click', () => {
            // Placeholder for delete action.
            // This should ideally trigger a confirmation modal or call a delete function.
            console.log('Delete selected button clicked. Actual deletion logic needs to be implemented.');
            // For now, just hide the toast after clicking delete.
            hideBatchDeleteToast();
        });
    }

    // Expose functions to global scope or export them if using modules,
    // so they can be called from other scripts (e.g., when items are selected).
    // For example, if this script is included as a module:
    // export { showBatchDeleteToast, hideBatchDeleteToast };

    // If not using modules, you might attach them to a global object:
    window.batchDeleteToast = {
        show: showBatchDeleteToast,
        hide: hideBatchDeleteToast,
    };

    // Example: To show the toast when some items are selected (e.g., 5 items)
    // This would be called from the part of your application that handles item selection.
    // window.batchDeleteToast.show(5);
}

// Initialize the toast logic when the DOM is ready,
// or call this function from your main application script.
// document.addEventListener('DOMContentLoaded', initializeBatchDeleteToast);
// For now, we will assume this function will be called explicitly from another script
// that also handles the inclusion of the toast HTML.
