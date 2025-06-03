document.addEventListener('DOMContentLoaded', function () {
    const customerSearchInput = document.getElementById('customer_search_orders');
    const selectedCustomerIdHidden = document.getElementById('selected_customer_id_hidden');
    const customerSearchForm = customerSearchInput ? customerSearchInput.closest('form') : null;

    // --- Clear and unfocus customer search input if a customer is selected (page has reloaded with results) ---
    if (selectedCustomerIdHidden && selectedCustomerIdHidden.value && customerSearchInput) {
        // The Twig template might have pre-filled customerSearchInput with selected_customer_name.
        // We clear it here to allow for a new search if the user wants to,
        // but only if the current view is 'by_name' or default, as this input is specific to that tab.
        const currentUrlParamsForClear = new URLSearchParams(window.location.search);
        const currentViewForClear = currentUrlParamsForClear.get('view') || 'by_name';
        if (currentViewForClear === 'by_name') {
            customerSearchInput.value = '';
            customerSearchInput.blur();
            console.log('Customer search input cleared and unfocused as a customer is selected in "by_name" view.');
        }
    }

    if (customerSearchInput && selectedCustomerIdHidden && customerSearchForm) {
        // Initialize Awesomplete
        const awesompleteInstance = new Awesomplete(customerSearchInput, {
            minChars: 2,
            autoFirst: true,
            filter: function (text, input) {
                // Awesomplete's default FILTER_CONTAINS is case-sensitive.
                // For case-insensitive, we can implement it, or rely on server to send filtered list if possible.
                // For now, let's use a basic case-insensitive client-side filter.
                return Awesomplete.FILTER_CONTAINS(text, input); // Default is often good enough if list is not huge.
                                                              // Or, for true case-insensitivity:
                                                              // return text.label.toLowerCase().includes(input.toLowerCase());

            },
            // The 'item' property is now removed
            // The list will be populated via an AJAX call
        });

        // Fetch customer data for Awesomplete
        fetch('/api/customers') // Assuming this endpoint returns [{id: X, nama: 'Y'}, ...]
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok for fetching customers');
                }
                return response.json();
            })
            .then(data => {
                console.log('Awesomplete: Raw data from /api/customers:', data); // <<< ADD THIS
                if (Array.isArray(data)) { // Check if data is an array as expected
                    const customerList = data.map(customer => ({
                        label: customer.nama, // 'nama' is the field name from existing /api/customers
                        value: customer.id    // 'id' is the field name
                    }));
                    console.log('Awesomplete: Processed customerList:', customerList); // <<< ADD THIS
                    awesompleteInstance.list = customerList;
                    if (customerList.length > 0) {
                        awesompleteInstance.evaluate(); // <<< ADD THIS LINE
                    } else {
                        console.warn('Awesomplete: Customer list is empty after processing.'); // <<< ADD THIS
                    }
                } else if (data && Array.isArray(data.customers)) {
                    // If the API returns {customers: [...]} like in another part of the app
                     const customerList = data.customers.map(customer => ({
                        label: customer.nama,
                        value: customer.id
                    }));
                    console.log('Awesomplete: Processed customerList (from data.customers):', customerList); // <<< ADD THIS
                    awesompleteInstance.list = customerList;
                    if (customerList.length > 0) {
                        awesompleteInstance.evaluate(); // <<< ADD THIS LINE HERE TOO
                    } else {
                        console.warn('Awesomplete: Customer list (from data.customers) is empty after processing.'); // <<< ADD THIS
                    }
                } else {
                    console.error('Awesomplete: Customer data is not in the expected array format:', data);
                    awesompleteInstance.list = []; // Set to empty list on error
                }
            })
            .catch(error => {
                console.error('Error fetching or processing customer data for Awesomplete:', error);
                awesompleteInstance.list = []; // Set to empty list on error
            });

        // Event listener for when an item is selected
        customerSearchInput.addEventListener('awesomplete-selectcomplete', function (event) {
            const selection = event.text;
            console.log('Awesomplete: Item selected:', selection); // <<< ADD THIS
            customerSearchInput.value = selection.label; // Keep the name in the visible input
            selectedCustomerIdHidden.value = selection.value; // Set the ID in the hidden input

            // Submit the form
            customerSearchForm.submit();
        });

        // If there's an initial value in the hidden field (e.g., from server-side rendering
        // after a previous selection), and the text field is also pre-filled by the server,
        // no special JS action is needed here for pre-filling, as Twig handles it.
        // The JS above is for dynamic client-side selection.
    }

    // --- For "By Order ID" Tab ---
    const orderIdSearchInput = document.getElementById('order_id_search_input'); // Will be created in HTML next
    const orderIdSearchButton = document.getElementById('order_id_search_button'); // Will be created in HTML next
    const orderIdSearchResultsContainer = document.getElementById('order_id_search_results_container'); // Will be created in HTML next

    if (orderIdSearchButton && orderIdSearchInput && orderIdSearchResultsContainer) {
        orderIdSearchButton.addEventListener('click', function() {
            const query = orderIdSearchInput.value.trim();
            orderIdSearchResultsContainer.innerHTML = '<p>Loading...</p>'; // Basic loading indicator

            if (!query || !/^[0-9]+$/.test(query)) {
                orderIdSearchResultsContainer.innerHTML = '<p class="text-danger">Please enter a valid numeric Order ID.</p>';
                return;
            }

            fetch(`/api/orders/search/id?order_id_query=${encodeURIComponent(query)}`)
                .then(response => {
                    if (!response.ok) {
                        // Try to parse error from JSON if possible, otherwise use statusText
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
                        // Simple display, can be enhanced with a table or definition list
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
    } else {
        // This indicates that the HTML elements for the "By Order ID" tab might not be set up yet.
        // console.warn('Elements for "By Order ID" tab not fully found. HTML structure might be pending.');
    }

    // --- For "By Date" Tab ---
    const deliveryDateSearchInput = document.getElementById('delivery_date_search_input');
    const deliveryDateSearchButton = document.getElementById('delivery_date_search_button');
    const deliveryDateSearchResultsContainer = document.getElementById('delivery_date_search_results_container');

    if (deliveryDateSearchInput) {
        if (typeof flatpickr !== "undefined") {
            if (flatpickr.l10ns && flatpickr.l10ns.id) { // Check if Indonesian locale is loaded
                flatpickr.localize(flatpickr.l10ns.id);
            }
            flatpickr(deliveryDateSearchInput, {
                dateFormat: "Y-m-d",
                locale: "id", // Will use Indonesian if loaded, otherwise defaults
                // altInput: true, // Optionally show a human-friendly format
                // altFormat: "j F Y",
            });
        } else {
            console.warn('Flatpickr not available. Date input will be text only.');
        }
    }

    function renderDeliveriesTable(deliveries, container) {
        if (!deliveries || deliveries.length === 0) {
            container.innerHTML = '<p class="text-muted">No deliveries to display for this date.</p>';
            return;
        }

        let tableHtml = '<div class="table-responsive"><table class="table table-vcenter mt-3">';
        tableHtml += `<thead><tr>
            <th>Customer</th>
            <th>Order ID</th>
            <th>Delivery Date</th>
            <th>Status</th>
            <th>Courier</th>
            <th>Items</th>
            <th>Total (Day)</th>
            </tr></thead><tbody>`;

        deliveries.forEach(delivery => {
            const customerName = delivery.orders && delivery.orders.customers ? delivery.orders.customers.nama : 'N/A';
            const orderId = delivery.orders ? delivery.orders.id : 'N/A';
            const deliveryDate = delivery.tanggal ? new Date(delivery.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';

            let statusHtml = delivery.status || 'N/A';
            if (delivery.status) {
                const statusLower = delivery.status.toLowerCase();
                let badgeClass = 'secondary';
                if (statusLower === 'completed') badgeClass = 'success';
                else if (statusLower === 'pending') badgeClass = 'warning';
                else if (statusLower === 'canceled' || statusLower === 'cancelled') badgeClass = 'danger';
                else if (statusLower === 'in-progress' || statusLower === 'in_progress') badgeClass = 'info';
                statusHtml = `<span class="badge bg-${badgeClass} me-1"></span> ${delivery.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`;
            }

            const totalPerHari = delivery.total_harga_perhari ? Number(delivery.total_harga_perhari).toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }) : 'N/A';
            const courierName = delivery.couriers ? delivery.couriers.nama : 'N/A';

            let itemsHtml = '<ul class="list-unstyled mb-0 small">';
            if (delivery.orderdetails && delivery.orderdetails.length > 0) {
                delivery.orderdetails.forEach(detail => {
                    const packageName = detail.paket && detail.paket.nama ? detail.paket.nama : 'N/A';
                    itemsHtml += `<li>${packageName} (Qty: ${detail.jumlah || 0})`;
                    if (detail.catatan_dapur) itemsHtml += `<br><em>Dapur: ${detail.catatan_dapur}</em>`;
                    if (detail.catatan_kurir) itemsHtml += `<br><em>Kurir: ${detail.catatan_kurir}</em>`;
                    itemsHtml += `</li>`;
                });
            }
            if (delivery.item_tambahan) {
                itemsHtml += `<li>${delivery.item_tambahan} (Tambahan: Rp ${Number(delivery.harga_tambahan || 0).toLocaleString('id-ID')})</li>`;
            }
            if (itemsHtml === '<ul class="list-unstyled mb-0 small">') itemsHtml = 'N/A'; else itemsHtml += '</ul>';

            tableHtml += `<tr>
                <td>${customerName}</td>
                <td>${orderId}</td>
                <td>${deliveryDate}</td>
                <td>${statusHtml}</td>
                <td>${courierName}</td>
                <td>${itemsHtml}</td>
                <td>${totalPerHari}</td>
                </tr>`;
        });

        tableHtml += '</tbody></table></div>';
        container.innerHTML = tableHtml;
    }

    if (deliveryDateSearchButton && deliveryDateSearchInput && deliveryDateSearchResultsContainer) {
        deliveryDateSearchButton.addEventListener('click', function() {
            const selectedDate = deliveryDateSearchInput.value;
            deliveryDateSearchResultsContainer.innerHTML = '<p class="text-center">Loading...</p>';

            if (!selectedDate || !/^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
                deliveryDateSearchResultsContainer.innerHTML = '<p class="text-danger text-center">Please select a valid date in YYYY-MM-DD format.</p>';
                return;
            }

            fetch(`/api/orders/search/date?date=${encodeURIComponent(selectedDate)}`)
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
                    if (data.success && data.deliveries) { // Check for data.deliveries presence
                        if (data.deliveries.length > 0) {
                            renderDeliveriesTable(data.deliveries, deliveryDateSearchResultsContainer);
                        } else {
                             deliveryDateSearchResultsContainer.innerHTML = `<p class="text-muted text-center">${data.message || 'No deliveries found for this date.'}</p>`;
                        }
                    } else {
                        deliveryDateSearchResultsContainer.innerHTML = `<p class="text-warning text-center">${data.message || 'Error fetching data.'}</p>`;
                    }
                })
                .catch(error => {
                    console.error('Error fetching deliveries by date:', error);
                    deliveryDateSearchResultsContainer.innerHTML = `<p class="text-danger text-center">Error: ${error.message}</p>`;
                });
        });
    } else {
        // console.warn('Elements for "By Date" tab not fully found. HTML structure might be pending.');
    }

    // --- Save active tab to localStorage ---
    const tabButtons = document.querySelectorAll('#orders-view-tabs .nav-link[data-bs-toggle="tab"]');

    // Get References to Search Forms
    const formSearchByName = document.getElementById('form_search_by_name');
    const formSearchByOrderId = document.getElementById('form_search_by_order_id');
    const formSearchByDate = document.getElementById('form_search_by_date');
    const allSearchForms = [formSearchByName, formSearchByOrderId, formSearchByDate].filter(form => form !== null);

    // Function to manage search form visibility
    function updateSearchFormVisibility(activeTabTarget) {
        allSearchForms.forEach(form => {
            if (form) form.style.display = 'none'; // Hide all forms first
        });

        let formToShow = null;
        if (activeTabTarget === '#pane-by-name' && formSearchByName) {
            formToShow = formSearchByName;
        } else if (activeTabTarget === '#pane-by-order-id' && formSearchByOrderId) {
            formToShow = formSearchByOrderId;
        } else if (activeTabTarget === '#pane-by-date' && formSearchByDate) {
            formToShow = formSearchByDate;
        }

        if (formToShow) {
            formToShow.style.display = 'flex'; // Use 'flex' as it's common for inline-ish forms in Tabler
            console.log('Showing form for target:', activeTabTarget, formToShow);
        } else {
            console.warn('No specific search form to show for target:', activeTabTarget);
        }
    }

    tabButtons.forEach(tabButton => {
        tabButton.addEventListener('shown.bs.tab', function (event) {
            const activeTabTarget = event.target.getAttribute('data-bs-target');
            if (activeTabTarget) {
                localStorage.setItem('activeOrdersTab', activeTabTarget);
                console.log('Active tab target saved:', activeTabTarget);
                updateSearchFormVisibility(activeTabTarget); // Call the new function
            }
        });
    });

    // --- Activate tab from localStorage if no view in URL ---
    // Also handles initial search form visibility based on the active tab (either from URL or localStorage or default)
    const currentUrlParams = new URLSearchParams(window.location.search);
    const urlView = currentUrlParams.get('view');
    let activeTabTargetOnLoad = null;

    if (urlView) {
        console.log('View is set by URL parameter, localStorage tab preference ignored:', urlView);
        if (urlView === 'by_name') activeTabTargetOnLoad = '#pane-by-name';
        else if (urlView === 'by_order_id') activeTabTargetOnLoad = '#pane-by-order-id';
        else if (urlView === 'by_date') activeTabTargetOnLoad = '#pane-by-date';
    } else {
        const savedTabTarget = localStorage.getItem('activeOrdersTab');
        if (savedTabTarget) {
            const tabButtonToActivate = document.querySelector(`#orders-view-tabs .nav-link[data-bs-target="${savedTabTarget}"]`);
            if (tabButtonToActivate) {
                if (typeof bootstrap !== 'undefined' && typeof bootstrap.Tab !== 'undefined') {
                    console.log('Activating tab from localStorage:', savedTabTarget);
                    const tabInstance = bootstrap.Tab.getOrCreateInstance(tabButtonToActivate);
                    if (tabInstance) {
                        tabInstance.show(); // This will trigger 'shown.bs.tab' and updateSearchFormVisibility
                        activeTabTargetOnLoad = savedTabTarget; // Set for clarity, though 'shown.bs.tab' handles it
                    } else { console.warn('Could not create or get tab instance for:', savedTabTarget); }
                } else { console.warn('Bootstrap Tab API not available for activating tab from localStorage.'); }
            } else { console.warn('Saved tab button not found for target:', savedTabTarget); }
        }
    }

    // Ensure correct form is visible on initial load if not handled by 'shown.bs.tab' from localStorage activation
    // or if it's the default tab determined by Twig (which already sets inline style).
    // This explicit call ensures JS takes over from Twig's inline styles if needed.
    if (activeTabTargetOnLoad) { // A tab was activated by URL or localStorage (via JS .show())
         // The 'shown.bs.tab' listener would have called updateSearchFormVisibility.
         // If it was activated by URL, Twig handled display. JS ensures it's correct if Twig missed.
         // To be certain, especially if Twig's default display style for non-active tabs is not 'none'.
        updateSearchFormVisibility(activeTabTargetOnLoad);
    } else if (!urlView && !localStorage.getItem('activeOrdersTab')) {
        // This is the true default case: no URL param, no localStorage.
        // Twig should have set the 'by_name' tab and its form to be visible.
        // Call updateSearchFormVisibility to ensure JS state matches.
        updateSearchFormVisibility('#pane-by-name');
    }

    // --- Delete Delivery Confirmation Modal Logic ---
    const deleteConfirmModalElement = document.getElementById('deleteDeliveryConfirmModal');
    let deleteConfirmModalInstance = null;
    if (deleteConfirmModalElement && typeof bootstrap !== 'undefined') {
        deleteConfirmModalInstance = new bootstrap.Modal(deleteConfirmModalElement);
    }
    // const deleteConfirmModalTitle = document.getElementById('deleteDeliveryConfirmModal-title'); // Title set by Twig
    const deleteConfirmModalMessage = document.getElementById('deleteDeliveryConfirmModal-message');
    const deleteConfirmModalConfirmBtn = document.getElementById('deleteDeliveryConfirmModal-confirm');
    let deliveryIdToDelete = null;

    const tabContentForDelete = document.getElementById('orders-tab-content');
    if (tabContentForDelete && deleteConfirmModalInstance) {
        tabContentForDelete.addEventListener('click', function(event) {
            const deleteButton = event.target.closest('.delete-delivery-btn');
            if (deleteButton) {
                event.preventDefault();
                deliveryIdToDelete = deleteButton.getAttribute('data-delivery-id');

                if (deleteConfirmModalMessage) {
                    deleteConfirmModalMessage.innerHTML = `Apakah Anda yakin ingin menghapus data pengiriman dengan ID: <strong>${deliveryIdToDelete}</strong>? Data yang sudah dihapus tidak dapat dikembalikan.`;
                }
                deleteConfirmModalInstance.show();
            }
        });
    } else {
        if (!tabContentForDelete) console.warn('Delete logic: #orders-tab-content not found.');
        if (!deleteConfirmModalInstance) console.warn('Delete logic: deleteConfirmModalInstance not initialized. Bootstrap Modal JS might be missing or modal HTML.');
    }

    if (deleteConfirmModalConfirmBtn && deleteConfirmModalInstance) {
        deleteConfirmModalConfirmBtn.addEventListener('click', function() {
            if (deliveryIdToDelete) {
                performDeleteDelivery(deliveryIdToDelete);
                deliveryIdToDelete = null;
            }
            deleteConfirmModalInstance.hide();
        });
    }

    function performDeleteDelivery(deliveryId) {
        console.log('Attempting to delete delivery ID:', deliveryId);

        // Assuming showToast is globally available or imported
        // You might need to pass it or ensure its scope if it's from utils.js
        const showToast = window.showToast || function(title, message, isError = false) { // Basic fallback
            alert(`${title}: ${message}`);
            if(isError) console.error(message); else console.log(message);
        };


        fetch(`/api/delivery/${deliveryId}`, {
            method: 'DELETE',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                // Add any other necessary headers, like CSRF tokens if your app uses them
            }
        })
        .then(response => {
            if (!response.ok) {
                // Try to get error message from JSON response, then fallback to statusText
                return response.json().then(errData => {
                    throw new Error(errData.message || `Error deleting delivery. Status: ${response.status}`);
                }).catch(() => { // Fallback if response isn't JSON or .json() fails
                    throw new Error(`Error deleting delivery. Status: ${response.status} - ${response.statusText}`);
                });
            }
            return response.json(); // Or response.text() if the API returns no body or non-JSON on success
        })
        .then(data => {
            if (data.success) {
                // Remove the row from the table
                // The row can be identified by a data attribute or by finding the button and its parent row
                const rowToRemove = document.querySelector(`.delete-delivery-btn[data-delivery-id="${deliveryId}"]`)?.closest('tr');
                if (rowToRemove) {
                    rowToRemove.remove();
                    console.log('Row removed for delivery ID:', deliveryId);
                } else {
                    console.warn('Could not find row to remove for delivery ID:', deliveryId, '. Consider reloading list.');
                    // Optionally, trigger a full list refresh for the current view if row removal is complex
                }
                showToast('Sukses', data.message || `Pengiriman ID ${deliveryId} berhasil dihapus.`);
            } else {
                // Handle cases where success is false but HTTP was OK (e.g., validation error from API)
                showToast('Error', data.message || `Gagal menghapus pengiriman ID ${deliveryId}.`, true);
            }
        })
        .catch(error => {
            console.error('Error in performDeleteDelivery:', error);
            showToast('Error', error.message || `Terjadi kesalahan saat menghapus pengiriman ID ${deliveryId}.`, true);
        });
    }
});
