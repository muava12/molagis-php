// public/js/app/batch-delete.js

const bootstrap = window.tabler?.bootstrap; // <--- ADD THIS LINE

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
            const selectedCheckboxes = document.querySelectorAll('#orders-by-name-content-wrapper .select-delivery-item:checked');
            const deliveryIdsToDelete = Array.from(selectedCheckboxes).map(cb => cb.value);

            if (deliveryIdsToDelete.length === 0) {
                console.warn('No items selected for deletion.');
                if (typeof window.batchDeleteToast !== 'undefined' && window.batchDeleteToast.hide) {
                    window.batchDeleteToast.hide();
                }
                return;
            }

            const confirmModalElement = document.getElementById('deleteDeliveryConfirmModal');
            const confirmModalMessageElement = document.getElementById('deleteDeliveryConfirmModal-message');
            const confirmModalConfirmBtn = document.getElementById('deleteDeliveryConfirmModal-confirm');

            if (!confirmModalElement || !confirmModalMessageElement || !confirmModalConfirmBtn) {
                console.error('Confirmation modal elements not found. Batch delete cannot proceed via modal. Falling back to window.confirm.');
                // Fallback to window.confirm if modal elements are not found
                if (!window.confirm(`Are you sure you want to delete ${deliveryIdsToDelete.length} selected item(s)? This action cannot be undone. (Modal not found)`)) {
                    return; // User cancelled
                }
                // If user confirms via fallback, proceed with direct fetch (original logic)
                console.log('Proceeding with deletion of delivery IDs (via fallback confirm):', deliveryIdsToDelete);
                // Duplicating fetch logic here for fallback. Consider refactoring if this becomes complex.
                fetch('/api/deliveries/batch', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                    body: JSON.stringify({ ids: deliveryIdsToDelete })
                })
                .then(response => {
                    if (!response.ok) {
                        return response.json().then(errData => { throw new Error(errData.message || `Error: ${response.status}`); });
                    }
                    return response.json();
                })
                .then(data => {
                    const successfullyDeletedIds = data.deleted_ids || deliveryIdsToDelete;
                    successfullyDeletedIds.forEach(id => {
                        document.querySelector(`#orders-by-name-content-wrapper .select-delivery-item[value="${id}"]`)?.closest('tr')?.remove();
                    });
                    const saCheckbox = document.querySelector('#orders-by-name-content-wrapper #select-all-deliveries');
                    if (saCheckbox) { saCheckbox.checked = false; saCheckbox.indeterminate = false; }
                    if (window.batchDeleteToast?.hide) window.batchDeleteToast.hide();
                    if (window.showGlobalToast) window.showGlobalToast('Success', data.message || `${successfullyDeletedIds.length} item(s) deleted.`, 'success');
                    else alert(data.message || `${successfullyDeletedIds.length} item(s) deleted.`);
                })
                .catch(error => {
                    if (window.showGlobalToast) window.showGlobalToast('Error', error.message || 'Batch delete failed.', 'error');
                    else alert(error.message || 'Batch delete failed.');
                });
                return; // End of fallback logic
            }

            const batchDeleteConfirmModal = bootstrap.Modal.getInstance(confirmModalElement) || new bootstrap.Modal(confirmModalElement);
            confirmModalMessageElement.innerHTML = `Apakah Anda yakin ingin menghapus <strong>${deliveryIdsToDelete.length}</strong> item terpilih? Tindakan ini tidak dapat dibatalkan.`;
            batchDeleteConfirmModal.show();

            const handleConfirmClick = () => {
                batchDeleteConfirmModal.hide();
                console.log('Proceeding with deletion of delivery IDs:', deliveryIdsToDelete);
                fetch('/api/deliveries/batch', {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                    body: JSON.stringify({ ids: deliveryIdsToDelete })
                })
                .then(response => {
                    if (!response.ok) {
                        return response.json().then(errData => {
                            throw new Error(errData.message || `Error deleting items. Status: ${response.status}`);
                        }).catch(() => {
                            throw new Error(`Error deleting items. Status: ${response.status} - ${response.statusText}`);
                        });
                    }
                    return response.json();
                })
                .then(data => {
                    console.log('Batch delete successful:', data);
                    const successfullyDeletedIds = data.deleted_ids || deliveryIdsToDelete;
                    successfullyDeletedIds.forEach(id => {
                        const rowToRemove = document.querySelector(`#orders-by-name-content-wrapper .select-delivery-item[value="${id}"]`)?.closest('tr');
                        if (rowToRemove) {
                            rowToRemove.remove();
                        }
                    });
                    const selectAllCheckbox = document.querySelector('#orders-by-name-content-wrapper #select-all-deliveries');
                    if (selectAllCheckbox) {
                        selectAllCheckbox.checked = false;
                        selectAllCheckbox.indeterminate = false;
                    }
                    if (typeof window.batchDeleteToast !== 'undefined' && window.batchDeleteToast.hide) {
                        window.batchDeleteToast.hide();
                    }
                    if (typeof window.showGlobalToast === 'function') {
                        window.showGlobalToast('Success', data.message || `${successfullyDeletedIds.length} item(s) deleted successfully.`, 'success');
                    } else {
                        alert(data.message || `${successfullyDeletedIds.length} item(s) deleted successfully.`);
                    }
                })
                .catch(error => {
                    console.error('Error during batch delete:', error);
                    if (typeof window.showGlobalToast === 'function') {
                        window.showGlobalToast('Error', error.message || 'An error occurred while deleting items.', 'error');
                    } else {
                        alert(error.message || 'An error occurred while deleting items.');
                    }
                });
            };

            confirmModalConfirmBtn.addEventListener('click', handleConfirmClick, { once: true });

            const handleModalDismiss = () => {
                confirmModalConfirmBtn.removeEventListener('click', handleConfirmClick);
            };
            confirmModalElement.addEventListener('hidden.bs.modal', handleModalDismiss, { once: true });
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
