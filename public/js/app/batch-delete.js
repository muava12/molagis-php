// public/js/app/batch-delete.js

import { showToast } from './utils.js';

const bootstrap = window.tabler?.bootstrap;

export function initializeBatchDeleteToast() {
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
            const activePane = document.querySelector('.tab-pane.active');
            if (!activePane) {
                console.warn('No active tab pane found for batch delete.');
                showToast('Error', 'Cannot determine active tab for batch delete.', 'error');
                return;
            }

            // Determine the active table container within the active pane
            // This assumes that one of these containers will be a child of the activePane.
            const activeTableContainer = activePane.querySelector('#orders-by-name-content-wrapper') || activePane.querySelector('#delivery_date_search_results_container');

            if (!activeTableContainer) {
                console.warn('No active table container found within the active pane.');
                showToast('Error', 'Cannot find table in active tab for batch delete.', 'error');
                return;
            }

            const selectedCheckboxes = activeTableContainer.querySelectorAll('.select-delivery-item:checked');
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
                    // Re-determine activeTableContainer for UI updates, as it might be lost in promise scope or if DOM changed.
                    // It's safer to query it again based on the active pane.
                    const currentActivePaneForFallback = document.querySelector('.tab-pane.active');
                    const currentActiveTableContainerForFallback = currentActivePaneForFallback ? (currentActivePaneForFallback.querySelector('#orders-by-name-content-wrapper') || currentActivePaneForFallback.querySelector('#delivery_date_search_results_container')) : null;

                    if (currentActiveTableContainerForFallback) {
                        successfullyDeletedIds.forEach(id => {
                            currentActiveTableContainerForFallback.querySelector(`.select-delivery-item[value="${id}"]`)?.closest('tr')?.remove();
                        });
                        const saCheckbox = currentActiveTableContainerForFallback.querySelector('#select-all-deliveries, #select-all-deliveries-by-date');
                        if (saCheckbox) { saCheckbox.checked = false; saCheckbox.indeterminate = false; }
                    } else {
                        console.warn("Fallback delete: Could not find active table container to update UI post-delete. A page reload might be needed.");
                    }
                    if (window.batchDeleteToast?.hide) window.batchDeleteToast.hide();
                    showToast('Success', data.message || `${successfullyDeletedIds.length} item(s) deleted.`, 'success');
                })
                .catch(error => {
                    showToast('Error', error.message || 'Batch delete failed.', 'error');
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

                    // Re-determine activeTableContainer for UI updates
                    const currentActivePane = document.querySelector('.tab-pane.active');
                    const currentActiveTableContainer = currentActivePane ? (currentActivePane.querySelector('#orders-by-name-content-wrapper') || currentActivePane.querySelector('#delivery_date_search_results_container')) : null;

                    if (currentActiveTableContainer) {
                        successfullyDeletedIds.forEach(id => {
                            const rowToRemove = currentActiveTableContainer.querySelector(`.select-delivery-item[value="${id}"]`)?.closest('tr');
                            if (rowToRemove) {
                                rowToRemove.remove();
                            }
                        });
                        const selectAllInActive = currentActiveTableContainer.querySelector('#select-all-deliveries, #select-all-deliveries-by-date');
                        if (selectAllInActive) {
                            selectAllInActive.checked = false;
                            selectAllInActive.indeterminate = false;
                        }
                    } else {
                        console.warn("Could not determine active table container to update UI. A page reload might be needed.");
                    }

                    if (typeof window.batchDeleteToast !== 'undefined' && window.batchDeleteToast.hide) {
                        window.batchDeleteToast.hide();
                    }
                    showToast('Success', data.message || `${successfullyDeletedIds.length} item(s) deleted successfully.`, 'success');
                })
                .catch(error => {
                    console.error('Error during batch delete:', error);
                    showToast('Error', error.message || 'An error occurred while deleting items.', 'error');
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

// Initialize the toast logic automatically when the script loads.
document.addEventListener('DOMContentLoaded', initializeBatchDeleteToast);
