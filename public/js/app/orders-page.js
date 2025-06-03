document.addEventListener('DOMContentLoaded', function () {
    const customerSearchInput = document.getElementById('customer_search_orders');
    const selectedCustomerIdHidden = document.getElementById('selected_customer_id_hidden');
    const customerSearchForm = customerSearchInput ? customerSearchInput.closest('form') : null;
    const bootstrap = window.tabler?.bootstrap;
    const contentWrapper = document.getElementById('orders-by-name-content-wrapper'); // Specific to "By Name"
    const byNameContainer = contentWrapper; // Alias for clarity in new logic
    const byDateContainer = document.getElementById('delivery_date_search_results_container');
    const ordersTabContent = document.getElementById('orders-tab-content'); // Parent for event delegation

    // Function to update the batch delete toast based on the active tab
    function updateBatchDeleteToast() {
        if (typeof window.batchDeleteToast === 'undefined') {
            console.warn('batchDeleteToast helper not found on window object.');
            return;
        }

        let activeViewSelectedCount = 0;
        const activePane = document.querySelector('.tab-pane.active');

        if (activePane) {
            // Check if the active pane itself is one of the containers, or find a container within it.
            // This handles cases where the pane IS the container (e.g. if results are directly in pane-by-date)
            // or if the container is a child of the pane.
            let containerToCount = null;
            if (activePane.id === 'pane-by-name' && byNameContainer) { // #pane-by-name contains orders-by-name-content-wrapper
                 containerToCount = activePane.querySelector('#orders-by-name-content-wrapper');
            } else if (activePane.id === 'pane-by-date' && byDateContainer) { // #pane-by-date contains delivery_date_search_results_container
                 containerToCount = activePane.querySelector('#delivery_date_search_results_container');
            } else {
                // Fallback or if structure is different, check direct children common for tables
                containerToCount = activePane; // Default to activePane if specific containers aren't matched
            }

            if (containerToCount) {
                 activeViewSelectedCount = containerToCount.querySelectorAll('.select-delivery-item:checked').length;
            } else {
                // If specific containers aren't found within the active pane, try querying the activePane directly.
                // This is a fallback, ideally specific containers are more robust.
                activeViewSelectedCount = activePane.querySelectorAll('.select-delivery-item:checked').length;
            }
        }
         // console.log('Active pane:', activePane, 'Selected count:', activeViewSelectedCount);

        if (activeViewSelectedCount > 0) {
            window.batchDeleteToast.show(activeViewSelectedCount);
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

    // const contentWrapper = document.getElementById('orders-by-name-content-wrapper'); // This is byNameContainer
    if (byNameContainer) { // Only operate if this specific container is being updated
        byNameContainer.innerHTML = html;

        const selectAllCheckbox = byNameContainer.querySelector('#select-all-deliveries');
                if (selectAllCheckbox) {
                    selectAllCheckbox.checked = false;
                    selectAllCheckbox.indeterminate = false;
                }
        // updateBatchDeleteToast(); // Called by checkbox logic if items are re-rendered

                // --- ADDED LOGIC START ---
                // Use a full URL if 'url' is relative, to ensure URLSearchParams works correctly.
                const absoluteUrl = new URL(url, window.location.origin);
                const currentUrlParams = new URLSearchParams(absoluteUrl.search);
                const currentView = currentUrlParams.get('view');

                if (currentView === 'by_name') {
                    // customerSearchInput is defined in the outer scope
                    if (customerSearchInput) {
                        customerSearchInput.value = '';
                        customerSearchInput.blur();
                        // console.log('Customer search input cleared and blurred after AJAX update for by_name view.');
                    }
                }
                // --- ADDED LOGIC END ---
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
        deliveryDateSearchButton.addEventListener('click', function() {
            const dateQuery = deliveryDateSearchInput.value.trim();
            deliveryDateSearchResultsContainer.innerHTML = '<p class="text-center">Loading...</p>'; // Basic loading indicator

            if (!dateQuery) {
                deliveryDateSearchResultsContainer.innerHTML = '<p class="text-danger text-center">Please select a date.</p>';
                return;
            }

            // Validate date format YYYY-MM-DD (basic regex)
            if (!/^\d{4}-\d{2}-\d{2}$/.test(dateQuery)) {
                deliveryDateSearchResultsContainer.innerHTML = '<p class="text-danger text-center">Invalid date format. Please use YYYY-MM-DD.</p>';
                return;
            }

            fetch(`/api/orders/search/date?date=${encodeURIComponent(dateQuery)}`)
                .then(response => {
                    if (!response.ok) {
                        return response.json().then(errData => {
                            throw new Error(errData.message || `HTTP error ${response.status}`);
                        }).catch(() => {
                            throw new Error(`HTTP error ${response.status} - ${response.statusText || 'Server error'}`);
                        });
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.success && data.deliveries) {
                        let html = '<table class="table table-vcenter card-table table-selectable">';
                        html += `
                            <thead>
                                <tr>
                                    <th><input class="form-check-input" type="checkbox" id="select-all-deliveries-by-date" aria-label="Select all deliveries for this date"></th>
                                    <th>Tanggal</th>
                                    <th>Customer</th>
                                    <th>Order ID</th>
                                    <th>Items</th>
                                    <th>Total</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                        <tbody>`;

                        if (data.deliveries.length === 0) {
                            html += '<tr><td colspan="8" class="text-center">No deliveries found for this date.</td></tr>';
                        } else {
                            data.deliveries.forEach(delivery => {
                                let itemsHtml = '';
                                if (delivery.orderdetails && delivery.orderdetails.length > 0) {
                                    itemsHtml += '<ul class="list-unstyled mb-0">'; // Added mb-0 for tighter list
                                    delivery.orderdetails.forEach(detail => {
                                        itemsHtml += `<li>${detail.paket.nama} (x${detail.jumlah})</li>`;
                                    });
                                    itemsHtml += '</ul>';
                                } else {
                                    itemsHtml = 'N/A';
                                }

                                let badge_class = 'secondary';
                                const status_lower = delivery.status ? delivery.status.toLowerCase() : '';
                                if (status_lower === 'completed') badge_class = 'success';
                                else if (status_lower === 'pending') badge_class = 'warning';
                                else if (status_lower === 'canceled' || status_lower === 'cancelled') badge_class = 'danger';
                                else if (status_lower === 'in-progress' || status_lower === 'in_progress') badge_class = 'info';

                                html += `
                                    <tr>
                                        <td><input class="form-check-input select-delivery-item" type="checkbox" value="${delivery.id}" aria-label="Select delivery ${delivery.id}"></td>
                                        <td>${new Date(delivery.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                        <td>${delivery.orders && delivery.orders.customers ? delivery.orders.customers.nama : 'N/A'}</td>
                                        <td>${delivery.orders ? delivery.orders.id : 'N/A'}</td>
                                        <td>${itemsHtml}</td>
                                        <td>${delivery.total_harga_perhari ? Number(delivery.total_harga_perhari).toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }) : 'N/A'}</td>
                                        <td><span class="badge bg-${badge_class} me-1"></span> ${delivery.status ? delivery.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'N/A'}</td>
                                        <td>
                                            <div class="btn-list flex-nowrap">
                                                <button class="btn btn-sm btn-icon text-danger delete-delivery-btn" data-delivery-id="${delivery.id}" title="Hapus Pengiriman">
                                                    <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-trash" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 7l16 0" /><path d="M10 11l0 6" /><path d="M14 11l0 6" /><path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12" /><path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3" /></svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                `;
                            });
                        }
                        html += '</tbody></table>';
                        deliveryDateSearchResultsContainer.innerHTML = html;
                    } else {
                        deliveryDateSearchResultsContainer.innerHTML = `<p class="text-warning text-center">${data.message || 'No deliveries found or error fetching data.'}</p>`;
                    }
                })
                .catch(error => {
                    console.error('Error fetching deliveries by date:', error);
                    deliveryDateSearchResultsContainer.innerHTML = `<p class="text-danger text-center">Error: ${error.message}</p>`;
                });
        });
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

    // --- Unified "Select All" Checkbox Functionality via Event Delegation ---
    if (ordersTabContent) {
        ordersTabContent.addEventListener('change', function(event) {
            const target = event.target;
            let currentTableContainer = null;
            let selectAllCheckboxInstance = null; // Renamed to avoid conflict with selectAllCheckbox var if any

            // Determine current container and corresponding "select all" checkbox
            if (target.closest('#orders-by-name-content-wrapper')) {
                currentTableContainer = byNameContainer;
                selectAllCheckboxInstance = currentTableContainer?.querySelector('#select-all-deliveries');
            } else if (target.closest('#delivery_date_search_results_container')) {
                currentTableContainer = byDateContainer;
                selectAllCheckboxInstance = currentTableContainer?.querySelector('#select-all-deliveries-by-date');
            }

            if (!currentTableContainer) {
                // If the change event is not within a known container, exit.
                // This can happen if other form elements within ordersTabContent trigger change events.
                return;
            }

            const itemCheckboxes = currentTableContainer.querySelectorAll('.select-delivery-item');

            if (target.matches('#select-all-deliveries, #select-all-deliveries-by-date')) {
                // Handle "Select All" checkbox click
                const isChecked = target.checked;
                itemCheckboxes.forEach(checkbox => {
                    checkbox.checked = isChecked;
                });
            } else if (target.matches('.select-delivery-item')) {
                // Handle individual item checkbox click
                if (selectAllCheckboxInstance) {
                    const allChecked = Array.from(itemCheckboxes).every(checkbox => checkbox.checked);
                    const someChecked = Array.from(itemCheckboxes).some(checkbox => checkbox.checked);

                    if (allChecked && itemCheckboxes.length > 0) {
                        selectAllCheckboxInstance.checked = true;
                        selectAllCheckboxInstance.indeterminate = false;
                    } else if (someChecked) {
                        selectAllCheckboxInstance.checked = false;
                        selectAllCheckboxInstance.indeterminate = true;
                    } else {
                        selectAllCheckboxInstance.checked = false;
                        selectAllCheckboxInstance.indeterminate = false;
                    }
                }
            }

            // After any relevant checkbox change, update the toast.
            // This will correctly count from the active tab due to updateBatchDeleteToast's internal logic.
            if (target.matches('#select-all-deliveries, #select-all-deliveries-by-date, .select-delivery-item')) {
                 updateBatchDeleteToast();
            }
        });
        // Initial call to set toast state when page loads (e.g. if there are pre-selected items from server-side rendering, though not current case)
        // updateBatchDeleteToast(); // This might be better called after initial content load for each tab if applicable
    } else {
        console.warn("Main tab content area ('orders-tab-content') not found. Checkbox functionality might be affected.");
    }

    // Ensure toast is updated when tabs change
    tabButtons.forEach(tabButton => {
        tabButton.addEventListener('shown.bs.tab', function (event) {
            // event.target // newly activated tab
            // event.relatedTarget // previous active tab
            updateSearchFormVisibility(event.target.getAttribute('data-bs-target'));

            // Reset "Select All" for the tab that is becoming inactive (event.relatedTarget)
            const previousActivePaneTarget = event.relatedTarget ? event.relatedTarget.getAttribute('data-bs-target') : null;
            if (previousActivePaneTarget) {
                const previousPane = document.querySelector(previousActivePaneTarget);
                if (previousPane) {
                    const selectAllInPrevious = previousPane.querySelector('#select-all-deliveries, #select-all-deliveries-by-date');
                    if (selectAllInPrevious && selectAllInPrevious.checked) {
                        // selectAllInPrevious.checked = false; // Optionally uncheck all when tab becomes inactive
                        // selectAllInPrevious.indeterminate = false;
                        // const itemsInPrevious = previousPane.querySelectorAll('.select-delivery-item');
                        // itemsInPrevious.forEach(item => item.checked = false);
                    }
                }
            }
            updateBatchDeleteToast(); // Update toast based on the new active tab's selection state
        });
    });

    // Initial toast update on page load, considering the initially active tab
    // This ensures the toast is correctly shown/hidden if the page loads with an active tab that might have selections
    // (though currently selections are client-side only).
    const initialActiveTab = document.querySelector('#orders-view-tabs .nav-link.active');
    if (initialActiveTab) {
        updateSearchFormVisibility(initialActiveTab.getAttribute('data-bs-target')); // Ensure correct form visibility
    }
    updateBatchDeleteToast(); // Update toast for the initially active tab

});
