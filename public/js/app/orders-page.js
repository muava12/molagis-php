document.addEventListener('DOMContentLoaded', function () {
    const customerSearchInput = document.getElementById('customer_search_orders');
    const selectedCustomerIdHidden = document.getElementById('selected_customer_id_hidden');
    const customerSearchForm = customerSearchInput ? customerSearchInput.closest('form') : null;

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
            item: function (text, input) {
                // Standard item rendering
                return Awesomplete.ITEM_MARK(text, input);
            },
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
});
