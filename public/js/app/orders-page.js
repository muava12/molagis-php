document.addEventListener('DOMContentLoaded', function () {
    const CALENDAR_ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" class="icon me-2" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12z"></path><path d="M16 3v4"></path><path d="M8 3v4"></path><path d="M4 11h16"></path><path d="M11 15h1"></path><path d="M12 15v3"></path></svg>';
    const DEFAULT_CARD_TITLE = "Manajemen Pesanan";
    const MAGNIFIER_ICON_HTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-1"><path d="M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0"></path><path d="M21 21l-6 -6"></path></svg>';
    const SPINNER_HTML = '<div class="spinner-border spinner-border-sm text-secondary" role="status"></div>';

    const cardTitleElement = document.querySelector('.card .card-header .card-title');
    if (!cardTitleElement) {
        console.error('Card title element (.card .card-header .card-title) not found.');
    }

    const customerSearchInput = document.getElementById('customer_search_orders');
    let iconAddonSpan = null;
    let awesompleteInstance = null; // Declare here for broader scope

    if (customerSearchInput) {
        if (customerSearchInput.parentElement && customerSearchInput.parentElement.classList.contains('input-icon')) {
            iconAddonSpan = customerSearchInput.parentElement.querySelector('.input-icon-addon');
            if (!iconAddonSpan) {
                console.error('Icon addon span (.input-icon-addon) not found within the parent of customer_search_orders.');
            }
        } else {
            console.error('Parent of customer_search_orders is not the expected div.input-icon.');
        }
    } else {
        console.error('Customer search input (customer_search_orders) not found.');
    }
    const selectedCustomerIdHidden = document.getElementById('selected_customer_id_hidden');
    const customerSearchForm = document.getElementById('form_search_by_name'); // Use specific ID
    // const customerSearchSpinner = document.getElementById('customer_search_spinner_addon'); // Removed
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
        // ---- NEW CODE START ----
        if (iconAddonSpan) {
            iconAddonSpan.innerHTML = SPINNER_HTML;
        }
        // ---- NEW CODE END ----

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
                const absoluteUrl = new URL(url, window.location.origin); // Renamed to avoid conflict
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

                // --- Update Card Title Logic ---
                if (cardTitleElement) {
                    const customerIdForTitle = currentUrlParams.get('customer_id');
                    const currentViewForTitle = currentView;

                    // Try to find an existing avatar span
                    let avatarSpan = cardTitleElement.querySelector('span.avatar');

                    if (currentViewForTitle === 'by_name' && customerIdForTitle) {
                        let customerName = null;
                        // Try to find customer name from awesomplete list
                        if (typeof awesompleteInstance !== 'undefined' && awesompleteInstance && awesompleteInstance.list) {
                            const selectedCustomer = awesompleteInstance.list.find(customer => String(customer.value) === String(customerIdForTitle));
                            if (selectedCustomer && selectedCustomer.label) {
                                customerName = selectedCustomer.label;
                            }
                        }

                        // Fallback to dataset if not found in awesomplete
                        if (!customerName && selectedCustomerIdHidden && selectedCustomerIdHidden.dataset.selectedName && selectedCustomerIdHidden.value === customerIdForTitle) {
                            customerName = selectedCustomerIdHidden.dataset.selectedName;
                        }

                        if (customerName) {
                            if (!avatarSpan) {
                                avatarSpan = document.createElement('span');
                                avatarSpan.className = 'avatar avatar-sm me-2'; // Ensure classes match SSR
                            }
                            avatarSpan.style.backgroundImage = `url(https://api.dicebear.com/9.x/avataaars-neutral/svg?seed=${customerIdForTitle}&scale=90&backgroundColor=ae5d29,d08b5b,edb98a,fd9841,ffdbb4,f8d25c&backgroundRotation=0,360,50,40,80,110&eyebrows=angryNatural,default,defaultNatural,flatNatural,raisedExcited,raisedExcitedNatural,sadConcerned,sadConcernedNatural,unibrowNatural,upDown,upDownNatural,angry&eyes=cry,default,eyeRoll,happy,side,squint,surprised,wink,winkWacky&mouth=concerned,default,disbelief,eating,grimace,sad,screamOpen,serious,smile,tongue,twinkle)`;
                            avatarSpan.style.display = ''; // Ensure it's visible

                            // Reconstruct the innerHTML of cardTitleElement to include avatar and name
                            cardTitleElement.innerHTML = ''; // Clear previous content
                            cardTitleElement.appendChild(avatarSpan);
                            cardTitleElement.appendChild(document.createTextNode(' ' + customerName));
                            cardTitleElement.classList.add('d-flex', 'align-items-center');
                        } else {
                            // Customer ID present, but name not found
                            console.warn(`Customer name for ID ${customerIdForTitle} not found for card title update.`);
                            cardTitleElement.classList.remove('d-flex', 'align-items-center');
                            cardTitleElement.innerHTML = DEFAULT_CARD_TITLE; // Clears avatar if it was there
                        }
                    } else {
                        // Not 'by_name' view, or no customer_id in 'by_name' view
                        cardTitleElement.classList.remove('d-flex', 'align-items-center');
                        cardTitleElement.innerHTML = DEFAULT_CARD_TITLE; // Clears avatar and sets default title
                    }
                }
                // --- End Update Card Title Logic ---
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
            window.location.href = url; // Existing error handling
        } finally {
            // ---- NEW CODE START ----
            if (iconAddonSpan) {
                iconAddonSpan.innerHTML = MAGNIFIER_ICON_HTML;
            }
            // ---- NEW CODE END ----
        }
    }

    if (customerSearchInput && selectedCustomerIdHidden && customerSearchForm) {
        awesompleteInstance = new Awesomplete(customerSearchInput, { // Assign to the outer scope variable
            minChars: 2,
            autoFirst: true,
        filter: Awesomplete.FILTER_CONTAINS, // Existing filter
        sort: (a, b) => { // Added sort function
            const inputText = customerSearchInput.value.toLowerCase();
            const aStartsWith = a.label.toLowerCase().startsWith(inputText);
            const bStartsWith = b.label.toLowerCase().startsWith(inputText);
            return aStartsWith && !bStartsWith ? -1 : !aStartsWith && bStartsWith ? 1 : a.label.localeCompare(b.label);
        }
        });

        // ---- JS TO SET LOADING STATE ----
        if (iconAddonSpan) {
            iconAddonSpan.innerHTML = SPINNER_HTML;
        }
        // Placeholder remains "Ketik nama pelanggan..." from HTML initially.

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

                // ---- JS TO SET SUCCESS STATE ----
                if (iconAddonSpan) {
                    iconAddonSpan.innerHTML = MAGNIFIER_ICON_HTML;
                }
                customerSearchInput.placeholder = 'Ketik nama pelanggan...'; // Confirm placeholder
            })
            .catch(error => {
                console.error('Error fetching customer data for Awesomplete:', error);
                // ---- JS TO SET ERROR STATE ----
                if (iconAddonSpan) {
                    iconAddonSpan.innerHTML = MAGNIFIER_ICON_HTML;
                }
                customerSearchInput.placeholder = 'Gagal memuat daftar pelanggan'; // Error placeholder
            });

        customerSearchInput.addEventListener('awesomplete-selectcomplete', function (event) {
            const selection = event.text;
            customerSearchInput.value = selection.label; // Keep this for form data if needed by other parts
            selectedCustomerIdHidden.value = selection.value;
            // Store the selected name on the hidden input or a global variable for easier access later
            if (selectedCustomerIdHidden) { // Ensure element exists
                selectedCustomerIdHidden.dataset.selectedName = selection.label; // Storing on dataset
            }

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
    let deliveryDateFlatpickrInstance = null;

    if (deliveryDateSearchInput && typeof flatpickr !== "undefined") {
        deliveryDateFlatpickrInstance = flatpickr(deliveryDateSearchInput, { dateFormat: "Y-m-d", locale: "id" });
    }

    // Function to set today's date if input is empty
    function ensureDateInputIsPopulated() {
        if (deliveryDateSearchInput && deliveryDateSearchInput.value === '') {
            const today = new Date().toISOString().slice(0, 10);
            deliveryDateSearchInput.value = today;
            if (deliveryDateFlatpickrInstance) {
                deliveryDateFlatpickrInstance.setDate(today, false); // false to not trigger onChange
            }
        }
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
                        let html = '<div class="table-responsive"><table class="table table-vcenter card-table table-striped">'; // Removed table-selectable, Added div
                        html += `
                            <thead>
                                <tr>
                                    <th>Customer</th>
                                    <th>Order ID</th>
                                    <th>Items</th>
                                    <th>Notes (Dapur/Kurir)</th>
                                    <th>Kurir</th>
                                    <th>Pembayaran</th>
                                    <th>Ongkir</th>
                                    <th>Total</th>
                                    <th>Status</th>
                                    <th class="w-1">Aksi</th>
                                </tr>
                            </thead>
                        <tbody>`;

                        if (data.deliveries.length === 0) {
                            const emptyStateHtml = `
                            <div class="empty-state-card text-center py-5">
                <svg width="200px" height="200px" viewBox="0 0 1024 1024" class="icon" version="1.1" xmlns="http://www.w3.org/2000/svg" style="margin-bottom: 1rem;">
                                    <path d="M484.32 375.24C575.25 255.5 857.87 527.6 788.67 581.07c-94.76 73.21-491.01 39.99-304.35-205.83z" fill="#1C80AA" />
                                    <path d="M401.03 749.89l-4.85 133.8-77.69 21.37h66.36l19.42 35.27 4.86-35.27 40.46 6.14-38.84-25.89 8.09-114.91-17.81-20.51zM524.36 771.23l10.48 133.48-74.73 30.11 65.92-7.59 23.33 32.82 0.79-35.6 40.89 1.48-41.54-21.28-5.11-115.08-20.03-18.34z" fill="#3B5174" />
                                    <path d="M224.73 264.77l-24 50.19a21.7 21.7 0 0 1-37.73 2.5l-31.57-48.27a21.7 21.7 0 0 1 17.41-33.57l55.61-1.92a21.7 21.7 0 0 1 20.28 31.07z" fill="#DE7B56" />
                                    <path d="M900.53 638.76c-18.3 86.91-221.86 208.13-478 171.54C150.46 771.44 26 281.88 315 103.56c161.25-99.49 326.71 5 356.8 130.37C713 405.47 583.15 534.58 749.57 609c86.91 38.91 164.43-34.33 150.96 29.76z" fill="#FDD2BE" />
                                    <path d="M365.86 264.78m-32.45 0a32.45 32.45 0 1 0 64.9 0 32.45 32.45 0 1 0-64.9 0Z" fill="" />
                                    <path d="M512.24 366c137.48-60.86 253.34 314 166.92 327.31C560.81 711.56 230 490.92 512.24 366zM223.3 530c-9.34-2.6-17.2-12.8-23.94-31a195 195 0 0 1-7.64-27 7.28 7.28 0 0 1 14.3-2.79c4.79 24.5 15 46.44 21.91 46.93 1.12 0.08 11.43-0.5 27.23-45.51a7.28 7.28 0 1 1 13.74 4.82c-13.61 38.77-27 56.31-42 55.22a18.18 18.18 0 0 1-3.6-0.67zM340.8 590.36c-9.63 1.14-20.77-5.32-33.92-19.63a195 195 0 0 1-17.32-22.11 7.28 7.28 0 0 1 12.17-8c13.73 20.85 31.53 37.27 38.07 35.12 1.07-0.35 10.38-4.8 7.93-52.44a7.28 7.28 0 1 1 14.55-0.75c2.11 41-3.59 62.33-17.95 67a18.18 18.18 0 0 1-3.53 0.81zM261.5 659.71c-9-0.19-18.35-7.55-28.56-22.35a180.41 180.41 0 0 1-13-22.49 6.74 6.74 0 0 1 12.18-5.77c9.9 20.88 24.1 38.21 30.37 37.08 1-0.18 10.13-3.07 14-47a6.74 6.74 0 1 1 13.43 1.18c-3.34 37.87-11.31 56.66-25.07 59.12a16.82 16.82 0 0 1-3.35 0.23zM389.28 722.29c-9.26 2.85-21.38-1.51-36.89-13.22a195 195 0 0 1-21-18.64 7.28 7.28 0 0 1 10.53-10.06c17.25 18.05 37.7 31 43.75 27.71 1-0.54 9.35-6.59-1.61-53a7.28 7.28 0 1 1 14.17-3.35c9.44 40 7.65 62-5.63 69.16a18.18 18.18 0 0 1-3.32 1.4z" fill="#22B0C3" />
                                </svg>
                                <p class="mt-3">Tidak ada pengiriman untuk tanggal ini.</p>
                            </div>`;
                            deliveryDateSearchResultsContainer.innerHTML = emptyStateHtml;
                        } else {
                            data.deliveries.forEach(delivery => {
                                // New "Items" cell HTML generation logic
                                let itemsCellHtml = '';
                                const packageItems = delivery.items && delivery.items.items && Array.isArray(delivery.items.items) ? delivery.items.items : [];
                                const rawAdditionalItems = delivery.items && delivery.items.additional_items && Array.isArray(delivery.items.additional_items) ? delivery.items.additional_items : [];
                                const subtotalHargaNumber = delivery.subtotal_harga !== null && delivery.subtotal_harga !== undefined ? Number(delivery.subtotal_harga) : 0;

                                if (packageItems.length > 0 || rawAdditionalItems.filter(addItem => addItem.item_name && addItem.item_name.trim() !== '' && addItem.item_name.trim().toUpperCase() !== 'N/A').length > 0 || subtotalHargaNumber > 0) {
                                    itemsCellHtml = '<ul class="list-unstyled mb-0">';

                                    if (packageItems.length > 0) {
                                        itemsCellHtml += '<li>Paket:</li>';
                                        itemsCellHtml += '<ul class="list-unstyled ps-3 mb-1">';
                                        packageItems.forEach(item => {
                                            const itemName = item.package_name || 'N/A';
                                            const itemQuantity = item.quantity !== null && item.quantity !== undefined ? item.quantity : 'N/A';
                                            let priceString = '';
                                            if (item.price !== null && item.price !== undefined) { // Changed from item.harga_jual to item.price
                                                priceString = ` <span class="text-muted">@ ${Number(item.price).toLocaleString('id-ID')}</span>`; // Changed from item.harga_jual to item.price
                                            }
                                            itemsCellHtml += `<li>${itemQuantity}x ${itemName}${priceString}</li>`;
                                        });
                                        itemsCellHtml += '</ul>';
                                    }

                                    const validAdditionalItems = rawAdditionalItems.filter(addItem => addItem.item_name && addItem.item_name.trim() !== '' && addItem.item_name.trim().toUpperCase() !== 'N/A');

                                    if (validAdditionalItems.length > 0) {
                                        itemsCellHtml += '<li>Tambahan:</li>';
                                        itemsCellHtml += '<ul class="list-unstyled ps-3 mb-1">';
                                        validAdditionalItems.forEach(addItem => {
                                            const addItemName = addItem.item_name; // Use directly, already validated
                                            const addItemQuantity = addItem.quantity !== null && addItem.quantity !== undefined ? addItem.quantity : 1; // Default quantity to 1 if not present
                                            let addItemPriceString = '';
                                            if (addItem.price !== null && addItem.price !== undefined && Number(addItem.price) > 0) {
                                                addItemPriceString = ` <span class="text-muted">@ ${Number(addItem.price).toLocaleString('id-ID')}</span>`;
                                            }
                                            itemsCellHtml += `<li>${addItemQuantity}x ${addItemName}${addItemPriceString}</li>`;
                                        });
                                        itemsCellHtml += '</ul>';
                                    }

                                    itemsCellHtml += `<li class="mt-1 text-muted"><strong>Subtotal Items: ${subtotalHargaNumber.toLocaleString('id-ID')}</strong></li>`;
                                    itemsCellHtml += '</ul>';
                                } else {
                                    itemsCellHtml = '<span class="text-muted">- No items -</span>';
                                }
                                // End of new "Items" cell HTML generation logic

                                console.log('JS Total Calc - Incoming data: delivery.subtotal_harga:', delivery.subtotal_harga, 'delivery.ongkir:', delivery.ongkir);
                                const itemsSubtotal = Number(delivery.subtotal_harga || 0);
                                const shippingCost = Number(delivery.ongkir || 0);
                                console.log('JS Total Calc - Numeric values: itemsSubtotal:', itemsSubtotal, 'shippingCost:', shippingCost);
                                const grandTotal = itemsSubtotal + shippingCost;
                                const grandTotalDisplay = grandTotal.toLocaleString('id-ID');
                                console.log('JS Total Calc - Final grandTotalDisplay:', grandTotalDisplay);

                                let customerName = delivery.customer_name || 'N/A';
                                let orderIdLink = delivery.order_id ? `<a href="/orders?view=by_order_id&order_id_query=${delivery.order_id}">#${delivery.order_id}</a>` : 'N/A';

                                let notesCellHtml = '';
                                let kitchenNoteDisplay = delivery.kitchen_note && delivery.kitchen_note.trim() !== '' ? `<small class="d-block"><strong>Dapur:</strong> ${delivery.kitchen_note}</small>` : '';
                                let courierNoteDisplay = delivery.courier_note && delivery.courier_note.trim() !== '' ? `<small class="d-block"><strong>Kurir:</strong> ${delivery.courier_note}</small>` : '';
                                if (kitchenNoteDisplay || courierNoteDisplay) {
                                    notesCellHtml = kitchenNoteDisplay + courierNoteDisplay;
                                } else {
                                    notesCellHtml = '<span class="text-muted">-</span>';
                                }

                                let courierName = delivery.courier_name || 'N/A';
                                let paymentMethod = delivery.payment_method ? delivery.payment_method.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'N/A';
                                let ongkirDisplay = Number(delivery.ongkir || 0).toLocaleString('id-ID'); // Retain for "Ongkir" column
                                // let subtotalHarga = delivery.subtotal_harga ? Number(delivery.subtotal_harga).toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }) : 'N/A'; // Replaced by grandTotalDisplay for the "Total" column

                                let badge_class = 'badge ';
                                const status_lower = delivery.status ? String(delivery.status).toLowerCase().trim() : ''; // Ensure string and trim
                                if (status_lower === 'selesai' || status_lower === 'completed') {
                                    badge_class += 'bg-success-lt';
                                } else if (status_lower === 'pending' || status_lower === 'terjadwal') {
                                    badge_class += 'bg-warning-lt';
                                } else if (status_lower === 'dibatalkan' || status_lower === 'cancelled' || status_lower === 'canceled') {
                                    badge_class += 'bg-danger-lt';
                                } else { // All other statuses, including 'in-progress', 'sedang dikirim', etc.
                                    badge_class += 'bg-secondary-lt';
                                }
                                let statusDisplay = delivery.status ? delivery.status : 'N/A'; // Use raw status or N/A

                                html += `
                                    <tr id="delivery-row-${delivery.delivery_id}">
                                        <td>${customerName}</td>
                                        <td>${orderIdLink}</td>
                                        <td>${itemsCellHtml}</td>
                                        <td>${notesCellHtml}</td>
                                        <td>${courierName}</td>
                                        <td>${paymentMethod}</td>
                                        <td>${ongkirDisplay}</td>
                                        <td>${grandTotalDisplay}</td>
                                        <td><span class="${badge_class}">${statusDisplay}</span></td>
                                        <td>
                                            <div class="btn-list flex-nowrap">
                                                <button class="btn btn-sm btn-icon edit-delivery-btn" data-delivery-id="${delivery.delivery_id}" title="Edit Pengiriman">
                                                    <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-pencil" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4" /><path d="M13.5 6.5l4 4" /></svg>
                                                </button>
                                                <button class="btn btn-sm btn-icon delete-delivery-btn" data-delivery-id="${delivery.delivery_id}" title="Hapus Pengiriman">
                                                    <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-trash" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 7l16 0" /><path d="M10 11l0 6" /><path d="M14 11l0 6" /><path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12" /><path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3" /></svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                `;
                            });
                            html += '</tbody></table></div>'; // Added closing div
                            deliveryDateSearchResultsContainer.innerHTML = html;
                        }
                         if (cardTitleElement) { // Check if element exists
                            if (dateQuery && data.success && data.deliveries && data.deliveries.length > 0) {
                                try {
                                    const dateObj = new Date(dateQuery + 'T00:00:00'); // Parse date as local
                                    const formattedDate = dateObj.toLocaleDateString('id-ID', {
                                        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                                    });
                                    cardTitleElement.innerHTML = `${CALENDAR_ICON_SVG} ${formattedDate}`;
                                    cardTitleElement.classList.add('d-flex', 'align-items-center');
                                } catch (e) {
                                    console.error("Error formatting date for card title:", e);
                                    cardTitleElement.innerHTML = DEFAULT_CARD_TITLE;
                                    cardTitleElement.classList.remove('d-flex', 'align-items-center');
                                }
                            } else {
                                // Revert to the default title if no date query, or no success, or empty deliveries
                                cardTitleElement.innerHTML = DEFAULT_CARD_TITLE;
                                cardTitleElement.classList.remove('d-flex', 'align-items-center');
                            }
                        }
                    } else {
                        deliveryDateSearchResultsContainer.innerHTML = `<p class="text-warning text-center">${data.message || 'No deliveries found or error fetching data.'}</p>`;
                         if (cardTitleElement) { // Also revert title on error or no deliveries
                            cardTitleElement.innerHTML = DEFAULT_CARD_TITLE;
                            cardTitleElement.classList.remove('d-flex', 'align-items-center');
                        }
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
    const byDateTabButton = document.querySelector('button[data-bs-target="#pane-by-date"]');
    // const formSearchByName = document.getElementById('form_search_by_name'); // Already defined as customerSearchForm
    const formSearchByOrderId = document.getElementById('form_search_by_order_id');
    const formSearchByDate = document.getElementById('form_search_by_date');
    const allSearchForms = [customerSearchForm, formSearchByOrderId, formSearchByDate].filter(form => form !== null);

    function updateSearchFormVisibility(activeTabTarget) {
        allSearchForms.forEach(form => {
            if (form) form.style.display = 'none';
        });
        let formToShow = null;
        if (activeTabTarget === '#pane-by-name') {
            formToShow = customerSearchForm;
            if (groupingSelect) groupingSelect.style.display = ''; // Show for By Name
        } else if (activeTabTarget === '#pane-by-order-id') {
            formToShow = formSearchByOrderId;
            if (groupingSelect) groupingSelect.style.display = 'none'; // Hide for By Order ID
        } else if (activeTabTarget === '#pane-by-date') {
            formToShow = formSearchByDate;
            if (groupingSelect) groupingSelect.style.display = 'none'; // Hide for By Date
        }
        if (formToShow) formToShow.style.display = 'flex'; // Assuming flex is desired for visible forms
    }

    tabButtons.forEach(tabButton => {
        tabButton.addEventListener('shown.bs.tab', function (event) {
            const activeTabTarget = event.target.getAttribute('data-bs-target');
            updateSearchFormVisibility(activeTabTarget);
            localStorage.setItem('activeOrdersTab', activeTabTarget);

            if (activeTabTarget === '#pane-by-date') {
                // Check if results container is empty. If so, it implies no server-rendered content for today.
                // Or, if the input is empty (e.g. user cleared it and switched tabs)
                if (deliveryDateSearchInput.value === '' || (deliveryDateSearchResultsContainer && deliveryDateSearchResultsContainer.innerHTML.trim() === '')) {
                    ensureDateInputIsPopulated();
                }
                 // If there's content (e.g. SSR for today or previous search result),
                 // and input has a value, don't change it just on tab switch.
                 // User might be comparing different dates.
            }
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
        if (activeTabTargetOnLoad === '#pane-by-date') {
            // If "By Date" is the active tab on load and input is empty (e.g. no default_date from server)
            // and no server-rendered results are present for a different date.
            // Check if SSR content exists. If not, or if input is empty, populate.
            // The server might have already set a value if default_date was passed.
             if (deliveryDateSearchInput && deliveryDateSearchInput.value === '') {
                // Check if the container is empty or has the initial "Pilih tanggal" message
                const containerIsEmptyOrInitial = !deliveryDateSearchResultsContainer ||
                                                 deliveryDateSearchResultsContainer.innerHTML.trim() === '' ||
                                                 deliveryDateSearchResultsContainer.querySelector('#initial-by-date-empty-state') !== null;

                if (containerIsEmptyOrInitial) {
                    ensureDateInputIsPopulated();
                }
            }
        }
    } else if (!urlView && !localStorage.getItem('activeOrdersTab')) {
        // Default to 'by_name' if no URL param and no localStorage
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
            let currentTableContainer = null; // This is for the main view's table (non-grouped or by-date)
            let globalSelectAllCheckbox = null; // The select-all for the current main view

            // --- START: New/Modified Logic for Scoped Selection ---
            const accordionItemScope = target.closest('.accordion-item');

            if (target.matches('.select-delivery-group-master')) {
                // Clicked on a master checkbox within an accordion group
                const parentAccordionItem = target.closest('.accordion-item');
                if (parentAccordionItem) {
                    const itemsInGroup = parentAccordionItem.querySelectorAll('.select-delivery-item');
                    const isChecked = target.checked;
                    itemsInGroup.forEach(checkbox => {
                        checkbox.checked = isChecked;
                    });
                }
            } else if (target.matches('.select-delivery-item') && accordionItemScope) {
                // Clicked on an individual item within an accordion group
                const itemsInGroup = accordionItemScope.querySelectorAll('.select-delivery-item');
                const groupMasterCheckbox = accordionItemScope.querySelector('.select-delivery-group-master');

                if (groupMasterCheckbox) {
                    const allCheckedInGroup = Array.from(itemsInGroup).every(checkbox => checkbox.checked);
                    const someCheckedInGroup = Array.from(itemsInGroup).some(checkbox => checkbox.checked);

                    if (allCheckedInGroup && itemsInGroup.length > 0) {
                        groupMasterCheckbox.checked = true;
                        groupMasterCheckbox.indeterminate = false;
                    } else if (someCheckedInGroup) {
                        groupMasterCheckbox.checked = false;
                        groupMasterCheckbox.indeterminate = true;
                    } else {
                        groupMasterCheckbox.checked = false;
                        groupMasterCheckbox.indeterminate = false;
                    }
                }
            }
            // --- END: New/Modified Logic for Scoped Selection ---

            // --- Existing Logic for Global Select All (non-grouped or by-date view) ---
            if (target.closest('#orders-by-name-content-wrapper')) {
                currentTableContainer = byNameContainer; // byNameContainer is #orders-by-name-content-wrapper
                if (currentTableContainer) { // Ensure it's not null
                    globalSelectAllCheckbox = currentTableContainer.querySelector('#select-all-deliveries');
                }
            } else if (target.closest('#delivery_date_search_results_container')) {
                currentTableContainer = byDateContainer;
                if (currentTableContainer) { // Ensure it's not null
                     globalSelectAllCheckbox = currentTableContainer.querySelector('#select-all-deliveries-by-date');
                }
            }

            if (currentTableContainer) { // Proceed only if we have a valid main container context
                const itemCheckboxesInContainer = currentTableContainer.querySelectorAll('.select-delivery-item');

                if (target === globalSelectAllCheckbox) { // Check if the event target *is* the globalSelectAllCheckbox
                    const isChecked = target.checked;
                    itemCheckboxesInContainer.forEach(checkbox => {
                        checkbox.checked = isChecked;
                    });
                } else if (target.matches('.select-delivery-item') && !accordionItemScope) {
                    // Handle individual item checkbox click ONLY IF NOT INSIDE an accordion item
                    if (globalSelectAllCheckbox) {
                        const allChecked = Array.from(itemCheckboxesInContainer).every(checkbox => checkbox.checked);
                        const someChecked = Array.from(itemCheckboxesInContainer).some(checkbox => checkbox.checked);

                        if (allChecked && itemCheckboxesInContainer.length > 0) {
                            globalSelectAllCheckbox.checked = true;
                            globalSelectAllCheckbox.indeterminate = false;
                        } else if (someChecked) {
                            globalSelectAllCheckbox.checked = false;
                            globalSelectAllCheckbox.indeterminate = true;
                        } else {
                            globalSelectAllCheckbox.checked = false;
                            globalSelectAllCheckbox.indeterminate = false;
                        }
                    }
                }
            }
            // --- End of Existing/Modified Global Select All ---

            // After any relevant checkbox change, update the toast.
            if (target.matches('#select-all-deliveries, #select-all-deliveries-by-date, .select-delivery-item, .select-delivery-group-master')) {
                 updateBatchDeleteToast();
            }
        });
        // Initial call to set toast state when page loads
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
