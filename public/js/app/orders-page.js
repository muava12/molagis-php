import { showToast } from './utils.js';

document.addEventListener('DOMContentLoaded', function () {
    // CALENDAR_ICON_SVG is defined below, specific to the date picker addon
    const DEFAULT_CARD_TITLE = "Manajemen Pesanan";
    const MAGNIFIER_ICON_HTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-1"><path d="M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0"></path><path d="M21 21l-6 -6"></path></svg>';
    const SPINNER_HTML = '<div class="spinner-border spinner-border-sm text-secondary" role="status"></div>';
    // Specific SVG for the calendar icon in the date input addon
    const DATE_PICKER_CALENDAR_ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" class="icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12z"></path><path d="M16 3v4"></path><path d="M8 3v4"></path><path d="M4 11h16"></path><path d="M11 15h1"></path><path d="M12 15v3"></path></svg>';


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
    let deliveryDateFlatpickrInstance = null;


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
                        // Update card title
                        if (cardTitleElement) {
                            cardTitleElement.innerHTML = `${MAGNIFIER_ICON_HTML} Detail Pesanan #${query}`;
                            cardTitleElement.classList.add('d-flex', 'align-items-center');
                        }
                    } else {
                        orderIdSearchResultsContainer.innerHTML = `<p class="text-warning">${data.message || 'Order not found or error fetching data.'}</p>`;
                        // Reset card title to default
                        if (cardTitleElement) {
                            cardTitleElement.innerHTML = DEFAULT_CARD_TITLE;
                            cardTitleElement.classList.remove('d-flex', 'align-items-center');
                        }
                    }
                })
                .catch(error => {
                    console.error('Error fetching order by ID:', error);
                    orderIdSearchResultsContainer.innerHTML = `<p class="text-danger">Error: ${error.message}</p>`;
                    // Reset card title to default on error
                    if (cardTitleElement) {
                        cardTitleElement.innerHTML = DEFAULT_CARD_TITLE;
                        cardTitleElement.classList.remove('d-flex', 'align-items-center');
                    }
                });
        });
    }


    // --- For "By Date" Tab ---
    const deliveryDateSearchInput = document.getElementById('delivery_date_search_input');
    const deliveryDateSearchResultsContainer = document.getElementById('delivery_date_search_results_container');
    let dateIconAddonSpan = null; // To store the span for the icon

    // Date navigation buttons
    const dateNavPrev = document.getElementById('date_nav_prev');
    const dateNavToday = document.getElementById('date_nav_today');
    const dateNavNext = document.getElementById('date_nav_next');

    if (deliveryDateSearchInput) {
        // Try to find the icon addon span
        if (deliveryDateSearchInput.parentElement && deliveryDateSearchInput.parentElement.classList.contains('input-icon')) {
            dateIconAddonSpan = deliveryDateSearchInput.parentElement.querySelector('.input-icon-addon');
            if (dateIconAddonSpan) {
                dateIconAddonSpan.innerHTML = DATE_PICKER_CALENDAR_ICON_SVG; // Set initial icon
            } else {
                console.error('Date icon addon span (.input-icon-addon) not found within the parent of delivery_date_search_input.');
            }
        } else {
            console.error('Parent of delivery_date_search_input is not the expected div.input-icon. Icon functionality may be affected.');
        }

        if (typeof flatpickr !== "undefined") {
            deliveryDateFlatpickrInstance = flatpickr(deliveryDateSearchInput, {
                dateFormat: "Y-m-d",
                locale: "id",
                onChange: function(selectedDates, dateStr, instance) {
                    const dateQuery = deliveryDateSearchInput.value.trim();

                    if (dateIconAddonSpan) {
                        dateIconAddonSpan.innerHTML = SPINNER_HTML;
                    }
                    deliveryDateSearchResultsContainer.innerHTML = '<p class="text-center">Loading...</p>';

                    if (!dateQuery) {
                        deliveryDateSearchResultsContainer.innerHTML = '<p class="text-danger text-center">Please select a date.</p>';
                        if (dateIconAddonSpan) dateIconAddonSpan.innerHTML = DATE_PICKER_CALENDAR_ICON_SVG;
                        return;
                    }

                    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateQuery)) {
                        deliveryDateSearchResultsContainer.innerHTML = '<p class="text-danger text-center">Invalid date format. Please use YYYY-MM-DD.</p>';
                        if (dateIconAddonSpan) dateIconAddonSpan.innerHTML = DATE_PICKER_CALENDAR_ICON_SVG;
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
                                // Use the same rendering logic as navigation buttons
                                renderDeliveriesTable(data.deliveries, dateQuery);

                                // Update card title if there are deliveries
                                if (cardTitleElement && data.deliveries.length > 0) {
                                    try {
                                        const dateObj = new Date(dateQuery + 'T00:00:00');
                                        const formattedDate = dateObj.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
                                        // Use DATE_PICKER_CALENDAR_ICON_SVG for the card title icon as well for consistency
                                        cardTitleElement.innerHTML = `${DATE_PICKER_CALENDAR_ICON_SVG} ${formattedDate}`;
                                        cardTitleElement.classList.add('d-flex', 'align-items-center');
                                    } catch (e) {
                                        console.error("Error formatting date for card title:", e);
                                        cardTitleElement.innerHTML = DEFAULT_CARD_TITLE;
                                        cardTitleElement.classList.remove('d-flex', 'align-items-center');
                                    }
                                } else if (cardTitleElement) {
                                    cardTitleElement.innerHTML = DEFAULT_CARD_TITLE;
                                    cardTitleElement.classList.remove('d-flex', 'align-items-center');
                                }
                            } else {
                                // Show empty state with appropriate SVG based on day of week
                                renderEmptyState(dateQuery);

                                if (cardTitleElement) {
                                    cardTitleElement.innerHTML = DEFAULT_CARD_TITLE;
                                    cardTitleElement.classList.remove('d-flex', 'align-items-center');
                                }
                            }
                        })
                        .catch(error => {
                            console.error('Error fetching deliveries by date:', error);
                            deliveryDateSearchResultsContainer.innerHTML = `<p class="text-danger text-center">Error: ${error.message}</p>`;
                        })
                        .finally(() => {
                            if (dateIconAddonSpan) {
                                dateIconAddonSpan.innerHTML = DATE_PICKER_CALENDAR_ICON_SVG;
                            }
                        });
                } // End onChange
            }); // End flatpickr init
        } // End if flatpickr undefined
    } // End if deliveryDateSearchInput

    // Function to set today's date if input is empty
    function ensureDateInputIsPopulated(triggerChangeEvent) {
        if (deliveryDateSearchInput && deliveryDateSearchInput.value === '') {
            const localDate = new Date();
            const year = localDate.getFullYear();
            const month = (localDate.getMonth() + 1).toString().padStart(2, '0');
            const day = localDate.getDate().toString().padStart(2, '0');
            const today = `${year}-${month}-${day}`;
            // deliveryDateSearchInput.value = today; // setDate will update the input's value
            if (deliveryDateFlatpickrInstance) {
                deliveryDateFlatpickrInstance.setDate(today, triggerChangeEvent);
            } else {
                // Fallback if flatpickr instance isn't available for some reason
                deliveryDateSearchInput.value = today;
            }
        }
    }
    // The event listener for deliveryDateSearchButton is removed as the button is removed.

    // Debounce function for date navigation
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Date navigation functionality with debounce
    const debouncedDateSearch = debounce(({ date, clickedButton }) => {
        console.log('Debounced date search triggered for:', date);
        performDateSearch(date, clickedButton);
    }, 200);

    function navigateDate(direction, clickedButton) {
        if (!deliveryDateSearchInput || !deliveryDateFlatpickrInstance) return;

        let currentDate;
        if (deliveryDateSearchInput.value) {
            currentDate = new Date(deliveryDateSearchInput.value);
        } else {
            currentDate = new Date(); // Default to today if no date is set
        }

        let newDate;
        switch (direction) {
            case 'prev':
                newDate = new Date(currentDate);
                newDate.setDate(currentDate.getDate() - 1);
                break;
            case 'next':
                newDate = new Date(currentDate);
                newDate.setDate(currentDate.getDate() + 1);
                break;
            case 'today':
                newDate = new Date();
                break;
            default:
                return;
        }

        // Format date as YYYY-MM-DD
        const formattedDate = newDate.getFullYear() + '-' +
            String(newDate.getMonth() + 1).padStart(2, '0') + '-' +
            String(newDate.getDate()).padStart(2, '0');

        // Update input value and flatpickr
        deliveryDateSearchInput.value = formattedDate;
        deliveryDateFlatpickrInstance.setDate(formattedDate, false); // false = don't trigger onChange

        // Add loading state to clicked button
        if (clickedButton) {
            clickedButton.classList.add('disabled', 'btn-loading');
        }

        // Disable all navigation buttons during search
        if (dateNavPrev) dateNavPrev.classList.add('disabled');
        if (dateNavToday) dateNavToday.classList.add('disabled');
        if (dateNavNext) dateNavNext.classList.add('disabled');

        // Trigger debounced search
        debouncedDateSearch({ date: formattedDate, clickedButton });
    }

    function performDateSearch(date, clickedButton) {
        console.log('Performing date search for:', date);

        // Show loading state in results container
        if (deliveryDateSearchResultsContainer) {
            deliveryDateSearchResultsContainer.innerHTML = `
                <div class="text-center py-4">
                    <div class="spinner-border spinner-border-sm" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <span class="ms-2">Memuat data...</span>
                </div>
            `;
        }

        // Use the correct API endpoint for date search
        const apiUrl = `/api/orders/search/date?date=${encodeURIComponent(date)}`;

        fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(errData => {
                    throw new Error(errData.message || `HTTP error ${response.status}`);
                });
            }
            return response.json();
        })
        .then(data => {
            console.log('Date search API response:', data);

            if (data.success && data.deliveries) {
                // Render the deliveries data into HTML table
                renderDeliveriesTable(data.deliveries, date);
            } else {
                // Show empty state with appropriate SVG based on day of week
                renderEmptyState(date);
            }
        })
        .catch(error => {
            console.error('Error performing date search:', error);
            if (deliveryDateSearchResultsContainer) {
                deliveryDateSearchResultsContainer.innerHTML = `
                    <div class="alert alert-danger" role="alert">
                        <strong>Gagal memuat data:</strong> ${error.message}
                    </div>
                `;
            }
        })
        .finally(() => {
            // Remove loading states
            if (clickedButton) {
                clickedButton.classList.remove('disabled', 'btn-loading');
            }

            // Re-enable all navigation buttons
            if (dateNavPrev) dateNavPrev.classList.remove('disabled');
            if (dateNavToday) dateNavToday.classList.remove('disabled');
            if (dateNavNext) dateNavNext.classList.remove('disabled');
        });
    }

    // Helper function to render empty state based on day of week
    function renderEmptyState(date) {
        if (!deliveryDateSearchResultsContainer) return;

        // Check if the date is Sunday
        const dateObj = new Date(date + 'T00:00:00');
        const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const isSunday = dayOfWeek === 0;

        let svgContent, title, subtitle;

        if (isSunday) {
            // Beach SVG for Sunday (holiday)
            svgContent = `
                <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" viewBox="0 0 439.48 439.48" xml:space="preserve" width="200" height="200" style="margin: auto; display: block; margin-bottom: 1rem;">
                    <g>
                        <path style="fill:#FFD039;" d="M112.14,148.92C65.39,133.73,15.18,159.32,0,206.06l47.45,15.42l47.29,4.53l27.1,19.63v0.01   l47.45,15.41C184.47,214.31,158.89,164.11,112.14,148.92z"/>
                        <path style="fill:#3B9DFF;" d="M125.1,126.84l-11.67,35.9c-0.63,1.96-2.28,3.31-4.17,3.69l2.65,0.85l-1.26,3.9l-25.67,79.38   l-43.3,133.88l-10.47-3.39l43.3-133.89l26.93-83.26l2.73,0.88c-0.35-0.38-0.65-0.81-0.88-1.28c-0.63-1.24-0.79-2.73-0.32-4.16   l11.66-35.9c0.94-2.89,4.05-4.47,6.93-3.53C124.45,120.85,126.03,123.95,125.1,126.84z"/>
                        <path style="fill:#CCCCCC;" d="M218.4,347.9h-26.77l-6.2-16.77c-1.09-2.94-3.89-4.9-7.03-4.9h-45c-3.14,0-5.95,1.96-7.04,4.9   l-6.2,16.77h-10.92l-22.76-31.56c-2.42-3.35-7.11-4.11-10.47-1.69c-3.36,2.42-4.12,7.11-1.7,10.47l25,34.67   c1.41,1.95,3.68,3.11,6.09,3.11h9.22l-1.7,4.61l-3.56,9.62c-1.43,3.89,0.55,8.2,4.44,9.64c3.89,1.43,8.2-0.55,9.63-4.44l5.48-14.82   l1.7-4.61h50.57l1.7,4.61l5.48,14.82c1.12,3.03,3.99,4.9,7.04,4.9c0.86,0,1.74-0.15,2.6-0.46c3.88-1.44,5.87-5.75,4.43-9.64   l-3.56-9.62l-1.7-4.61h21.23c4.14,0,7.5-3.36,7.5-7.5C225.9,351.26,222.54,347.9,218.4,347.9z M136.16,347.9l2.46-6.67h34.55   l2.47,6.67H136.16z"/>
                        <polygon style="fill:#B3B3B3;" points="112.92,367.51 128.91,367.51 130.61,362.9 114.62,362.9  "/>
                        <polygon style="fill:#B3B3B3;" points="198.87,367.51 182.88,367.51 181.18,362.9 197.17,362.9  "/>
                        <path style="fill:#FFD039;" d="M268.74,396.51l-12.32,10.39H0c0-4.06,0.85-7.91,2.38-11.4c1.43-3.29,3.47-6.25,5.97-8.75   c5.15-5.16,12.28-8.35,20.15-8.35h227.92l11.63,17.1L268.74,396.51z"/>
                        <path style="fill:#EAB932;" d="M268.74,396.51l-12.32,10.39H0c0-4.06,0.85-7.91,2.38-11.4h265.67L268.74,396.51z"/>
                        <path style="fill:#EAB932;" d="M352.79,32.58c-27.75,0-50.24,22.5-50.24,50.25s22.49,50.25,50.24,50.25s50.25-22.5,50.25-50.25   S380.54,32.58,352.79,32.58z"/>
                        <path style="fill:#1E79C4;" d="M110.65,171.18l-25.67,79.38l-10.47-3.4l26.93-83.26l2.73,0.88c-0.35-0.38-0.65-0.81-0.88-1.28   C106.15,165.26,108.6,167.87,110.65,171.18z"/>
                        <path style="fill:#ED2E2E;" d="M112.14,148.92c20.54,6.67,24.88,49.97,9.7,96.72l-74.39-24.16   C62.64,174.73,91.6,142.25,112.14,148.92z"/>
                        <path style="fill:#3B9DFF;" d="M439.48,406.684v0.216H256.42v-28.5c5.08,2.5,10.17,5,20.34,5c20.34,0,20.34-10,40.68-10   c20.33,0,20.33,10,40.67,10c20.34,0,20.34-10,40.69-10c12.077,0,16.983,3.525,23.234,6.39   C432.599,384.631,439.48,395.063,439.48,406.684z"/>
                        <rect x="256.42" y="395.5" style="fill:#1E79C4;" width="183.06" height="11.4"/>
                        <path style="fill:#666666;" d="M386.318,181.904c-0.537,0.636-1.039,1.296-1.508,1.977c-1.005-1.486-2.146-2.875-3.443-4.094   c-6.334-5.954-14.966-9.021-23.547-6.685c2.593,0.995,5.167,1.807,7.585,3.208c3.423,1.984,6.505,4.539,8.906,7.699   c1.694,2.229,3.109,4.744,4.02,7.398c0.739,2.153,1.261,4.43,1.415,6.706c0.028,0.408-0.148,1.465,0.067,1.809   c0.012,0.019,0.01,0.02,0.018,0.034c-0.002,0.098-0.014,0.195-0.015,0.292c-0.045,3.215,2.923,5.751,6.107,5.034   c2.622-0.59,3.835-2.854,3.853-5.316c0.234-0.58,0.229-2.82,0.315-3.476c0.811-6.127,3.895-11.518,8.24-15.799   c1.906-1.878,4.199-3.512,6.57-4.733c2.251-1.16,4.553-1.959,6.916-2.857C402.327,170.454,392.506,174.569,386.318,181.904z"/>
                        <path style="fill:#FFD039;" d="M302.55,82.83c0,27.75,22.49,50.25,50.24,50.25c6.12,0,11.98-1.09,17.4-3.1   c2.01-5.42,3.1-11.28,3.1-17.4c0-27.75-22.49-50.25-50.25-50.25c-6.11,0-11.97,1.09-17.39,3.09   C303.64,70.85,302.55,76.71,302.55,82.83z"/>
                    </g>
                </svg>
            `;
            title = 'Minggu Ceria!';
            subtitle = 'Tidak ada jadwal pengiriman pada hari Minggu.';
        } else {
            // Bird SVG for other days
            svgContent = `
                <svg viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" width="200" height="200" style="margin: auto; display: block; margin-bottom: 1rem;">
                    <path d="M484.32 375.24C575.25 255.5 857.87 527.6 788.67 581.07c-94.76 73.21-491.01 39.99-304.35-205.83z" fill="#1C80AA" />
                    <path d="M401.03 749.89l-4.85 133.8-77.69 21.37h66.36l19.42 35.27 4.86-35.27 40.46 6.14-38.84-25.89 8.09-114.91-17.81-20.51zM524.36 771.23l10.48 133.48-74.73 30.11 65.92-7.59 23.33 32.82 0.79-35.6 40.89 1.48-41.54-21.28-5.11-115.08-20.03-18.34z" fill="#3B5174" />
                    <path d="M224.73 264.77l-24 50.19a21.7 21.7 0 0 1-37.73 2.5l-31.57-48.27a21.7 21.7 0 0 1 17.41-33.57l55.61-1.92a21.7 21.7 0 0 1 20.28 31.07z" fill="#DE7B56" />
                    <path d="M900.53 638.76c-18.3 86.91-221.86 208.13-478 171.54C150.46 771.44 26 281.88 315 103.56c161.25-99.49 326.71 5 356.8 130.37C713 405.47 583.15 534.58 749.57 609c86.91 38.91 164.43-34.33 150.96 29.76z" fill="#FDD2BE" />
                    <path d="M365.86 264.78m-32.45 0a32.45 32.45 0 1 0 64.9 0 32.45 32.45 0 1 0-64.9 0Z" fill="" />
                    <path d="M512.24 366c137.48-60.86 253.34 314 166.92 327.31C560.81 711.56 230 490.92 512.24 366zM223.3 530c-9.34-2.6-17.2-12.8-23.94-31a195 195 0 0 1-7.64-27 7.28 7.28 0 0 1 14.3-2.79c4.79 24.5 15 46.44 21.91 46.93 1.12 0.08 11.43-0.5 27.23-45.51a7.28 7.28 0 1 1 13.74 4.82c-13.61 38.77-27 56.31-42 55.22a18.18 18.18 0 0 1-3.6-0.67zM340.8 590.36c-9.63 1.14-20.77-5.32-33.92-19.63a195 195 0 0 1-17.32-22.11 7.28 7.28 0 0 1 12.17-8c13.73 20.85 31.53 37.27 38.07 35.12 1.07-0.35 10.38-4.8 7.93-52.44a7.28 7.28 0 1 1 14.55-0.75c2.11 41-3.59 62.33-17.95 67a18.18 18.18 0 0 1-3.53 0.81zM261.5 659.71c-9-0.19-18.35-7.55-28.56-22.35a180.41 180.41 0 0 1-13-22.49 6.74 6.74 0 0 1 12.18-5.77c9.9 20.88 24.1 38.21 30.37 37.08 1-0.18 10.13-3.07 14-47a6.74 6.74 0 1 1 13.43 1.18c-3.34 37.87-11.31 56.66-25.07 59.12a16.82 16.82 0 0 1-3.35 0.23zM389.28 722.29c-9.26 2.85-21.38-1.51-36.89-13.22a195 195 0 0 1-21-18.64 7.28 7.28 0 0 1 10.53-10.06c17.25 18.05 37.7 31 43.75 27.71 1-0.54 9.35-6.59-1.61-53a7.28 7.28 0 1 1 14.17-3.35c9.44 40 7.65 62-5.63 69.16a18.18 18.18 0 0 1-3.32 1.4z" fill="#22B0C3" />
                </svg>
            `;
            title = `Tidak ada pengiriman yang dijadwalkan untuk tanggal <strong>${formatDateDisplay(date)}</strong>.`;
            subtitle = 'Anda bisa mencoba mencari tanggal lain.';
        }

        deliveryDateSearchResultsContainer.innerHTML = `
            <div class="empty-state-card text-center py-5">
                <div style="width: 200px; height: 200px; margin: 0 auto 1rem auto;">
                    ${svgContent}
                </div>
                <p class="mt-3">${title}</p>
                <p class="text-muted">${subtitle}</p>
            </div>
        `;
    }

    // Helper function to render deliveries table
    function renderDeliveriesTable(deliveries, date) {
        if (!deliveryDateSearchResultsContainer) return;

        if (deliveries.length === 0) {
            renderEmptyState(date);
            return;
        }

        // Build the table HTML
        let tableHTML = `
            <div class="table-responsive">
                <table class="table table-vcenter card-table table-striped">
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
                    <tbody>
        `;

        deliveries.forEach(delivery => {
            const statusClass = getStatusBadgeClass(delivery.status);
            const items = delivery.items || {};

            tableHTML += `
                <tr id="delivery-row-${delivery.delivery_id}">
                    <td>${delivery.customer_name || 'N/A'}</td>
                    <td>
                        <a href="/orders?view=by_order_id&order_id_query=${delivery.order_id}">
                            #${delivery.order_id}
                        </a>
                    </td>
                    <td>${renderItemsColumn(items, delivery.subtotal_harga)}</td>
                    <td>${renderNotesColumn(delivery.kitchen_note, delivery.courier_note)}</td>
                    <td>${delivery.courier_name || 'N/A'}</td>
                    <td>${formatPaymentMethod(delivery.payment_method)}</td>
                    <td>${formatCurrency(delivery.ongkir)}</td>
                    <td>${formatCurrency((delivery.subtotal_harga || 0) + (delivery.ongkir || 0))}</td>
                    <td>
                        <span class="badge ${statusClass} me-1"></span>${formatStatus(delivery.status)}
                    </td>
                    <td>
                        <div class="btn-list flex-nowrap">
                            <button class="btn btn-sm btn-icon edit-delivery-btn" data-delivery-id="${delivery.delivery_id}" title="Edit Pengiriman">
                                <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-pencil" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
                                    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                                    <path d="M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4" />
                                    <path d="M13.5 6.5l4 4" />
                                </svg>
                            </button>
                            <button class="btn btn-sm btn-icon delete-delivery-btn" data-delivery-id="${delivery.delivery_id}" title="Hapus Pengiriman">
                                <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-trash" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
                                    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                                    <path d="M4 7l16 0" />
                                    <path d="M10 11l0 6" />
                                    <path d="M14 11l0 6" />
                                    <path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12" />
                                    <path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3" />
                                </svg>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });

        tableHTML += `
                    </tbody>
                </table>
            </div>
        `;

        deliveryDateSearchResultsContainer.innerHTML = tableHTML;
    }

    // Helper functions for rendering table content
    function formatDateDisplay(dateStr) {
        try {
            const date = new Date(dateStr + 'T00:00:00');
            return date.toLocaleDateString('id-ID', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
        } catch (e) {
            return dateStr;
        }
    }

    function getStatusBadgeClass(status) {
        const statusLower = (status || '').toLowerCase().trim();
        if (statusLower === 'selesai' || statusLower === 'completed') return 'bg-success';
        if (statusLower === 'pending' || statusLower === 'terjadwal') return 'bg-warning';
        if (statusLower === 'dibatalkan' || statusLower === 'cancelled' || statusLower === 'canceled') return 'bg-danger';
        if (statusLower === 'dalam perjalanan' || statusLower === 'in progress' || statusLower === 'otw') return 'bg-info';
        return 'bg-secondary';
    }

    function formatStatus(status) {
        return (status || 'N/A').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    function formatPaymentMethod(method) {
        return (method || 'N/A').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    function formatCurrency(amount) {
        return new Intl.NumberFormat('id-ID').format(amount || 0);
    }

    function renderItemsColumn(items, subtotalHarga) {
        let html = '<ul class="list-unstyled mb-0">';

        // Render package items
        if (items.items && items.items.length > 0) {
            html += '<li>Paket:</li><ul class="list-unstyled ps-3 mb-1">';
            items.items.forEach(item => {
                const price = item.price ? ` <span class="text-muted">@ ${formatCurrency(item.price)}</span>` : '';
                html += `<li>${item.quantity}x ${item.package_name || 'N/A'}${price}</li>`;
            });
            html += '</ul>';
        }

        // Render additional items
        if (items.additional_items && items.additional_items.length > 0) {
            const validItems = items.additional_items.filter(item =>
                item.item_name && item.item_name !== '' && item.item_name !== 'N/A'
            );
            if (validItems.length > 0) {
                html += '<li>Tambahan:</li><ul class="list-unstyled ps-3 mb-1">';
                validItems.forEach(item => {
                    const price = item.price && item.price > 0 ? ` <span class="text-muted">@ ${formatCurrency(item.price)}</span>` : '';
                    html += `<li>${item.quantity || 1}x ${item.item_name}${price}</li>`;
                });
                html += '</ul>';
            }
        }

        html += `<li class="mt-1 text-muted"><strong>Subtotal Items: ${formatCurrency(subtotalHarga)}</strong></li>`;
        html += '</ul>';

        return html;
    }

    function renderNotesColumn(kitchenNote, courierNote) {
        let html = '';
        if (kitchenNote && kitchenNote.trim()) {
            html += `<small class="d-block"><strong>Dapur:</strong> ${kitchenNote}</small>`;
        }
        if (courierNote && courierNote.trim()) {
            html += `<small class="d-block"><strong>Kurir:</strong> ${courierNote}</small>`;
        }
        return html || '<span class="text-muted">-</span>';
    }

    // Add event listeners for date navigation buttons
    if (dateNavPrev) {
        dateNavPrev.addEventListener('click', (e) => {
            e.preventDefault();
            navigateDate('prev', dateNavPrev);
        });
    }

    if (dateNavToday) {
        dateNavToday.addEventListener('click', (e) => {
            e.preventDefault();
            navigateDate('today', dateNavToday);
        });
    }

    if (dateNavNext) {
        dateNavNext.addEventListener('click', (e) => {
            e.preventDefault();
            navigateDate('next', dateNavNext);
        });
    }

    // --- Tab Management & Visibility ---
    // ... (existing tab logic - kept for brevity) ...
    const tabButtons = document.querySelectorAll('#orders-view-tabs button.nav-link[data-bs-toggle="tab"]'); // Ensure buttons are selected
    const byDateTabButton = document.querySelector('#orders-view-tabs button.nav-link[data-bs-target="#pane-by-date"]'); // Ensure button is selected
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
            const activeTabTarget = event.target.getAttribute('data-bs-target'); // e.g. #pane-by-name
            let viewName = 'by_name';
            if (activeTabTarget === '#pane-by-order-id') viewName = 'by_order_id';
            else if (activeTabTarget === '#pane-by-date') viewName = 'by_date';

            // Update URL and localStorage
            const currentUrl = new URL(window.location.href);
            currentUrl.searchParams.set('view', viewName);
            currentUrl.searchParams.delete('page'); // Reset page on tab switch

            if (viewName === 'by_name') {
                const groupingValue = groupingSelect ? groupingSelect.value : currentUrl.searchParams.get('grouping') || 'none';
                currentUrl.searchParams.set('grouping', groupingValue);
                // customer_id is preserved if already in URL
            } else {
                currentUrl.searchParams.delete('grouping');
                // Clear customer_id if not switching to by_name,
                // but preserve if switching from by_order_id back to by_name with a customer_id in URL
                if (viewName !== 'by_name' && currentUrl.searchParams.get('customer_id')) {
                    // currentUrl.searchParams.delete('customer_id'); // Keep customer_id if present for by_name
                }
            }

            // Clear specific search query parameters from URL when switching tabs
            if (viewName !== 'by_order_id') currentUrl.searchParams.delete('order_id_query');
            // Date is not a URL search param for tab load, so no need to clear here.

            // Only use pushState for non-by_order_id views as by_order_id uses full reload handled by its click listener
            if (viewName !== 'by_order_id') {
                if (history.pushState) {
                    history.pushState({path: currentUrl.toString()}, '', currentUrl.toString());
                } else {
                    // Fallback if pushState is not supported means the URL won't update for AJAX tabs without reload.
                    // Consider if a reload is acceptable here: window.location.href = currentUrl.toString();
                }
            }

            localStorage.setItem('activeOrdersTab', activeTabTarget);
            updateSearchFormVisibility(activeTabTarget); // Update visible search forms

            // Content loading / state adjustment logic based on the activated tab
            // Update card title based on active tab
            if (activeTabTarget === '#pane-by-name') {
                const customerId = currentUrl.searchParams.get('customer_id');
                if (customerId) {
                    // fetchAndUpdateOrdersView will handle the title if a customer is loaded
                    // If navigating to by_name and customerId is already in URL,
                    // fetchAndUpdateOrdersView is called, which updates title.
                    // If no customerId, title gets reset below.
                } else {
                    // No customer_id when switching to 'by_name'. Reset title.
                    if (cardTitleElement) {
                        cardTitleElement.innerHTML = DEFAULT_CARD_TITLE;
                        cardTitleElement.classList.remove('d-flex', 'align-items-center');
                    }
                    // Ensure contentWrapper shows the "select customer" message
                    if (contentWrapper) {
                        contentWrapper.innerHTML = `<div class="alert alert-info" role="alert">Silakan pilih atau cari pelanggan untuk melihat riwayat pengiriman.</div>`;
                    }
                }
                // The actual call to fetchAndUpdateOrdersView if customerId exists is further down,
                // that function will set the title appropriately.
                // This block primarily handles the reset case.
            } else if (activeTabTarget === '#pane-by-date') {
                // If date input is empty AND results container is also empty/initial, reset title.
                // ensureDateInputIsPopulated will then trigger flatpickr's onChange, which loads data
                // and sets the title based on whether deliveries are found for the (newly set) date.
                if (deliveryDateSearchInput && deliveryDateSearchInput.value === '' &&
                    (deliveryDateSearchResultsContainer && (deliveryDateSearchResultsContainer.innerHTML.trim() === '' || deliveryDateSearchResultsContainer.querySelector('#initial-by-date-empty-state')))) {
                    if (cardTitleElement) {
                        cardTitleElement.innerHTML = DEFAULT_CARD_TITLE;
                        cardTitleElement.classList.remove('d-flex', 'align-items-center');
                    }
                }
                // ensureDateInputIsPopulated(true) is called later and will handle title updates based on API response
            } else if (activeTabTarget === '#pane-by-order-id') {
                // Reset title and content when switching to 'by_order_id' tab before a search
                if (cardTitleElement) {
                    cardTitleElement.innerHTML = DEFAULT_CARD_TITLE;
                    cardTitleElement.classList.remove('d-flex', 'align-items-center');
                }
                if (orderIdSearchResultsContainer) {
                    orderIdSearchResultsContainer.innerHTML = '<p class="text-muted py-5 text-center">Masukkan ID Pesanan di atas untuk memulai pencarian.</p>';
                }
                if (orderIdSearchInput) {
                    orderIdSearchInput.value = ''; // Clear previous search query
                }
            }

            // Original content loading logic based on the activated tab (remains largely the same)
            if (activeTabTarget === '#pane-by-name') {
                const customerId = currentUrl.searchParams.get('customer_id'); // Use updated currentUrl

                if (customerId) {
                    // Construct the URL for fetching view with all necessary parameters from the *current* URL object
                    const fetchUrl = new URL(customerSearchForm?.action || (window.location.origin + '/orders'));
                    fetchUrl.searchParams.set('view', 'by_name');
                    fetchUrl.searchParams.set('customer_id', customerId);
                    fetchUrl.searchParams.set('page', currentUrl.searchParams.get('page') || '1');
                    fetchUrl.searchParams.set('limit', currentUrl.searchParams.get('limit') || itemsPerPageSelect?.value || '100');
                    fetchUrl.searchParams.set('grouping', currentUrl.searchParams.get('grouping') || groupingSelect?.value || 'none');

                    if (typeof fetchAndUpdateOrdersView === 'function') {
                        fetchAndUpdateOrdersView(fetchUrl.toString());
                    } else {
                        console.error('fetchAndUpdateOrdersView function is not defined. Reloading as fallback.');
                        // window.location.href = fetchUrl.toString(); // Avoid reload if pushState worked
                    }
                }
                // If no customerId, the title reset and content message are handled by the block above.
            } else if (activeTabTarget === '#pane-by-date') {
                // ensureDateInputIsPopulated will trigger flatpickr's onChange if date is empty,
                // which then loads data and sets the title.
                // If date input is already populated (e.g. from SSR or previous selection)
                // and results are already there, title should be set.
                // If input has value but no results, flatpickr onChange should have set default title.
                // The specific title reset for empty input + empty results is handled above.
                if (deliveryDateSearchInput && (deliveryDateSearchInput.value === '' || (deliveryDateSearchResultsContainer && deliveryDateSearchResultsContainer.innerHTML.trim() === ''))) {
                     ensureDateInputIsPopulated(true); // This will eventually update title via its fetch
                } else if (deliveryDateSearchInput && deliveryDateSearchInput.value !== '') {
                    // If date input has a value, but perhaps no action was triggered to load data yet for this tab switch
                    // (e.g. if it was populated by SSR and user is just switching back to the tab)
                    // We might need to manually trigger the flatpickr's onChange if current results don't match the date,
                    // or rely on ensureDateInputIsPopulated if it's smart enough.
                    // For now, assume if date is populated, its corresponding data (and title) should be too, or will be loaded.
                    // The `ensureDateInputIsPopulated(true)` call will effectively re-trigger if input is empty.
                    // If input is NOT empty, we assume the title reflects its state or will shortly.
                }
            }
            // For '#pane-by-order-id', title and content reset is handled above.
            // No specific content loading is done here on tab switch for by_order_id, it's user-initiated search.

            // This should be called after potential content updates. updateBatchDeleteToast is from outer scope.
            if (typeof updateBatchDeleteToast === 'function') {
                updateBatchDeleteToast();
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
        // const tabInstance = new bootstrap.Tab(activeTabButton); // This might be incorrect if instance already exists
        const tabInstance = bootstrap.Tab.getOrCreateInstance(activeTabButton);
        tabInstance.show(); // This should trigger 'shown.bs.tab' which includes title logic
    } else if (activeTabButton) {
        // Fallback or manual activation if bootstrap.Tab is not found or not a function
        console.warn("Bootstrap Tab instance couldn't be created. Tab activation might be incomplete.");
        document.querySelectorAll('#orders-view-tabs .nav-link').forEach(tb => tb.classList.remove('active'));
        activeTabButton.classList.add('active');
        document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('show', 'active'));
        const targetPane = document.querySelector(activeTabTargetOnLoad);
        if (targetPane) targetPane.classList.add('show', 'active');
        
        // Manually trigger title update and visibility if Bootstrap event didn't fire
        updateSearchFormVisibility(activeTabTargetOnLoad);
        // Manual title setting based on active tab on load (if not handled by 'shown.bs.tab')
        if (activeTabTargetOnLoad === '#pane-by-name') {
            if (!currentUrlParams.get('customer_id') && cardTitleElement) { // No customer selected
                cardTitleElement.innerHTML = DEFAULT_CARD_TITLE;
                cardTitleElement.classList.remove('d-flex', 'align-items-center');
            } // If customer selected, SSR or subsequent fetchAndUpdateOrdersView should handle title
        } else if (activeTabTargetOnLoad === '#pane-by-date') {
            // If date input is empty and no results on load, set default title
            if (deliveryDateSearchInput && deliveryDateSearchInput.value === '' && cardTitleElement) {
                 const containerIsEmptyOrInitial = !deliveryDateSearchResultsContainer || deliveryDateSearchResultsContainer.innerHTML.trim() === '' || deliveryDateSearchResultsContainer.querySelector('#initial-by-date-empty-state');
                 if (containerIsEmptyOrInitial) {
                    cardTitleElement.innerHTML = DEFAULT_CARD_TITLE;
                    cardTitleElement.classList.remove('d-flex', 'align-items-center');
                 }
            }
            // ensureDateInputIsPopulated(true) will be called below if conditions match, handling further title updates
        } else if (activeTabTargetOnLoad === '#pane-by-order-id' && cardTitleElement) {
            cardTitleElement.innerHTML = DEFAULT_CARD_TITLE; // Default for By Order ID on load
            cardTitleElement.classList.remove('d-flex', 'align-items-center');
        }
    }

    // This block runs after tab activation, ensuring visibility and potentially populating date for 'By Date' tab
    if (activeTabTargetOnLoad) {
        updateSearchFormVisibility(activeTabTargetOnLoad); // Call this regardless of how tab was shown
        if (activeTabTargetOnLoad === '#pane-by-date') {
             if (deliveryDateSearchInput && deliveryDateSearchInput.value === '') {
                const containerIsEmptyOrInitial = !deliveryDateSearchResultsContainer ||
                                                 deliveryDateSearchResultsContainer.innerHTML.trim() === '' ||
                                                 deliveryDateSearchResultsContainer.querySelector('#initial-by-date-empty-state') !== null;
                if (containerIsEmptyOrInitial) {
                    ensureDateInputIsPopulated(true); // This triggers flatpickr onChange, leading to title update
                }
            } else if (deliveryDateSearchInput && deliveryDateSearchInput.value !== '' && cardTitleElement) {
                // If date is populated (e.g. SSR with default_date), and no specific title was set by SSR for date,
                // or if JS needs to re-confirm title.
                // Check if title is still default, if so, try to format based on existing date.
                // This case is tricky, as flatpickr's onChange is the primary mechanism for date title.
                // If SSR provides results, Twig should set the title. If JS loads results, flatpickr onChange does.
                // This is more of a fallback if title is default but date is set.
                if (cardTitleElement.innerHTML === DEFAULT_CARD_TITLE || !cardTitleElement.querySelector('svg.icon')) {
                     try {
                        const dateObj = new Date(deliveryDateSearchInput.value + 'T00:00:00');
                        const formattedDate = dateObj.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
                        cardTitleElement.innerHTML = `${DATE_PICKER_CALENDAR_ICON_SVG} ${formattedDate}`;
                        cardTitleElement.classList.add('d-flex', 'align-items-center');
                    } catch (e) { /* keep default title if error */ }
                }
            }
        }
        // For by_name, if a customer_id is in URL, SSR handles initial title or fetchAndUpdateOrdersView does.
        // If no customer_id, title should be default (handled by 'shown.bs.tab' or manual activation logic above).
    } else if (!urlView && !localStorage.getItem('activeOrdersTab')) {
        // Default to 'by_name' if no URL param and no localStorage
        updateSearchFormVisibility('#pane-by-name');
        if (cardTitleElement) { // Set default title if no specific context
            cardTitleElement.innerHTML = DEFAULT_CARD_TITLE;
            cardTitleElement.classList.remove('d-flex', 'align-items-center');
        }
    }


    // Tab switching logic for button-based nav-segmented
    tabButtons.forEach(tabButton => {
        tabButton.addEventListener('click', function(event) {
            event.preventDefault(); // Prevent default button action

            const viewTarget = this.getAttribute('data-bs-target');

            if (viewTarget === '#pane-by-order-id') {
                // Logic for "By Order ID" tab (full page reload)
                const currentUrl = new URL(window.location.href);
                currentUrl.searchParams.set('view', 'by_order_id');
                currentUrl.searchParams.delete('page');
                currentUrl.searchParams.delete('grouping');
                currentUrl.searchParams.delete('customer_id');
                currentUrl.searchParams.delete('order_id_query');

                const customerSearchBox = document.getElementById('customer_search_orders');
                if(customerSearchBox) customerSearchBox.value = '';
                const dateInput = document.getElementById('delivery_date_search_input');
                if(dateInput) dateInput.value = '';

                window.location.href = currentUrl.toString();
            } else {
                // Logic for AJAX tabs ("By Name", "By Date")
                // Manually trigger Bootstrap tab showing because we prevented default
                if (bootstrap && bootstrap.Tab) {
                    const tab = bootstrap.Tab.getOrCreateInstance(this);
                    tab.show();
                } else {
                    console.error("Bootstrap Tab component not found. Cannot switch tabs.");
                }
                // The 'shown.bs.tab' event listener (defined elsewhere in the file)
                // will handle URL updates (history.pushState) and content loading for these tabs.
            }
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
                showToast('Sukses', data.message || `Pengiriman ID ${deliveryId} berhasil dihapus.`, 'success');

                // Update batch delete toast
                updateBatchDeleteToast();
            } else {
                showToast('Error', data.message || `Gagal menghapus pengiriman ID ${deliveryId}.`, 'error');
            }
        })
        .catch(error => {
            console.error('Error in performDeleteDelivery:', error);
            showToast('Error', error.message || `Terjadi kesalahan saat menghapus pengiriman ID ${deliveryId}.`, 'error');
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

            fetchAndUpdateOrdersView(currentUrl.toString());
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
                fetchAndUpdateOrdersView(clickedLinkElement.href);
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

           fetchAndUpdateOrdersView(currentUrl.toString());
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

    // Initial toast update on page load logic (from end of file) is moved up to be part of initial setup block
    // ... (The initialActiveTab logic and updateBatchDeleteToast call will be covered by the existing block below)

    // Determine initial active tab based on URL or localStorage
    const currentUrlOnLoad = new URL(window.location.href);
    const urlViewOnLoad = currentUrlOnLoad.searchParams.get('view');
    // NOTE: activeTabTargetOnLoad is already declared much earlier (around line 727)
    // let activeTabTSRgetOnLoad = localStorage.getItem('activeOrdersTab') || '#pane-by-name'; // This was a duplicate declaration

    if (urlViewOnLoad) {
        if (urlViewOnLoad === 'by_name') activeTabTargetOnLoad = '#pane-by-name';
        else if (urlViewOnLoad === 'by_order_id') activeTabTargetOnLoad = '#pane-by-order-id';
        else if (urlViewOnLoad === 'by_date') activeTabTargetOnLoad = '#pane-by-date';
        // If view in URL doesn't match localStorage, URL takes precedence
        if (localStorage.getItem('activeOrdersTab') !== activeTabTargetOnLoad) {
             localStorage.setItem('activeOrdersTab', activeTabTargetOnLoad);
        }
    }

    // Activate the determined tab using Bootstrap's API
    // This will also trigger the 'shown.bs.tab' event for the initial load if the tab changes from a default (or no) active state
    const activeTabButtonSelector = `#orders-view-tabs button.nav-link[data-bs-target="${activeTabTargetOnLoad}"]`; // Ensure button is selected
    const activeTabButtonElement = document.querySelector(activeTabButtonSelector);

    if (activeTabButtonElement) {
        // Before showing, ensure no other tab has 'active' class from server rendering if it mismatches.
        document.querySelectorAll('#orders-view-tabs button.nav-link.active').forEach(activeLink => { // Ensure button is selected
            if (activeLink !== activeTabButtonElement) {
                activeLink.classList.remove('active');
                const paneId = activeLink.getAttribute('data-bs-target');
                if(paneId) {
                    const paneEl = document.querySelector(paneId);
                    if(paneEl) paneEl.classList.remove('show', 'active');
                }
            }
        });

        const tabPane = document.querySelector(activeTabTargetOnLoad);
        // Check if the target tab OR its pane is not active.
        if (!activeTabButtonElement.classList.contains('active') || (tabPane && !tabPane.classList.contains('active'))) {
            if (bootstrap && typeof bootstrap.Tab === 'function') {
                const tabInstance = bootstrap.Tab.getInstance(activeTabButtonElement) || new bootstrap.Tab(activeTabButtonElement);
                tabInstance.show(); // This will trigger 'shown.bs.tab'
            } else {
                 console.warn("Bootstrap Tab instance couldn't be created for initial tab. Manual activation attempt.");
                 activeTabButtonElement.classList.add('active');
                 if(tabPane) tabPane.classList.add('show', 'active');
                 // Manually call visibility update if Bootstrap event won't fire from .show()
                 updateSearchFormVisibility(activeTabTargetOnLoad);
                 // Manually trigger content loading logic if needed (e.g. for by_date if it's the target and needs initial load)
                 if (activeTabTargetOnLoad === '#pane-by-date' && deliveryDateSearchInput && deliveryDateSearchInput.value === '') {
                    ensureDateInputIsPopulated(true);
                 } else if (activeTabTargetOnLoad === '#pane-by-name' && !currentUrlOnLoad.searchParams.get('customer_id')) {
                    if (contentWrapper) contentWrapper.innerHTML = `<div class="alert alert-info" role="alert">Silakan pilih atau cari pelanggan untuk melihat riwayat pengiriman.</div>`;
                 }
                 updateBatchDeleteToast(); // Also update toast manually
            }
        } else {
            // If the target tab and pane are already active (e.g. from SSR correctly matching URL view)
            // 'shown.bs.tab' might not have fired if no change in tab. So, manually call necessary setup functions.
            updateSearchFormVisibility(activeTabTargetOnLoad);
            if (activeTabTargetOnLoad === '#pane-by-date') {
                if (deliveryDateSearchInput && deliveryDateSearchInput.value === '') {
                    const containerIsEmptyOrInitial = !deliveryDateSearchResultsContainer ||
                                                     deliveryDateSearchResultsContainer.innerHTML.trim() === '' ||
                                                     deliveryDateSearchResultsContainer.querySelector('#initial-by-date-empty-state') !== null;
                    if (containerIsEmptyOrInitial) ensureDateInputIsPopulated(true);
                }
            } else if (activeTabTargetOnLoad === '#pane-by-name') {
                if (!currentUrlOnLoad.searchParams.get('customer_id') && contentWrapper) {
                     contentWrapper.innerHTML = `<div class="alert alert-info" role="alert">Silakan pilih atau cari pelanggan untuk melihat riwayat pengiriman.</div>`;
                } else if (currentUrlOnLoad.searchParams.get('customer_id') && contentWrapper && contentWrapper.innerHTML.trim() === ''){
                    // If customer_id is present but content is empty (e.g. user navigated back to this state)
                    // We might need to re-trigger the view update from 'shown.bs.tab' logic
                    const customerId = currentUrlOnLoad.searchParams.get('customer_id');
                    const fetchUrl = new URL(customerSearchForm?.action || (window.location.origin + '/orders'));
                    fetchUrl.searchParams.set('view', 'by_name');
                    fetchUrl.searchParams.set('customer_id', customerId);
                    fetchUrl.searchParams.set('page', currentUrlOnLoad.searchParams.get('page') || '1');
                    fetchUrl.searchParams.set('limit', currentUrlOnLoad.searchParams.get('limit') || itemsPerPageSelect?.value || '100');
                    fetchUrl.searchParams.set('grouping', currentUrlOnLoad.searchParams.get('grouping') || groupingSelect?.value || 'none');
                    if (typeof fetchAndUpdateOrdersView === 'function') {
                        fetchAndUpdateOrdersView(fetchUrl.toString());
                    }
                }
            }
            updateBatchDeleteToast();
        }
    } else {
         // Fallback if target tab button doesn't exist for some reason
         updateSearchFormVisibility('#pane-by-name'); // Default to showing by_name form
         if (contentWrapper) contentWrapper.innerHTML = `<div class="alert alert-info" role="alert">Silakan pilih atau cari pelanggan untuk melihat riwayat pengiriman.</div>`;
         updateBatchDeleteToast();
    }
    // The 'shown.bs.tab' listener on tabButtons (defined much earlier) handles updating toast for subsequent tab changes.

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
        if (hargaTambahanInput) hargaTambahanInput.value = deliveryData.harga_tambahan === null ? '' : deliveryData.harga_tambahan;

        const hargaModalTambahanInput = document.getElementById('harga-modal-tambahan-input');
        if (hargaModalTambahanInput) hargaModalTambahanInput.value = deliveryData.harga_modal_tambahan === null ? '' : deliveryData.harga_modal_tambahan;

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
            showToast('Error', 'Komponen modal edit tidak ditemukan.', 'error');
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
            showToast('Error', error.message, 'error');
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
                    showToast('Error', 'ID Pengiriman tidak ditemukan untuk diedit.', 'error');
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
                showToast('Error', 'Cannot save: Delivery ID missing.', 'error');
                submitButton.disabled = false;
                submitButton.innerHTML = originalButtonText;
                return;
            }
            const deliveryId = parseInt(deliveryIdStr); // Ensure deliveryId is an integer

            const formData = gatherEditModalFormData();

            // Simple client-side validation: ensure at least one package item if that's a rule
            if (formData.package_items.length === 0) {
                 showToast('Warning', 'Harap tambahkan minimal satu paket makanan.', 'warning');
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
                    showToast('Success', result.message || 'Order updated successfully!', 'success');

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
                } else {
                    showToast('Error', error.message, 'error');
                }
            } finally {
                submitButton.disabled = false;
                submitButton.innerHTML = originalButtonText;
            }
        });
    }
});
