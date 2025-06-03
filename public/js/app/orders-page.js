document.addEventListener('DOMContentLoaded', function () {
    const customerSearchInput = document.getElementById('customer_search_orders');
    const selectedCustomerIdHidden = document.getElementById('selected_customer_id_hidden');
    const customerSearchForm = customerSearchInput ? customerSearchInput.closest('form') : null;
    const bootstrap = window.tabler?.bootstrap;
    const contentWrapper = document.getElementById('orders-by-name-content-wrapper'); // Moved higher for access

    // Function to update the batch delete toast
    function updateBatchDeleteToast() {
        if (!contentWrapper || typeof window.batchDeleteToast === 'undefined') {
            return; // Exit if wrapper or toast functions aren't available
        }
        const selectedCheckboxes = contentWrapper.querySelectorAll('.select-delivery-item:checked');
        const selectedCount = selectedCheckboxes.length;

        if (selectedCount > 0) {
            window.batchDeleteToast.show(selectedCount);
        } else {
            window.batchDeleteToast.hide();
        }
    }

    // --- Clear and unfocus customer search input if a customer is selected (page has reloaded with results) ---
    if (selectedCustomerIdHidden && selectedCustomerIdHidden.value && customerSearchInput) {
        const currentUrlParamsForClear = new URLSearchParams(window.location.search);
        const currentViewForClear = currentUrlParamsForClear.get('view') || 'by_name';
        if (currentViewForClear === 'by_name') {
            customerSearchInput.value = '';
            customerSearchInput.blur();
            // console.log('Customer search input cleared and unfocused as a customer is selected in "by_name" view.');
        }
    }

    // Moved fetchAndUpdateOrdersView function definition higher up
    async function fetchAndUpdateOrdersView(url) {
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            if (!response.ok) {
                let errorText = `HTTP error! status: ${response.status}`;
                try {
                    const errorData = await response.json();
                    if (errorData && errorData.message) {
                        errorText = errorData.message;
                    }
                } catch (e) { /* Stick to status if JSON parse fails */ }
                throw new Error(errorText);
            }
            const html = await response.text();

            // const contentWrapper = document.getElementById('orders-by-name-content-wrapper'); // Already defined above
            if (contentWrapper) {
                contentWrapper.innerHTML = html;

                const selectAllCheckbox = contentWrapper.querySelector('#select-all-deliveries');
                if (selectAllCheckbox) {
                    selectAllCheckbox.checked = false;
                    selectAllCheckbox.indeterminate = false;
                }
                updateBatchDeleteToast(); // <--- ADD THIS
            } else {
                console.error('Error: Target content wrapper #orders-by-name-content-wrapper for AJAX update not found.');
                window.location.href = url;
                return;
            }

            if (history.pushState) {
                history.pushState({path: url}, '', url);
            } else {
                window.location.href = url;
            }

        } catch (error) {
            console.error('Error fetching or updating orders view:', error);
            window.location.href = url;
        }
    }

    if (customerSearchInput && selectedCustomerIdHidden && customerSearchForm) {
        const awesompleteInstance = new Awesomplete(customerSearchInput, {
            minChars: 2,
            autoFirst: true,
            filter: Awesomplete.FILTER_CONTAINS
        });

        fetch('/api/customers')
            .then(response => response.ok ? response.json() : Promise.reject('Failed to load customers'))
            .then(data => {
                let customerList = [];
                if (Array.isArray(data)) {
                    customerList = data.map(customer => ({ label: customer.nama, value: customer.id }));
                } else if (data && Array.isArray(data.customers)) {
                    customerList = data.customers.map(customer => ({ label: customer.nama, value: customer.id }));
                } else {
                     console.error('Awesomplete: Customer data is not in the expected array format:', data);
                }
                awesompleteInstance.list = customerList;
                if (customerList.length > 0) awesompleteInstance.evaluate();
            })
            .catch(error => console.error('Error fetching customer data for Awesomplete:', error));

        customerSearchInput.addEventListener('awesomplete-selectcomplete', function (event) {
            const selection = event.text;
            customerSearchInput.value = selection.label;
            selectedCustomerIdHidden.value = selection.value;
            customerSearchForm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true })); // Programmatically submit form
        });
    }

    // --- AJAXify Customer Search Form (within 'by_name' view) ---
    if (customerSearchForm) {
        customerSearchForm.addEventListener('submit', function(event) {
            event.preventDefault();
            const customerId = selectedCustomerIdHidden ? selectedCustomerIdHidden.value : null;
            const baseUrl = customerSearchForm.action || (window.location.origin + '/orders');
            const params = new URLSearchParams();
            params.set('view', 'by_name');
            if (customerId) {
                params.set('customer_id', customerId);
            }
            params.set('page', '1');
            const currentUrlForLimit = new URL(window.location.href);
            const currentLimit = currentUrlForLimit.searchParams.get('limit');
            if (currentLimit) {
                params.set('limit', currentLimit);
            }
            fetchAndUpdateOrdersView(baseUrl + '?' + params.toString());
        });
    }

    // --- For "By Order ID" Tab ---
    // ... (existing By Order ID logic - kept for brevity, assuming no changes needed here) ...
    const orderIdSearchInput = document.getElementById('order_id_search_input');
    const orderIdSearchButton = document.getElementById('order_id_search_button');
    const orderIdSearchResultsContainer = document.getElementById('order_id_search_results_container');

    if (orderIdSearchButton && orderIdSearchInput && orderIdSearchResultsContainer) {
        orderIdSearchButton.addEventListener('click', function() {
            const query = orderIdSearchInput.value.trim();
            orderIdSearchResultsContainer.innerHTML = '<p>Loading...</p>';

            if (!query || !/^[0-9]+$/.test(query)) {
                orderIdSearchResultsContainer.innerHTML = '<p class="text-danger">Please enter a valid numeric Order ID.</p>';
                return;
            }

            fetch(`/api/orders/search/id?order_id_query=${encodeURIComponent(query)}`)
                .then(response => {
                    if (!response.ok) {
                        return response.json().then(errData => {
                            throw new Error(errData.message || `HTTP error ${response.status}`);
                        }).catch(() => {
                            throw new Error(`HTTP error ${response.status}`);
                        });
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.success && data.order) {
                        const order = data.order;
                        orderIdSearchResultsContainer.innerHTML = `
                            <div class="card mt-3">
                                <div class="card-header"><h3 class="card-title">Order Details (ID: ${order.id})</h3></div>
                                <div class="card-body">
                                    <p><strong>Customer:</strong> ${order.customers.nama || 'N/A'}</p>
                                    <p><strong>Order Date:</strong> ${new Date(order.tanggal_pesan).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                    <p><strong>Total:</strong> Rp ${Number(order.total_harga).toLocaleString('id-ID')}</p>
                                    <p><strong>Payment Method:</strong> ${order.metode_pembayaran ? order.metode_pembayaran.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'N/A'}</p>
                                    <p><strong>Notes:</strong> ${order.notes || '-'}</p>
                                </div>
                            </div>
                        `;
                    } else {
                        orderIdSearchResultsContainer.innerHTML = `<p class="text-warning">${data.message || 'Order not found or error fetching data.'}</p>`;
                    }
                })
                .catch(error => {
                    console.error('Error fetching order by ID:', error);
                    orderIdSearchResultsContainer.innerHTML = `<p class="text-danger">Error: ${error.message}</p>`;
                });
        });
    }


    // --- For "By Date" Tab ---
    // ... (existing By Date logic - kept for brevity, assuming no changes needed here) ...
    const deliveryDateSearchInput = document.getElementById('delivery_date_search_input');
    const deliveryDateSearchButton = document.getElementById('delivery_date_search_button');
    const deliveryDateSearchResultsContainer = document.getElementById('delivery_date_search_results_container');

    if (deliveryDateSearchInput && typeof flatpickr !== "undefined") {
        if (flatpickr.l10ns && flatpickr.l10ns.id) {
            flatpickr.localize(flatpickr.l10ns.id);
        }
        flatpickr(deliveryDateSearchInput, { dateFormat: "Y-m-d", locale: "id" });
    }

    if (deliveryDateSearchButton && deliveryDateSearchInput && deliveryDateSearchResultsContainer) {
        deliveryDateSearchButton.addEventListener('click', function() { /* ... existing logic ... */ });
    }


    // --- Tab Management & Visibility ---
    // ... (existing tab logic - kept for brevity) ...
    const tabButtons = document.querySelectorAll('#orders-view-tabs .nav-link[data-bs-toggle="tab"]');
    const formSearchByName = document.getElementById('form_search_by_name'); // Already defined
    const formSearchByOrderId = document.getElementById('form_search_by_order_id');
    const formSearchByDate = document.getElementById('form_search_by_date');
    const allSearchForms = [formSearchByName, formSearchByOrderId, formSearchByDate].filter(form => form !== null);

    function updateSearchFormVisibility(activeTabTarget) { /* ... existing logic ... */ }
    tabButtons.forEach(tabButton => { tabButton.addEventListener('shown.bs.tab', function (event) { /* ... existing logic ... */ }); });
    const currentUrlParams = new URLSearchParams(window.location.search);
    const urlView = currentUrlParams.get('view');
    let activeTabTargetOnLoad = null;
    if (urlView) { /* ... existing logic ... */ } else { /* ... existing logic ... */ }
    if (activeTabTargetOnLoad) { updateSearchFormVisibility(activeTabTargetOnLoad); }
    else if (!urlView && !localStorage.getItem('activeOrdersTab')) { updateSearchFormVisibility('#pane-by-name');}


    // --- Delete Delivery Confirmation Modal Logic ---
    const deleteConfirmModalElement = document.getElementById('deleteDeliveryConfirmModal');
    let deleteConfirmModalInstance = null;
    if (typeof bootstrap !== 'undefined' && typeof bootstrap.Modal !== 'undefined') {
        if (deleteConfirmModalElement) {
            deleteConfirmModalInstance = new bootstrap.Modal(deleteConfirmModalElement);
        } else {
            console.error('Delete Modal Error: Modal HTML element #deleteDeliveryConfirmModal not found.');
        }
    } else {
        console.error('Delete Modal Error: Bootstrap Modal component not available.');
    }
    const deleteConfirmModalMessage = document.getElementById('deleteDeliveryConfirmModal-message');
    const deleteConfirmModalConfirmBtn = document.getElementById('deleteDeliveryConfirmModal-confirm');
    let deliveryIdToDelete = null;

    const tabContentForDelete = document.getElementById('orders-tab-content');
    if (tabContentForDelete) {
        tabContentForDelete.addEventListener('click', function(event) {
            const deleteButton = event.target.closest('.delete-delivery-btn');
            if (deleteButton) {
                event.preventDefault();
                deliveryIdToDelete = deleteButton.getAttribute('data-delivery-id');
                if (deleteConfirmModalMessage) {
                    deleteConfirmModalMessage.innerHTML = `Apakah Anda yakin ingin menghapus data pengiriman dengan ID: <strong>${deliveryIdToDelete}</strong>? Data yang sudah dihapus tidak dapat dikembalikan.`;
                }
                if (deleteConfirmModalInstance) {
                    deleteConfirmModalInstance.show();
                } else {
                    console.error('Delete Modal Error: Modal instance is not available. Cannot show modal.');
                    if (confirm(`Apakah Anda yakin ingin menghapus data pengiriman dengan ID: ${deliveryIdToDelete}? (Modal error)`)) {
                        performDeleteDelivery(deliveryIdToDelete);
                    }
                }
            }
        });
    } else {
        console.warn('Delete logic: #orders-tab-content not found.');
    }

    if (deleteConfirmModalConfirmBtn) {
        deleteConfirmModalConfirmBtn.addEventListener('click', function() {
            if (deliveryIdToDelete) {
                performDeleteDelivery(deliveryIdToDelete);
                deliveryIdToDelete = null;
            }
            if (deleteConfirmModalInstance) {
                deleteConfirmModalInstance.hide();
            } else {
                console.error('Delete Modal Error: Cannot hide modal, instance is not available.');
            }
        });
    } else {
        console.warn('Delete Modal Warning: Confirm button #deleteDeliveryConfirmModal-confirm not found.');
    }

    function performDeleteDelivery(deliveryId) {
        console.log('Attempting to delete delivery ID:', deliveryId);

        if (typeof window.showGlobalToast !== 'function') {
            console.error('showGlobalToast function is not defined. Make sure utils.js is loaded correctly.');
            alert('An error occurred while trying to display a notification.');
            return;
        }

        fetch(`/api/delivery/${deliveryId}`, {
            method: 'DELETE',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
            }
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(errData => {
                    throw new Error(errData.message || `Error deleting delivery. Status: ${response.status}`);
                }).catch(() => {
                    throw new Error(`Error deleting delivery. Status: ${response.status} - ${response.statusText}`);
                });
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                const rowToRemove = document.querySelector(`.delete-delivery-btn[data-delivery-id="${deliveryId}"]`)?.closest('tr');
                if (rowToRemove) {
                    rowToRemove.remove();
                } else {
                    console.warn('Could not find row to remove for delivery ID:', deliveryId, '. Consider reloading list.');
                }
                window.showGlobalToast('Sukses', data.message || `Pengiriman ID ${deliveryId} berhasil dihapus.`, 'success');
            } else {
                window.showGlobalToast('Error', data.message || `Gagal menghapus pengiriman ID ${deliveryId}.`, 'error');
            }
        })
        .catch(error => {
            console.error('Error in performDeleteDelivery:', error);
            window.showGlobalToast('Error', error.message || `Terjadi kesalahan saat menghapus pengiriman ID ${deliveryId}.`, 'error');
        });
    }

    // --- Event Delegation for controls within #pane-by-name ---
    const paneByName = document.getElementById('pane-by-name');

    if (paneByName) {
        paneByName.addEventListener('change', function(event) {
            if (event.target.matches('#items_per_page_select')) {
                const newLimit = event.target.value;
                const currentUrl = new URL(window.location.href);
                const params = new URLSearchParams(currentUrl.search);
                params.set('limit', newLimit);
                params.set('page', '1');
                params.set('view', 'by_name');
                currentUrl.search = params.toString();
                fetchAndUpdateOrdersView(currentUrl.toString());
            }
        });

        paneByName.addEventListener('click', function(event) {
            let clickedLinkElement = event.target.closest('.page-link');
            if (clickedLinkElement && clickedLinkElement.tagName === 'A' && clickedLinkElement.href &&
                !clickedLinkElement.href.endsWith('#') &&
                !clickedLinkElement.closest('.page-item.disabled')) {
                event.preventDefault();
                fetchAndUpdateOrdersView(clickedLinkElement.href);
            }
        });
    }

    // --- "Select All" Checkbox Functionality ---
    // const contentWrapper = document.getElementById('orders-by-name-content-wrapper'); // Already defined above

    if (contentWrapper) {
        contentWrapper.addEventListener('change', function(event) {
            if (event.target.matches('#select-all-deliveries')) {
                const isChecked = event.target.checked;
                const itemCheckboxes = contentWrapper.querySelectorAll('.select-delivery-item');
                itemCheckboxes.forEach(checkbox => {
                    checkbox.checked = isChecked;
                });
                updateBatchDeleteToast(); // <--- ADD THIS
            } else if (event.target.matches('.select-delivery-item')) {
                const selectAllCheckbox = contentWrapper.querySelector('#select-all-deliveries');
                if (selectAllCheckbox) {
                    const itemCheckboxes = contentWrapper.querySelectorAll('.select-delivery-item');
                    const allChecked = Array.from(itemCheckboxes).every(checkbox => checkbox.checked);
                    const someChecked = Array.from(itemCheckboxes).some(checkbox => checkbox.checked);

                    if (allChecked && itemCheckboxes.length > 0) {
                        selectAllCheckbox.checked = true;
                        selectAllCheckbox.indeterminate = false;
                    } else if (someChecked) {
                        selectAllCheckbox.checked = false;
                        selectAllCheckbox.indeterminate = true;
                    } else {
                        selectAllCheckbox.checked = false;
                        selectAllCheckbox.indeterminate = false;
                    }
                }
                updateBatchDeleteToast(); // <--- ADD THIS
            }
        });
    } else {
        console.warn("Content wrapper for select-all functionality ('orders-by-name-content-wrapper') not found.");
    }
});
