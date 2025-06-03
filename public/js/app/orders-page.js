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
                if (Array.isArray(data)) { // Check if data is an array as expected
                    const customerList = data.map(customer => ({
                        label: customer.nama, // 'nama' is the field name from existing /api/customers
                        value: customer.id    // 'id' is the field name
                    }));
                    awesompleteInstance.list = customerList;
                } else if (data && Array.isArray(data.customers)) { 
                    // If the API returns {customers: [...]} like in another part of the app
                     const customerList = data.customers.map(customer => ({
                        label: customer.nama,
                        value: customer.id  
                    }));
                    awesompleteInstance.list = customerList;
                } else {
                    console.error('Customer data is not in the expected format:', data);
                    awesompleteInstance.list = []; // Set to empty list on error
                }
            })
            .catch(error => {
                console.error('Error fetching or processing customer data for Awesomplete:', error);
                awesompleteInstance.list = []; // Set to empty list on error
            });

        // Event listener for when an item is selected
        customerSearchInput.addEventListener('awesomplete-selectcomplete', function (event) {
            const selection = event.text; // {label: "Customer Name", value: "customer_id_string"}
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
});
