document.addEventListener('DOMContentLoaded', function () {
    const customerSearchInput = document.getElementById('customer_search_orders');
    const selectedCustomerIdHidden = document.getElementById('selected_customer_id_hidden');
    const customerSearchForm = document.getElementById('form_search_by_name'); // Use specific ID
    const bootstrap = window.tabler?.bootstrap;
    const contentWrapper = document.getElementById('orders-by-name-content-wrapper'); // Specific to "By Name"
    const byNameContainer = contentWrapper; // Alias for clarity in new logic
    const byDateContainer = document.getElementById('delivery_date_search_results_container');
    const ordersTabContent = document.getElementById('orders-tab-content'); // Parent for event delegation
    let availablePaketsForModal = []; // To store available pakets for the modal context

    // Element selectors for controls
    const groupingSelect = document.getElementById('grouping_select');
    const itemsPerPageSelect = document.getElementById('items_per_page_select');


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
            event.preventDefault(); // Prevent default GET submission

            // Ensure hidden fields for grouping and limit are added/updated
            let groupingHidden = customerSearchForm.querySelector('input[name="grouping"]');
            if (!groupingHidden) {
                groupingHidden = document.createElement('input');
                groupingHidden.type = 'hidden';
                groupingHidden.name = 'grouping';
                customerSearchForm.appendChild(groupingHidden);
            }
            // Use groupingSelect if available, otherwise try to get from URL or default
            const currentUrlForGrouping = new URL(window.location.href);
            groupingHidden.value = groupingSelect ? groupingSelect.value : currentUrlForGrouping.searchParams.get('grouping') || 'none';

            let limitHidden = customerSearchForm.querySelector('input[name="limit"]');
            if (!limitHidden) {
                limitHidden = document.createElement('input');
                limitHidden.type = 'hidden';
                limitHidden.name = 'limit';
                customerSearchForm.appendChild(limitHidden);
            }
            // Use itemsPerPageSelect if available, otherwise try to get from URL or default
            const currentUrlForLimit = new URL(window.location.href);
            limitHidden.value = itemsPerPageSelect ? itemsPerPageSelect.value : currentUrlForLimit.searchParams.get('limit') || '100';

            // Ensure page is reset
            let pageHidden = customerSearchForm.querySelector('input[name="page"]');
            if (!pageHidden) {
                pageHidden = document.createElement('input');
                pageHidden.type = 'hidden';
                pageHidden.name = 'page';
                customerSearchForm.appendChild(pageHidden);
            }
            pageHidden.value = '1';

            // Hidden field for view=by_name should already exist in the form.

            // For AJAX update, construct URL with all params. For full reload, the form now has all params.
            // The existing fetchAndUpdateOrdersView is for AJAX. If we want full reload, use customerSearchForm.submit()
            // The prompt mentioned earlier that full page reloads are the primary mechanism.
            // So, let's ensure the form is submitted naturally after adding hidden fields if it's not an AJAX call by default.
            // The current code calls fetchAndUpdateOrdersView, which is AJAX.
            // To switch to full reload for this form:
            // customerSearchForm.submit(); // This would be used instead of fetchAndUpdateOrdersView
            // For now, keeping AJAX as per existing structure, but ensuring params are correctly built for it.
            // const customerId = selectedCustomerIdHidden ? selectedCustomerIdHidden.value : null;
            const baseUrl = customerSearchForm.action || (window.location.origin + '/orders');
            const params = new URLSearchParams();
            params.set('view', 'by_name');
            if (customerId) {
                params.set('customer_id', customerId);
            }
            params.set('page', pageHidden.value); // '1'
            params.set('limit', limitHidden.value);
            params.set('grouping', groupingHidden.value);

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
    // const formSearchByName = document.getElementById('form_search_by_name'); // Already defined as customerSearchForm
    const formSearchByOrderId = document.getElementById('form_search_by_order_id');
    const formSearchByDate = document.getElementById('form_search_by_date');
    const allSearchForms = [customerSearchForm, formSearchByOrderId, formSearchByDate].filter(form => form !== null);

    function updateSearchFormVisibility(activeTabTarget) {
        allSearchForms.forEach(form => {
            if (form) form.style.display = 'none';
        });
        let formToShow = null;
        if (activeTabTarget === '#pane-by-name') formToShow = customerSearchForm;
        else if (activeTabTarget === '#pane-by-order-id') formToShow = formSearchByOrderId;
        else if (activeTabTarget === '#pane-by-date') formToShow = formSearchByDate;
        if (formToShow) formToShow.style.display = 'flex'; // Assuming flex is desired for visible forms
    }

    tabButtons.forEach(tabButton => {
        tabButton.addEventListener('shown.bs.tab', function (event) {
            updateSearchFormVisibility(event.target.getAttribute('data-bs-target'));
            // Store the active tab in localStorage
            localStorage.setItem('activeOrdersTab', event.target.getAttribute('data-bs-target'));
        });
    });

    const currentUrlParams = new URLSearchParams(window.location.search);
    const urlView = currentUrlParams.get('view');
    let activeTabTargetOnLoad = localStorage.getItem('activeOrdersTab') || '#pane-by-name'; // Default to by_name

    // If 'view' param in URL, it overrides localStorage
    if (urlView) {
        if (urlView === 'by_name') activeTabTargetOnLoad = '#pane-by-name';
        else if (urlView === 'by_order_id') activeTabTargetOnLoad = '#pane-by-order-id';
        else if (urlView === 'by_date') activeTabTargetOnLoad = '#pane-by-date';
    }

    // Activate the determined tab
    const activeTabButton = document.querySelector(`.nav-link[data-bs-target="${activeTabTargetOnLoad}"]`);
    if (activeTabButton && bootstrap && typeof bootstrap.Tab === 'function') { // Check for bootstrap.Tab
        const tabInstance = new bootstrap.Tab(activeTabButton);
        tabInstance.show();
    } else if (activeTabButton) {
        // Fallback or manual activation if bootstrap.Tab is not found or not a function
        // This might involve manually setting 'active' classes and hiding/showing panes
        console.warn("Bootstrap Tab instance couldn't be created. Tab activation might be incomplete.");
        // Manual activation example (simplified, might need more robust class handling):
        document.querySelectorAll('#orders-view-tabs .nav-link').forEach(tb => tb.classList.remove('active'));
        activeTabButton.classList.add('active');
        document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('show', 'active'));
        const targetPane = document.querySelector(activeTabTargetOnLoad);
        if (targetPane) targetPane.classList.add('show', 'active');
    }

    if (activeTabTargetOnLoad) {
        updateSearchFormVisibility(activeTabTargetOnLoad);
    } else if (!urlView && !localStorage.getItem('activeOrdersTab')) {
        updateSearchFormVisibility('#pane-by-name');
    }

    // Tab switching logic (full page reload)
    document.querySelectorAll('#orders-view-tabs .nav-link').forEach(tab => {
        tab.addEventListener('click', function(event) {
            event.preventDefault();
            const viewTarget = this.getAttribute('data-bs-target'); // e.g., #pane-by-name
            let viewName = 'by_name'; // Default
            if (viewTarget === '#pane-by-order-id') {
                viewName = 'by_order_id';
            } else if (viewTarget === '#pane-by-date') {
                viewName = 'by_date';
            }

            const currentUrl = new URL(window.location.href);
            currentUrl.searchParams.set('view', viewName);
            currentUrl.searchParams.delete('page'); // Reset page

            if (viewName === 'by_name') {
                const groupingValue = groupingSelect ? groupingSelect.value : currentUrl.searchParams.get('grouping') || 'none';
                currentUrl.searchParams.set('grouping', groupingValue);
                // customer_id is preserved if already in URL (e.g. from a previous selection)
            } else {
                // For other views, grouping is not applicable, so remove it.
                currentUrl.searchParams.delete('grouping');
                // Also clear customer_id as it's specific to by_name view when switching away
                currentUrl.searchParams.delete('customer_id');
            }

            // Clear specific search inputs of other views to avoid confusion
            if (viewName !== 'by_order_id') {
                const orderIdInput = document.getElementById('order_id_search_input');
                if (orderIdInput) orderIdInput.value = '';
                 currentUrl.searchParams.delete('order_id_query'); // Also remove from URL if it was there
            }
            if (viewName !== 'by_name') {
                 const customerSearchBox = document.getElementById('customer_search_orders');
                 if(customerSearchBox) customerSearchBox.value = '';
                 // selected_customer_id_hidden is tied to form_search_by_name, not directly to URL by this tab switch
                 // customer_id is cleared from URL above if switching away from by_name
            }
            if (viewName !== 'by_date') {
                const dateInput = document.getElementById('delivery_date_search_input');
                if(dateInput) dateInput.value = '';
                // No specific URL param for date search shown in controller for page load, it's API driven
            }

            window.location.href = currentUrl.toString();
        });
    });


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

        if (typeof window.showToast !== 'function') {
            console.error('showToast function is not defined. Make sure utils.js is loaded correctly.');
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
                window.showToast('Sukses', data.message || `Pengiriman ID ${deliveryId} berhasil dihapus.`, 'success');
            } else {
                window.showToast('Error', data.message || `Gagal menghapus pengiriman ID ${deliveryId}.`, 'error');
            }
        })
        .catch(error => {
            console.error('Error in performDeleteDelivery:', error);
            window.showToast('Error', error.message || `Terjadi kesalahan saat menghapus pengiriman ID ${deliveryId}.`, 'error');
        });
    }

    // --- Event Delegation for controls within #pane-by-name (now using byNameContainer for clarity) ---
    // This includes items_per_page_select and pagination links, which are part of _orders_table_partial.html.twig

    // Handler for "Items per page" select, if it's rendered
    if (itemsPerPageSelect) {
        itemsPerPageSelect.addEventListener('change', function() {
            const selectedLimit = this.value;
            const currentUrl = new URL(window.location.href);
            currentUrl.searchParams.set('limit', selectedLimit);
            currentUrl.searchParams.set('page', '1'); // Reset page to 1

            // Preserve grouping parameter
            const groupingValue = groupingSelect ? groupingSelect.value : currentUrl.searchParams.get('grouping') || 'none';
            currentUrl.searchParams.set('grouping', groupingValue);

            // Ensure view is by_name as this control is specific to it
            currentUrl.searchParams.set('view', 'by_name');

            // The AJAX update was causing issues with state. Full reload is more robust here.
            window.location.href = currentUrl.toString();
            // fetchAndUpdateOrdersView(currentUrl.toString()); // Previous AJAX attempt
        });
    }

    // Handler for pagination links (event delegation on byNameContainer)
    if (byNameContainer) {
        byNameContainer.addEventListener('click', function(event) {
            let clickedLinkElement = event.target.closest('.page-link');
            if (clickedLinkElement && clickedLinkElement.tagName === 'A' && clickedLinkElement.href &&
                !clickedLinkElement.href.endsWith('#') && // Ignore placeholder links
                !clickedLinkElement.closest('.page-item.disabled')) { // Ignore disabled links
                event.preventDefault();
                // The pagination links in _orders_table_partial.html.twig should already include all necessary params (view, customer_id, page, limit, grouping)
                // So, a full navigation is fine. If AJAX is preferred, fetchAndUpdateOrdersView can be used.
                window.location.href = clickedLinkElement.href;
                // fetchAndUpdateOrdersView(clickedLinkElement.href); // Previous AJAX attempt
            }
        });
    }

    // Grouping select handler
    if (groupingSelect) {
       groupingSelect.addEventListener('change', function() {
           const selectedGrouping = this.value;
           const currentUrl = new URL(window.location.href);
           currentUrl.searchParams.set('grouping', selectedGrouping);

           // Grouping primarily applies to 'by_name' view.
           // If current view is different, switch to 'by_name'.
           currentUrl.searchParams.set('view', 'by_name');
           currentUrl.searchParams.set('page', '1'); // Reset page to 1 when grouping changes.

           // If a customer_id is already in the URL for by_name view, it will be preserved.
           // If no customer_id is present (e.g. user was on "by_order_id" and changed grouping),
           // the page will show "by_name" view without a customer selected, prompting to select one.
           // This is generally fine.

           window.location.href = currentUrl.toString();
       });
   }

    // Click listener for the external submit button to trigger form submission
    const externalSubmitBtn = document.getElementById('submit-btn');
    if (externalSubmitBtn) {
        externalSubmitBtn.addEventListener('click', function() {
            const editOrderFormToSubmit = document.getElementById('edit-form');
            if (editOrderFormToSubmit) {
                // Programmatically submit the form.
                // requestSubmit() is the modern way and also triggers HTML5 validation if any.
                if (typeof editOrderFormToSubmit.requestSubmit === 'function') {
                    editOrderFormToSubmit.requestSubmit();
                } else {
                    // Fallback for older browsers or if requestSubmit isn't available for some reason
                    // This will trigger the 'submit' event listener on the form.
                    editOrderFormToSubmit.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                }
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


    // --- Edit Order Modal Logic ---

    // Helper function to add a package row to the modal
    function addPackageRowToModal(availablePakets, detail = null) {
        const packageFieldsContainer = document.getElementById('package-fields-container');
        if (!packageFieldsContainer) {
            console.error('Package fields container #package-fields-container not found in modal.');
            return;
        }

        const detailId = detail ? detail.id : ''; // Store existing orderdetail.id if present
        const selectedPaketId = detail ? detail.paket_id : (detail && detail.paket ? detail.paket.id : ''); // Ensure detail.paket.id is also checked
        const jumlah = detail ? detail.jumlah : 1;
        const catatanDapur = detail && detail.catatan_dapur ? detail.catatan_dapur : '';
        const catatanKurir = detail && detail.catatan_kurir ? detail.catatan_kurir : '';

        const packageRow = document.createElement('div');
        packageRow.classList.add('package-item-row', 'mb-3', 'p-3', 'border', 'rounded'); // Added more padding and rounded corners
        packageRow.setAttribute('data-orderdetail-id', detailId);

        let paketOptionsHtml = '<option value="">Pilih Paket</option>';
        availablePakets.forEach(paket => {
            const isSelected = paket.id === selectedPaketId || (detail && detail.paket && paket.id === detail.paket.id);
            paketOptionsHtml += `<option value="${paket.id}" data-harga-jual="${paket.harga_jual}" data-harga-modal="${paket.harga_modal}" ${isSelected ? 'selected' : ''}>${paket.nama} (Jual: ${Number(paket.harga_jual).toLocaleString('id-ID')}, Modal: ${Number(paket.harga_modal).toLocaleString('id-ID')})</option>`;
        });

        packageRow.innerHTML = `
            <input type="hidden" class="order-detail-id" value="${detailId}"> <!-- Hidden input for existing detail ID -->
            <div class="row g-3"> <!-- Increased gutter for better spacing -->
                <div class="col-md-7 mb-2"> <!-- Adjusted column width -->
                    <label class="form-label">Paket Makanan</label>
                    <select class="form-select paket-select">${paketOptionsHtml}</select>
                </div>
                <div class="col-md-2 mb-2"> <!-- Adjusted column width -->
                    <label class="form-label">Jumlah</label>
                    <input class="form-control paket-jumlah" type="number" value="${jumlah}" min="1">
                </div>
                <div class="col-md-3 mb-2"> <!-- Subtotal display column -->
                    <label class="form-label">Subtotal</label>
                    <input type="text" class="form-control item-subtotal-display" readonly style="pointer-events: none;">
                </div>
            </div>
            <div class="mb-2">
                <label class="form-label">Catatan Dapur</label>
                <textarea class="form-control paket-catatan-dapur" rows="1">${catatanDapur}</textarea>
            </div>
            <div class="mb-2">
                <label class="form-label">Catatan Kurir</label>
                <textarea class="form-control paket-catatan-kurir" rows="1">${catatanKurir}</textarea>
            </div>
            <button type="button" class="btn btn-sm btn-danger remove-package-btn mt-2">Hapus Paket Ini</button>
            <hr class="my-3 d-md-none"> <!-- Show hr only on smaller screens if rows stack -->
        `;
        packageFieldsContainer.appendChild(packageRow);
    }

    // Function to populate the modal with fetched data
    function populateEditOrderModal(data) {
        const deliveryData = data;
        const orderDetails = data.details || [];
        const availableCouriers = data.available_couriers || [];
        availablePaketsForModal = data.available_pakets || []; // Store for "Add Package" button

        const modalTitleElement = document.getElementById('editOrderModalTitle');
        if (modalTitleElement) {
            modalTitleElement.textContent = `Edit Pengiriman (ID: ${deliveryData.id}) Pesanan ID: ${deliveryData.order_id || 'N/A'}`;
        }

        const deliveryDateInput = document.getElementById('delivery-date-input');
        if (deliveryDateInput) {
            deliveryDateInput.value = deliveryData.tanggal;
             if (window.flatpickr) { // Check if flatpickr is available
                const fpInstance = deliveryDateInput._flatpickr;
                if (fpInstance) {
                    fpInstance.setDate(deliveryData.tanggal, true);
                } else {
                    // Initialize flatpickr if it wasn't initialized before for this specific input
                    flatpickr(deliveryDateInput, { dateFormat: "Y-m-d", locale: "id" });
                    deliveryDateInput._flatpickr.setDate(deliveryData.tanggal, true);
                }
            }
        }


        const ongkirInput = document.getElementById('ongkir-input');
        if (ongkirInput) ongkirInput.value = deliveryData.ongkir || 0;

        const itemTambahanInput = document.getElementById('item-tambahan-input');
        if (itemTambahanInput) itemTambahanInput.value = deliveryData.item_tambahan || '';

        const hargaTambahanInput = document.getElementById('harga-tambahan-input');
        if (hargaTambahanInput) hargaTambahanInput.value = deliveryData.harga_tambahan || 0;

        const hargaModalTambahanInput = document.getElementById('harga-modal-tambahan-input');
        if (hargaModalTambahanInput) hargaModalTambahanInput.value = deliveryData.harga_modal_tambahan || 0;

        // Populate new daily notes fields
        const dailyKitchenNoteEl = document.getElementById('daily-kitchen-note');
        if (dailyKitchenNoteEl) dailyKitchenNoteEl.value = deliveryData.kitchen_note || '';

        const dailyCourierNoteEl = document.getElementById('daily-courier-note');
        if (dailyCourierNoteEl) dailyCourierNoteEl.value = deliveryData.courier_note || '';

        // Order-level notes (display only, or make editable if form field exists)
        const orderNotesDisplay = document.getElementById('order-notes-display'); // Example ID for a display area
        if (orderNotesDisplay && deliveryData.orders && deliveryData.orders.notes) {
            orderNotesDisplay.textContent = deliveryData.orders.notes;
            // Show the container if notes exist
            const orderNotesContainer = document.getElementById('order-notes-container');
            if(orderNotesContainer) orderNotesContainer.style.display = 'block';
        } else if (orderNotesDisplay) {
            orderNotesDisplay.textContent = 'Tidak ada catatan pesanan.';
            const orderNotesContainer = document.getElementById('order-notes-container');
            if(orderNotesContainer) orderNotesContainer.style.display = 'none'; // Hide if no notes
        }


        const kurirSelect = document.getElementById('kurir-select');
        if (kurirSelect) {
            kurirSelect.innerHTML = '<option value="">Pilih Kurir</option>';
            availableCouriers.forEach(courier => {
                const option = new Option(courier.nama, courier.id);
                option.selected = String(courier.id) === String(deliveryData.kurir_id); // Ensure type safe comparison
                kurirSelect.add(option);
            });
            if (!deliveryData.kurir_id && kurirSelect.options.length > 0) {
                kurirSelect.selectedIndex = 0;
            }
        }

        const packageFieldsContainer = document.getElementById('package-fields-container');
        if (packageFieldsContainer) {
            packageFieldsContainer.innerHTML = '';
            if (orderDetails.length === 0) {
                // addPackageRowToModal(availablePaketsForModal, null); // Optionally add one blank row
            } else {
                orderDetails.forEach(detail => {
                    addPackageRowToModal(availablePaketsForModal, detail);
                });
            }
            // After populating all rows, update their individual subtotals and then the grand total
            document.querySelectorAll('#package-fields-container .package-item-row').forEach(row => {
                 if (row.querySelector('.paket-select')) { // Ensure it's a fully formed row
                    updateItemSubtotalDisplay(row);
                }
            });
            updateOverallTotalDisplay();
        }
    }

    // Function to update individual item subtotal display
    function updateItemSubtotalDisplay(packageRow) {
        const paketSelect = packageRow.querySelector('.paket-select');
        const jumlahInput = packageRow.querySelector('.paket-jumlah');
        const subtotalDisplay = packageRow.querySelector('.item-subtotal-display');

        if (!paketSelect || !jumlahInput || !subtotalDisplay) return;

        const selectedOption = paketSelect.options[paketSelect.selectedIndex];
        const hargaJual = parseFloat(selectedOption.dataset.hargaJual || 0);
        const jumlah = parseInt(jumlahInput.value) || 0;
        const subtotal = hargaJual * jumlah;

        subtotalDisplay.value = subtotal.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 });
    }

    // Function to update the overall total display in the modal
    function updateOverallTotalDisplay() {
        const overallTotalDisplay = document.getElementById('overall-total-display');
        if (!overallTotalDisplay) return;

        let sumOfItemSubtotals = 0;
        document.querySelectorAll('#package-fields-container .package-item-row').forEach(row => {
            const paketSelect = row.querySelector('.paket-select');
            const jumlahInput = row.querySelector('.paket-jumlah');
            if (paketSelect && jumlahInput) {
                const selectedOption = paketSelect.options[paketSelect.selectedIndex];
                if (selectedOption && selectedOption.dataset.hargaJual) { // Ensure option is selected and has data
                    const hargaJual = parseFloat(selectedOption.dataset.hargaJual);
                    const jumlah = parseInt(jumlahInput.value) || 0;
                    sumOfItemSubtotals += hargaJual * jumlah;
                }
            }
        });

        const ongkirInput = document.getElementById('ongkir-input');
        const hargaTambahanInput = document.getElementById('harga-tambahan-input');

        const ongkir = parseFloat(ongkirInput ? ongkirInput.value : 0) || 0;
        const hargaTambahan = parseFloat(hargaTambahanInput ? hargaTambahanInput.value : 0) || 0;

        const grandTotal = sumOfItemSubtotals + ongkir + hargaTambahan;
        overallTotalDisplay.value = grandTotal.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 });
    }


    // Function to open and fetch data for the Edit Order Modal
    async function openEditOrderModal(deliveryId) {
        const modalElement = document.getElementById('editOrderModal');
        if (!modalElement) {
            console.error('Edit Order Modal element #editOrderModal not found.');
            if (window.showToast) window.showToast('Error', 'Komponen modal edit tidak ditemukan.', 'error');
            return;
        }

        modalElement.setAttribute('data-current-delivery-id', deliveryId);

        // Show loading state - e.g., disable form, show spinner
        const formElement = modalElement.querySelector('#edit-form'); // Assuming form has id 'edit-form'
        if (formElement) {
            Array.from(formElement.elements).forEach(el => el.disabled = true);
        }
        // You might want to show a visual spinner here too.

        try {
            const response = await fetch(`/api/delivery-details/${deliveryId}`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Gagal memuat detail pengiriman. Status: ' + response.status }));
                throw new Error(errorData.message || 'Gagal memuat detail pengiriman.');
            }
            const result = await response.json();

            if (result.success && result.data) {
                populateEditOrderModal(result.data);
                const bootstrapModal = bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement);
                bootstrapModal.show();
            } else {
                throw new Error(result.message || 'Tidak dapat mengambil detail pengiriman.');
            }
        } catch (error) {
            console.error('Error opening edit order modal:', error);
            if (window.showToast) window.showToast('Error', error.message, 'error');
        } finally {
            // Hide loading state
            if (formElement) {
                Array.from(formElement.elements).forEach(el => el.disabled = false);
            }
        }
    }

    // Event listener for Edit buttons (delegated from ordersTabContent)
    if (ordersTabContent) {
        ordersTabContent.addEventListener('click', function(event) {
            const editButton = event.target.closest('.edit-delivery-btn');
            if (editButton) {
                event.preventDefault();
                const deliveryId = editButton.getAttribute('data-delivery-id');
                if (deliveryId) {
                    openEditOrderModal(deliveryId);
                } else {
                    console.error('Edit button clicked but data-delivery-id attribute is missing or empty.');
                    if(window.showToast) window.showToast('Error', 'ID Pengiriman tidak ditemukan untuk diedit.', 'error');
                }
            }
        });
    }

    // Initialize Flatpickr for the main delivery_date_search_input (if not already done)
    // The modal's flatpickr is handled within populateEditOrderModal or should be initialized when modal HTML is loaded.
    // This ensures that if the main page has a flatpickr input, it's also initialized.
    const mainDeliveryDateInput = document.getElementById('delivery_date_search_input'); // This is for the "By Date" tab search
    if (mainDeliveryDateInput && window.flatpickr && !mainDeliveryDateInput._flatpickr) {
       flatpickr(mainDeliveryDateInput, { dateFormat: "Y-m-d", locale: "id" });
    }

    // It's good practice to initialize modal's flatpickr when the modal is first added to DOM or shown,
    // but the current populateEditOrderModal handles re-setting the date or initializing if needed.
    // If #delivery-date-input (modal's date input) exists on page load (e.g. not dynamically loaded with modal):
    const modalDeliveryDateInput = document.getElementById('delivery-date-input');
    if (modalDeliveryDateInput && window.flatpickr && !modalDeliveryDateInput._flatpickr) {
        flatpickr(modalDeliveryDateInput, { dateFormat: "Y-m-d", locale: "id" });
    }

    // Event listeners for modal calculation fields
    const packageFieldsContainer = document.getElementById('package-fields-container');
    if (packageFieldsContainer) {
        packageFieldsContainer.addEventListener('change', function(event) {
            if (event.target.matches('.paket-select') || event.target.matches('.paket-jumlah')) {
                const packageRow = event.target.closest('.package-item-row');
                if (packageRow) {
                    updateItemSubtotalDisplay(packageRow);
                    updateOverallTotalDisplay();
                }
            }
        });

        packageFieldsContainer.addEventListener('click', function(event) {
            if (event.target.matches('.remove-package-btn')) {
                const packageRow = event.target.closest('.package-item-row');
                if (packageRow) {
                    packageRow.remove();
                    updateOverallTotalDisplay();
                }
            }
        });
    }

    const addPackageBtn = document.getElementById('add-package-item-btn');
    if (addPackageBtn) {
        addPackageBtn.addEventListener('click', function() {
            addPackageRowToModal(availablePaketsForModal, null);
            // New row's subtotal will be calculated if its quantity/paket changes.
            // Or, explicitly update its subtotal if it defaults to values that should show one.
            const newRows = document.querySelectorAll('#package-fields-container .package-item-row:last-child');
            if(newRows.length > 0) updateItemSubtotalDisplay(newRows[0]);

            updateOverallTotalDisplay();
        });
    }

    const ongkirInputModal = document.getElementById('ongkir-input');
    if (ongkirInputModal) ongkirInputModal.addEventListener('change', updateOverallTotalDisplay);

    const hargaTambahanInputModal = document.getElementById('harga-tambahan-input');
    if (hargaTambahanInputModal) hargaTambahanInputModal.addEventListener('change', updateOverallTotalDisplay);

    // Function to gather data from the edit modal form
    function gatherEditModalFormData() {
        const data = {
            tanggal: document.getElementById('delivery-date-input').value,
            kurir_id: document.getElementById('kurir-select').value,
            ongkir: parseFloat(document.getElementById('ongkir-input').value) || 0,
            item_tambahan: document.getElementById('item-tambahan-input').value,
            harga_tambahan: parseFloat(document.getElementById('harga-tambahan-input').value) || 0,
            harga_modal_tambahan: parseFloat(document.getElementById('harga-modal-tambahan-input').value) || 0,
            daily_kitchen_note: document.getElementById('daily-kitchen-note')?.value || '',
            daily_courier_note: document.getElementById('daily-courier-note')?.value || '',
            package_items: [],
        };

        document.querySelectorAll('#package-fields-container .package-item-row').forEach(row => {
            const orderDetailIdInput = row.querySelector('.order-detail-id'); // Uses the hidden input
            const orderDetailId = orderDetailIdInput ? orderDetailIdInput.value : null; // Get value from hidden input

            const paketSelect = row.querySelector('.paket-select');
            const jumlahInput = row.querySelector('.paket-jumlah');
            const catatanDapurTextarea = row.querySelector('.paket-catatan-dapur');
            const catatanKurirTextarea = row.querySelector('.paket-catatan-kurir');

            if (paketSelect && paketSelect.value && jumlahInput && jumlahInput.value && parseInt(jumlahInput.value) > 0) {
                data.package_items.push({
                    order_detail_id: orderDetailId || null,
                    paket_id: parseInt(paketSelect.value),
                    jumlah: parseInt(jumlahInput.value),
                    catatan_dapur: catatanDapurTextarea ? catatanDapurTextarea.value : '',
                    catatan_kurir: catatanKurirTextarea ? catatanKurirTextarea.value : '',
                });
            }
        });
        return data;
    }

    // Function to refresh the main orders list view
    function refreshOrdersView() {
        const activePane = document.querySelector('.tab-pane.active');
        if (!activePane) {
            window.location.reload(); // Fallback
            return;
        }

        if (activePane.id === 'pane-by-name') {
            const customerSearchFormForRefresh = document.getElementById('form_search_by_name'); // Use specific ID
            const selectedCustomerId = selectedCustomerIdHidden ? selectedCustomerIdHidden.value : null;

            if (customerSearchFormForRefresh && typeof fetchAndUpdateOrdersView === 'function' && selectedCustomerId) {
                const params = new URLSearchParams(window.location.search); // Preserve existing params like limit
                params.set('view', 'by_name');
                params.set('customer_id', selectedCustomerId);
                // page will be preserved if in URL, or defaults to 1 if not set by pagination previously
                if (!params.has('page')) params.set('page', '1');

                fetchAndUpdateOrdersView(customerSearchFormForRefresh.action + '?' + params.toString());
            } else {
                 // If no customer selected or function not available, just reload.
                window.location.reload();
            }
        } else if (activePane.id === 'pane-by-date') {
            const deliveryDateSearchButtonForRefresh = document.getElementById('delivery_date_search_button');
            if (deliveryDateSearchButtonForRefresh) {
                deliveryDateSearchButtonForRefresh.click();
            } else {
                window.location.reload();
            }
        } else {
            window.location.reload();
        }
    }

    // Event listener for the Edit Order Modal form submission
    const editOrderForm = document.getElementById('edit-form');
    if (editOrderForm) {
        editOrderForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            const submitButton = document.getElementById('submit-btn'); // Ensure modal submit button has this ID
            if (!submitButton) {
                console.error('Submit button #submit-btn not found in edit modal.');
                return;
            }
            const originalButtonText = submitButton.innerHTML;
            submitButton.disabled = true;
            submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';

            const modalElement = document.getElementById('editOrderModal');
            const deliveryIdStr = modalElement.getAttribute('data-current-delivery-id');

            if (!deliveryIdStr) {
                console.error('Delivery ID not found on modal for submission.');
                if(window.showToast) window.showToast('Error', 'Cannot save: Delivery ID missing.', 'error');
                submitButton.disabled = false;
                submitButton.innerHTML = originalButtonText;
                return;
            }
            const deliveryId = parseInt(deliveryIdStr); // Ensure deliveryId is an integer

            const formData = gatherEditModalFormData();

            // Simple client-side validation: ensure at least one package item if that's a rule
            if (formData.package_items.length === 0) {
                 if(window.showToast) window.showToast('Warning', 'Harap tambahkan minimal satu paket makanan.', 'warning');
                 const errorDisplayElement = document.getElementById('edit-modal-error-display');
                 if (errorDisplayElement) {
                    errorDisplayElement.textContent = 'Harap tambahkan minimal satu paket makanan.';
                    errorDisplayElement.style.display = 'block';
                 }
                 submitButton.disabled = false;
                 submitButton.innerHTML = originalButtonText;
                 return;
            }

            // const rpcPayload = { // This was for direct Supabase RPC
            //     p_delivery_id: deliveryId,
            //     request: formData
            // };

            try {
                // The new PHP endpoint will take deliveryId from the URL.
                // The formData (which is the 'request' part of the RPC) will be the body.
                const response = await fetch(`/api/delivery-details/update/${deliveryId}`, { // User Preferred PHP Endpoint
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest', // Common header for AJAX requests
                    },
                    body: JSON.stringify(formData), // Send the 'request' data directly
                });

                const result = await response.json(); // Expecting JSON response from our PHP backend

                if (response.ok && result.success) { // Check for ok status AND success flag from our PHP response
                    if(window.showToast) window.showToast('Success', result.message || 'Order updated successfully!', 'success');

                    const bootstrapModal = bootstrap.Modal.getInstance(modalElement);
                    if (bootstrapModal) bootstrapModal.hide();
                    const errorDisplayElement = document.getElementById('edit-modal-error-display');
                    if (errorDisplayElement) errorDisplayElement.style.display = 'none';
                    refreshOrdersView();
                } else {
                    // Error from our PHP backend (either non-ok status or result.success === false)
                    throw new Error(result.message || `Failed to update order. Status: ${response.status}`);
                }
            } catch (error) {
                console.error('Error submitting edit order form via PHP backend:', error);
                const errorDisplayElement = document.getElementById('edit-modal-error-display');
                if (errorDisplayElement) {
                    errorDisplayElement.textContent = error.message;
                    errorDisplayElement.style.display = 'block';
                } else if(window.showToast) {
                    window.showToast('Error', error.message, 'error');
                }
            } finally {
                submitButton.disabled = false;
                submitButton.innerHTML = originalButtonText;
            }
        });
    }
});
