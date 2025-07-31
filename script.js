  // In-memory data store for menu items (for demonstration of CRUD)
        let menuItems = [
            { id: 'm1', name: 'Classic Burger', category: 'Main Course', price: 12.99 },
            { id: 'm2', name: 'Caesar Salad', category: 'Appetizer', price: 8.50 },
            { id: 'm3', name: 'Chocolate Lava Cake', category: 'Dessert', price: 7.00 },
            { id: 'm4', name: 'Orange Juice', category: 'Beverage', price: 3.50 },
            { id: 'm5', name: 'Samosa (4 pcs)', category: 'Appetizer', price: 5.00 }
        ];

        // In-memory data store for inventory items
        let inventoryItems = [
            { id: 'i1', name: 'Flour', quantity: 50, unit: 'kg', costPerUnit: 1.20 },
            { id: 'i2', name: 'Cooking Oil', quantity: 20, unit: 'liter', costPerUnit: 3.50 },
            { id: 'i3', name: 'Salt', quantity: 10, unit: 'kg', costPerUnit: 0.80 },
            { id: 'i4', name: 'Potatoes', quantity: 30, unit: 'kg', costPerUnit: 0.75 },
            { id: 'i5', name: 'Onions', quantity: 15, unit: 'kg', costPerUnit: 0.60 },
            { id: 'i6', name: 'Ground Beef', quantity: 25, unit: 'kg', costPerUnit: 8.00 },
            { id: 'i7', name: 'Buns', quantity: 100, unit: 'pcs', costPerUnit: 0.20 },
            { id: 'i8', name: 'Lettuce', quantity: 5, unit: 'head', costPerUnit: 1.50 },
            { id: 'i9', name: 'Tomatoes', quantity: 8, unit: 'kg', costPerUnit: 1.00 },
            { id: 'i10', name: 'Cheese', quantity: 10, unit: 'kg', costPerUnit: 5.00 },
            { id: 'i11', name: 'Salmon Fillets', quantity: 10, unit: 'pcs', costPerUnit: 12.00 },
            { id: 'i12', name: 'Lemon', quantity: 20, unit: 'pcs', costPerUnit: 0.30 },
            { id: 'i13', name: 'Pasta', quantity: 15, unit: 'kg', costPerUnit: 2.00 },
            { id: 'i14', name: 'Eggs', quantity: 50, unit: 'pcs', costPerUnit: 0.25 },
            { id: 'i15', name: 'Bacon', quantity: 5, unit: 'kg', costPerUnit: 7.00 },
            { id: 'i16', name: 'Chocolate', quantity: 5, unit: 'kg', costPerUnit: 6.00 },
            { id: 'i17', name: 'Oranges', quantity: 20, unit: 'kg', costPerUnit: 1.00 }
        ];

        // In-memory data store for expenses
        let expenses = [
            { id: 'e1', date: '2025-07-18', category: 'Ingredients', description: 'Fresh Vegetables', amount: 150.00 },
            { id: 'e2', date: '2025-07-15', category: 'Utilities', description: 'Electricity Bill', amount: 300.00 }
        ];

        // In-memory data store for sales transactions (updated to include cost of goods)
        let salesTransactions = [
            { id: 't1', date: '2025-07-20', itemSold: 'Classic Burger', quantity: 1, amount: 12.99, costOfGoods: 5.00, profit: 7.99, paymentMethod: 'Credit Card' },
            { id: 't2', date: '2025-07-19', itemSold: 'Caesar Salad', quantity: 1, amount: 8.50, costOfGoods: 3.00, profit: 5.50, paymentMethod: 'Cash' }
        ];

        // In-memory data store for kitchen orders
        let kitchenOrders = [
            { id: 'ko1', date: '2025-07-20', items: [{menuItemId: 'm1', quantity: 2}, {menuItemId: 'm4', quantity: 1}], totalAmount: 29.48, status: 'New' },
            { id: 'ko2', date: '2025-07-19', items: [{menuItemId: 'm5', quantity: 1}], totalAmount: 5.00, status: 'Preparing' }
        ];

        // Simplified Recipes (linking menu items to ingredients and quantities)
        const recipes = {
            'm1': [ // Classic Burger
                { ingredientId: 'i6', quantity: 0.25 }, // 0.25 kg Ground Beef
                { ingredientId: 'i7', quantity: 2 },    // 2 pcs Buns
                { ingredientId: 'i8', quantity: 0.1 },  // 0.1 head Lettuce
                { ingredientId: 'i9', quantity: 0.05 }, // 0.05 kg Tomatoes
                { ingredientId: 'i10', quantity: 0.02 } // 0.02 kg Cheese
            ],
            'm2': [ // Caesar Salad
                { ingredientId: 'i8', quantity: 0.5 },  // 0.5 head Lettuce
                { ingredientId: 'i14', quantity: 1 }    // 1 egg (for dressing)
            ],
            'm3': [ // Chocolate Lava Cake
                { ingredientId: 'i16', quantity: 0.1 }, // 0.1 kg Chocolate
                { ingredientId: 'i14', quantity: 0.5 }, // 0.5 pcs Eggs
                { ingredientId: 'i1', quantity: 0.05 }  // 0.05 kg Flour
            ],
            'm4': [ // Orange Juice
                { ingredientId: 'i17', quantity: 0.3 }  // 0.3 kg Oranges
            ],
            'm5': [ // Samosa (4 pcs) - Example Recipe
                { ingredientId: 'i1', quantity: 0.1 },  // 0.1 kg Flour
                { ingredientId: 'i2', quantity: 0.05 }, // 0.05 liter Cooking Oil
                { ingredientId: 'i3', quantity: 0.01 }, // 0.01 kg Salt
                { ingredientId: 'i4', quantity: 0.2 },  // 0.2 kg Potatoes
                { ingredientId: 'i5', quantity: 0.05 }  // 0.05 kg Onions
            ]
        };

        // Current order being built in the "Make Order" section
        let currentOrder = [];

        // Function to generate a unique ID (simple for demo)
        const generateId = () => '_' + Math.random().toString(36).substr(2, 9);

        // Helper to get today's date in YYYY-MM-DD format
        const getTodayDate = () => {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        // DOM Elements
        const navLinks = document.querySelectorAll('.nav-link');
        const contentSections = document.querySelectorAll('.content-section');
        const currentSectionTitle = document.getElementById('current-section-title');

        // Order Management Elements
        const orderMenuItemSelect = document.getElementById('order-menu-item');
        const orderQuantityInput = document.getElementById('order-quantity');
        const addToOrderBtn = document.getElementById('add-to-order-btn');
        const currentOrderList = document.getElementById('current-order-list');
        const currentOrderTotalSpan = document.getElementById('current-order-total');
        const placeOrderBtn = document.getElementById('place-order-btn');

        // Kitchen Management Elements
        const kitchenOrdersTableBody = document.getElementById('kitchen-orders-table-body');
        const kitchenStartDateInput = document.getElementById('kitchen-start-date');
        const kitchenEndDateInput = document.getElementById('kitchen-end-date');
        const filterKitchenBtn = document.getElementById('filter-kitchen-btn');

        // Sales Elements
        const salesTransactionsTableBody = document.getElementById('sales-transactions-table-body');
        const salesStartDateInput = document.getElementById('sales-start-date');
        const salesEndDateInput = document.getElementById('sales-end-date');
        const filterSalesBtn = document.getElementById('filter-sales-btn');

        // Inventory Management Elements
        const inventoryForm = document.getElementById('inventory-form');
        const ingredientIdInput = document.getElementById('ingredient-id');
        const ingredientNameInput = document.getElementById('ingredient-name');
        const ingredientQuantityInput = document.getElementById('ingredient-quantity');
        const ingredientUnitInput = document.getElementById('ingredient-unit');
        const ingredientCostPerUnitInput = document.getElementById('ingredient-cost-per-unit');
        const inventoryItemsTableBody = document.getElementById('inventory-items-table-body');
        const cancelIngredientEditBtn = document.getElementById('cancel-ingredient-edit-btn');
        const inventoryStartDateInput = document.getElementById('inventory-start-date');
        const inventoryEndDateInput = document.getElementById('inventory-end-date');
        const filterInventoryBtn = document.getElementById('filter-inventory-btn');


        // Expenses Management Elements
        const expenseForm = document.getElementById('expense-form');
        const expenseIdInput = document.getElementById('expense-id');
        const expenseDateInput = document.getElementById('expense-date');
        const expenseCategoryInput = document.getElementById('expense-category');
        const expenseDescriptionInput = document.getElementById('expense-description');
        const expenseAmountInput = document.getElementById('expense-amount');
        const expensesTableBody = document.getElementById('expenses-table-body');
        const cancelExpenseEditBtn = document.getElementById('cancel-expense-edit-btn');
        const expenseStartDateInput = document.getElementById('expense-start-date');
        const expenseEndDateInput = document.getElementById('expense-end-date');
        const filterExpensesBtn = document.getElementById('filter-expenses-btn');


        // Reports Elements
        const reportStartDateInput = document.getElementById('report-start-date');
        const reportEndDateInput = document.getElementById('report-end-date');
        const generateReportBtn = document.getElementById('generate-report-btn');
        const reportTotalSalesSpan = document.getElementById('report-total-sales');
        const reportTotalExpensesSpan = document.getElementById('report-total-expenses');
        const reportNetBalanceSpan = document.getElementById('report-net-balance');
        const reportSalesTableBody = document.getElementById('report-sales-table-body');
        const reportExpensesTableBody = document.getElementById('report-expenses-table-body');


        // Menu Management Elements
        const menuForm = document.getElementById('menu-form');
        const menuItemIdInput = document.getElementById('menu-item-id');
        const itemNameInput = document.getElementById('item-name');
        const itemPriceInput = document.getElementById('item-price');
        const itemCategoryInput = document.getElementById('item-category');
        const menuItemsTableBody = document.getElementById('menu-items-table-body');
        const cancelMenuEditBtn = document.getElementById('cancel-menu-edit-btn');

        // Message Box Elements
        const messageBox = document.getElementById('message-box');
        const messageText = document.getElementById('message-text');
        const messageOkBtn = document.getElementById('message-ok-btn');

        /**
         * Displays a custom message box instead of alert().
         * @param {string} message - The message to display.
         */
        function showMessageBox(message) {
            messageText.textContent = message;
            messageBox.classList.remove('hidden');
        }

        // Event listener for the OK button in the message box
        messageOkBtn.addEventListener('click', () => {
            messageBox.classList.add('hidden');
        });

        /**
         * Hides all content sections.
         */
        function hideAllSections() {
            contentSections.forEach(section => {
                section.classList.add('hidden');
                section.classList.remove('active');
            });
        }

        /**
         * Shows a specific content section and updates the title.
         * @param {string} sectionId - The ID of the section to show.
         */
        function showSection(sectionId) {
            hideAllSections();
            const targetSection = document.getElementById(sectionId);
            if (targetSection) {
                targetSection.classList.remove('hidden');
                targetSection.classList.add('active');
                // Update title based on the section's h2 or a formatted ID
                currentSectionTitle.textContent = targetSection.querySelector('h2') ? targetSection.querySelector('h2').textContent : sectionId.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
            }
            // Special handling for sections that need data refresh
            if (sectionId === 'order-management') {
                renderOrderForm();
                renderCurrentOrder();
            } else if (sectionId === 'kitchen') {
                renderKitchenOrders();
            } else if (sectionId === 'sales') {
                renderSalesTransactions();
            } else if (sectionId === 'inventory-management') {
                renderInventoryItems();
            } else if (sectionId === 'expenses') {
                renderExpenses();
            } else if (sectionId === 'reports') {
                // Reports are generated on button click, not just section load
                // but we can set default dates
                if (!reportStartDateInput.value || !reportEndDateInput.value) {
                    reportEndDateInput.value = getTodayDate();
                    reportStartDateInput.value = new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]; // 30 days ago
                }
                generateReports(); // Automatically generate on load
            } else if (sectionId === 'menu-management') {
                renderMenuItems();
            }
        }

        /**
         * Handles navigation link clicks.
         * @param {Event} event - The click event.
         */
        function handleNavLinkClick(event) {
            event.preventDefault();
            const sectionId = event.currentTarget.dataset.section;
            showSection(sectionId);

            // Update active state for navigation links
            navLinks.forEach(link => link.classList.remove('active')); // Remove 'active' from all
            event.currentTarget.classList.add('active'); // Add 'active' to the clicked link
        }

        // Add event listeners to navigation links
        navLinks.forEach(link => {
            link.addEventListener('click', handleNavLinkClick);
        });

        /**
         * Filters an array of objects by a date range.
         * @param {Array} dataArray - The array to filter.
         * @param {string} dateKey - The key in each object that holds the date string (YYYY-MM-DD).
         * @param {string} startDateStr - The start date string (YYYY-MM-DD).
         * @param {string} endDateStr - The end date string (YYYY-MM-DD).
         * @returns {Array} The filtered array.
         */
        function filterDataByDateRange(dataArray, dateKey, startDateStr, endDateStr) {
            if (!startDateStr && !endDateStr) {
                return dataArray; // No filter applied
            }

            const startDate = startDateStr ? new Date(startDateStr + 'T00:00:00') : null;
            const endDate = endDateStr ? new Date(endDateStr + 'T23:59:59') : null;

            return dataArray.filter(item => {
                const itemDate = new Date(item[dateKey] + 'T00:00:00'); // Ensure comparison is date-only
                let isAfterStart = true;
                let isBeforeEnd = true;

                if (startDate) {
                    isAfterStart = itemDate >= startDate;
                }
                if (endDate) {
                    isBeforeEnd = itemDate <= endDate;
                }
                return isAfterStart && isBeforeEnd;
            });
        }


        // --- Order Management Functions ---

        /**
         * Populates the menu item select dropdown.
         */
        function renderOrderForm() {
            orderMenuItemSelect.innerHTML = '<option value="">-- Select an Item --</option>';
            menuItems.forEach(item => {
                const option = document.createElement('option');
                option.value = item.id;
                option.textContent = `${item.name} ($${item.price.toFixed(2)})`;
                orderMenuItemSelect.appendChild(option);
            });
        }

        /**
         * Renders the items currently added to the order.
         */
        function renderCurrentOrder() {
            currentOrderList.innerHTML = '';
            let total = 0;
            if (currentOrder.length === 0) {
                currentOrderList.innerHTML = `<li class="order-list-item">No items in current order.</li>`;
            } else {
                currentOrder.forEach((orderItem, index) => {
                    const menuItem = menuItems.find(item => item.id === orderItem.menuItemId);
                    if (menuItem) {
                        const listItem = document.createElement('li');
                        listItem.classList.add('order-list-item');
                        listItem.innerHTML = `
                            <span>${menuItem.name} x ${orderItem.quantity}</span>
                            <span>$${(menuItem.price * orderItem.quantity).toFixed(2)}</span>
                            <button onclick="removeOrderItem(${index})">&times;</button>
                        `;
                        currentOrderList.appendChild(listItem);
                        total += menuItem.price * orderItem.quantity;
                    }
                });
            }
            currentOrderTotalSpan.textContent = total.toFixed(2);
        }

        /**
         * Adds a selected menu item to the current order.
         */
        addToOrderBtn.addEventListener('click', () => {
            const selectedItemId = orderMenuItemSelect.value;
            const quantity = parseInt(orderQuantityInput.value);

            if (!selectedItemId || isNaN(quantity) || quantity <= 0) {
                showMessageBox('Please select a menu item and enter a valid quantity.');
                return;
            }

            const existingItemIndex = currentOrder.findIndex(item => item.menuItemId === selectedItemId);
            if (existingItemIndex > -1) {
                currentOrder[existingItemIndex].quantity += quantity;
            } else {
                currentOrder.push({ menuItemId: selectedItemId, quantity: quantity });
            }

            renderCurrentOrder();
            orderMenuItemSelect.value = ''; // Reset select
            orderQuantityInput.value = '1'; // Reset quantity
        });

        /**
         * Removes an item from the current order.
         * @param {number} index - The index of the item to remove.
         */
        window.removeOrderItem = (index) => {
            currentOrder.splice(index, 1);
            renderCurrentOrder();
        };

        /**
         * Places the current order, adding it to kitchen orders.
         */
        placeOrderBtn.addEventListener('click', () => {
            if (currentOrder.length === 0) {
                showMessageBox('Please add items to the order before placing it.');
                return;
            }

            let totalOrderAmount = 0;
            currentOrder.forEach(item => {
                const menuItem = menuItems.find(m => m.id === item.menuItemId);
                if (menuItem) {
                    totalOrderAmount += menuItem.price * item.quantity;
                }
            });

            const newOrder = {
                id: generateId(),
                date: getTodayDate(),
                items: JSON.parse(JSON.stringify(currentOrder)), // Deep copy to avoid reference issues
                totalAmount: totalOrderAmount,
                status: 'New'
            };
            kitchenOrders.push(newOrder);

            currentOrder = []; // Clear current order
            renderCurrentOrder();
            showMessageBox('Order placed successfully! It has been sent to the kitchen.');
            renderKitchenOrders(); // Update kitchen view
        });


        // --- Kitchen Management Functions ---

        /**
         * Renders kitchen orders in the table.
         */
        function renderKitchenOrders() {
            kitchenOrdersTableBody.innerHTML = ''; // Clear existing rows
            const filteredOrders = filterDataByDateRange(kitchenOrders, 'date', kitchenStartDateInput.value, kitchenEndDateInput.value);

            if (filteredOrders.length === 0) {
                kitchenOrdersTableBody.innerHTML = `<tr><td colspan="6" class="table-empty-state">No kitchen orders found for this period.</td></tr>`;
                return;
            }

            filteredOrders.forEach(order => {
                const itemsList = order.items.map(item => {
                    const menuItem = menuItems.find(m => m.id === item.menuItemId);
                    return `${menuItem ? menuItem.name : 'Unknown Item'} x ${item.quantity}`;
                }).join(', ');

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="font-medium">${order.id}</td>
                    <td class="text-gray">${order.date}</td>
                    <td class="text-gray">${itemsList}</td>
                    <td class="text-gray">$${order.totalAmount.toFixed(2)}</td>
                    <td>
                        <span class="status-badge ${order.status.toLowerCase()}">
                            ${order.status}
                        </span>
                    </td>
                    <td class="table-actions">
                        ${order.status === 'New' || order.status === 'Preparing' ?
                            `<button onclick="markOrderReady('${order.id}')" class="edit">Mark Ready</button>` :
                            `<button class="edit" disabled>Mark Ready</button>`
                        }
                        ${order.status !== 'Cancelled' ?
                            `<button onclick="cancelKitchenOrder('${order.id}')" class="delete">Cancel</button>` :
                            `<button class="delete" disabled>Cancelled</button>`
                        }
                    </td>
                `;
                kitchenOrdersTableBody.appendChild(row);
            });
        }

        /**
         * Marks a kitchen order as ready and processes the sale.
         * @param {string} orderId - The ID of the order to mark ready.
         */
        window.markOrderReady = (orderId) => {
            const orderIndex = kitchenOrders.findIndex(order => order.id === orderId);
            if (orderIndex === -1) {
                showMessageBox('Error: Order not found.');
                return;
            }

            const order = kitchenOrders[orderIndex];
            if (order.status === 'Ready' || order.status === 'Cancelled') {
                showMessageBox('Order is already marked ready or cancelled.');
                return;
            }

            let totalCostOfGoods = 0;
            let inventoryDeductionSuccessful = true;
            let insufficientStockMessages = [];

            // Pre-check inventory
            for (const orderItem of order.items) {
                const menuItem = menuItems.find(m => m.id === orderItem.menuItemId);
                if (!menuItem) continue; // Skip if menu item not found

                const recipe = recipes[menuItem.id];
                if (!recipe) {
                    showMessageBox(`Warning: No recipe for ${menuItem.name}. Cannot deduct inventory.`);
                    // Allow sale but with 0 cost for this item
                    continue;
                }

                for (const recipeIngredient of recipe) {
                    const ingredient = inventoryItems.find(inv => inv.id === recipeIngredient.ingredientId);
                    if (!ingredient) {
                        inventoryDeductionSuccessful = false;
                        insufficientStockMessages.push(`Ingredient '${recipeIngredient.ingredientId}' for ${menuItem.name} not found in inventory.`);
                        break;
                    }
                    const requiredQuantity = recipeIngredient.quantity * orderItem.quantity;
                    if (ingredient.quantity < requiredQuantity) {
                        inventoryDeductionSuccessful = false;
                        insufficientStockMessages.push(`Insufficient stock for ${ingredient.name} (for ${menuItem.name}). Needed: ${requiredQuantity.toFixed(2)} ${ingredient.unit}, Available: ${ingredient.quantity.toFixed(2)} ${ingredient.unit}.`);
                        break;
                    }
                }
                if (!inventoryDeductionSuccessful) break;
            }

            if (!inventoryDeductionSuccessful) {
                showMessageBox('Cannot mark order ready due to insufficient inventory:\n' + insufficientStockMessages.join('\n'));
                return;
            }

            // Deduct inventory and calculate cost of goods
            for (const orderItem of order.items) {
                const menuItem = menuItems.find(m => m.id === orderItem.menuItemId);
                if (!menuItem) continue;

                const recipe = recipes[menuItem.id];
                if (!recipe) continue; // Already warned, skip deduction if no recipe

                for (const recipeIngredient of recipe) {
                    const ingredient = inventoryItems.find(inv => inv.id === recipeIngredient.ingredientId);
                    const requiredQuantity = recipeIngredient.quantity * orderItem.quantity;

                    ingredient.quantity -= requiredQuantity;
                    totalCostOfGoods += requiredQuantity * ingredient.costPerUnit;
                }
            }

            const profit = order.totalAmount - totalCostOfGoods;

            // Record sale for each item in the order
            order.items.forEach(orderItem => {
                const menuItem = menuItems.find(m => m.id === orderItem.menuItemId);
                if (menuItem) {
                    // Recalculate cost of goods for this specific item in the order
                    let itemCostOfGoods = 0;
                    const itemRecipe = recipes[menuItem.id];
                    if (itemRecipe) {
                        itemRecipe.forEach(recIng => {
                            const ing = inventoryItems.find(inv => inv.id === recIng.ingredientId);
                            if (ing) {
                                itemCostOfGoods += recIng.quantity * orderItem.quantity * ing.costPerUnit;
                            }
                        });
                    }
                    recordSale(menuItem.name, orderItem.quantity, menuItem.price * orderItem.quantity, itemCostOfGoods, (menuItem.price * orderItem.quantity) - itemCostOfGoods);
                }
            });


            order.status = 'Ready';
            showMessageBox(`Order ${order.id} marked as Ready! Sales recorded.`);
            renderKitchenOrders();
            renderInventoryItems();
            renderSalesTransactions();
        };

        /**
         * Cancels a kitchen order.
         * @param {string} orderId - The ID of the order to cancel.
         */
        window.cancelKitchenOrder = (orderId) => {
            const orderIndex = kitchenOrders.findIndex(order => order.id === orderId);
            if (orderIndex === -1) {
                showMessageBox('Error: Order not found.');
                return;
            }

            const order = kitchenOrders[orderIndex];
            if (order.status === 'Ready' || order.status === 'Cancelled') {
                showMessageBox('Order cannot be cancelled. It is already ready or cancelled.');
                return;
            }

            order.status = 'Cancelled';
            showMessageBox(`Order ${order.id} has been cancelled.`);
            renderKitchenOrders();
        };

        // Event listeners for kitchen date filters
        filterKitchenBtn.addEventListener('click', renderKitchenOrders);


        // --- Sales Management Functions ---

        /**
         * Records a sale transaction.
         * @param {string} itemSold - Name of the item sold.
         * @param {number} quantity - Quantity sold.
         * @param {number} amount - Total sale amount.
         * @param {number} costOfGoods - Total cost of ingredients for this sale.
         * @param {number} profit - Profit from this sale.
         */
        function recordSale(itemSold, quantity, amount, costOfGoods, profit) {
            const newTransaction = {
                id: generateId(),
                date: getTodayDate(), // Current date
                itemSold,
                quantity,
                amount,
                costOfGoods,
                profit,
                paymentMethod: 'Kitchen Order' // From kitchen order
            };
            salesTransactions.push(newTransaction);
        }

        /**
         * Renders the sales transactions in the table. (READ operation)
         */
        function renderSalesTransactions() {
            salesTransactionsTableBody.innerHTML = ''; // Clear existing rows
            const filteredSales = filterDataByDateRange(salesTransactions, 'date', salesStartDateInput.value, salesEndDateInput.value);

            if (filteredSales.length === 0) {
                salesTransactionsTableBody.innerHTML = `<tr><td colspan="9" class="table-empty-state">No sales transactions found for this period.</td></tr>`;
                return;
            }
            filteredSales.forEach(transaction => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="font-medium">${transaction.id}</td>
                    <td class="text-gray">${transaction.date}</td>
                    <td class="text-gray">${transaction.itemSold}</td>
                    <td class="text-gray">${transaction.quantity}</td>
                    <td class="text-gray">$${transaction.amount.toFixed(2)}</td>
                    <td class="text-gray">$${transaction.costOfGoods.toFixed(2)}</td>
                    <td class="text-gray">$${transaction.profit.toFixed(2)}</td>
                    <td class="text-gray">${transaction.paymentMethod}</td>
                    <td class="table-actions">
                        <button class="view-details">View Details</button>
                    </td>
                `;
                salesTransactionsTableBody.appendChild(row);
            });
        }

        // Event listeners for sales date filters
        filterSalesBtn.addEventListener('click', renderSalesTransactions);


        // --- Inventory Management Functions (CRUD) ---

        /**
         * Renders the inventory items in the table. (READ operation)
         */
        function renderInventoryItems() {
            inventoryItemsTableBody.innerHTML = ''; // Clear existing rows
            // Inventory itself is not date-ranged, but we can filter expenses/purchases if they were recorded here
            // For now, just display all current inventory. Date filters would apply to transactions affecting inventory.
            const filteredInventory = inventoryItems; // No date filter for current stock display

            if (filteredInventory.length === 0) {
                inventoryItemsTableBody.innerHTML = `<tr><td colspan="7" class="table-empty-state">No inventory items added yet.</td></tr>`;
                return;
            }
            filteredInventory.forEach(item => {
                const totalValue = item.quantity * item.costPerUnit;
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="font-medium">${item.id}</td>
                    <td class="text-gray">${item.name}</td>
                    <td class="text-gray">${item.quantity.toFixed(2)}</td>
                    <td class="text-gray">${item.unit}</td>
                    <td class="text-gray">$${item.costPerUnit.toFixed(2)}</td>
                    <td class="text-gray">$${totalValue.toFixed(2)}</td>
                    <td class="table-actions">
                        <button onclick="editInventoryItem('${item.id}')" class="edit">Edit</button>
                        <button onclick="deleteInventoryItem('${item.id}')" class="delete">Delete</button>
                    </td>
                `;
                inventoryItemsTableBody.appendChild(row);
            });
        }

        /**
         * Handles form submission for adding/editing inventory items. (CREATE/UPDATE operation)
         * @param {Event} event - The form submit event.
         */
        inventoryForm.addEventListener('submit', (event) => {
            event.preventDefault();

            const id = ingredientIdInput.value;
            const name = ingredientNameInput.value.trim();
            const quantity = parseFloat(ingredientQuantityInput.value);
            const unit = ingredientUnitInput.value.trim();
            const costPerUnit = parseFloat(ingredientCostPerUnitInput.value);

            if (!name || isNaN(quantity) || quantity < 0 || !unit || isNaN(costPerUnit) || costPerUnit < 0) {
                showMessageBox('Please fill in all fields correctly for inventory item.');
                return;
            }

            if (id) {
                // Update existing item
                const index = inventoryItems.findIndex(item => item.id === id);
                if (index !== -1) {
                    inventoryItems[index] = { id, name, quantity, unit, costPerUnit };
                    showMessageBox('Inventory item updated successfully!');
                } else {
                    showMessageBox('Error: Inventory item not found for update.');
                }
            } else {
                // Add new item
                const newItem = {
                    id: generateId(),
                    name,
                    quantity,
                    unit,
                    costPerUnit
                };
                inventoryItems.push(newItem);
                showMessageBox('New inventory item added successfully!');
            }

            // Clear form and reset for new entry
            inventoryForm.reset();
            ingredientIdInput.value = '';
            cancelIngredientEditBtn.classList.add('hidden');
            renderInventoryItems();
        });

        /**
         * Populates the form with data for editing an inventory item. (READ for EDIT)
         * @param {string} id - The ID of the inventory item to edit.
         */
        window.editInventoryItem = (id) => {
            const itemToEdit = inventoryItems.find(item => item.id === id);
            if (itemToEdit) {
                ingredientIdInput.value = itemToEdit.id;
                ingredientNameInput.value = itemToEdit.name;
                ingredientQuantityInput.value = itemToEdit.quantity;
                ingredientUnitInput.value = itemToEdit.unit;
                ingredientCostPerUnitInput.value = itemToEdit.costPerUnit;
                cancelIngredientEditBtn.classList.remove('hidden');
                ingredientNameInput.focus();
            } else {
                showMessageBox('Inventory item not found for editing.');
            }
        };

        /**
         * Cancels the current inventory item edit operation and clears the form.
         */
        cancelIngredientEditBtn.addEventListener('click', () => {
            inventoryForm.reset();
            ingredientIdInput.value = '';
            cancelIngredientEditBtn.classList.add('hidden');
        });

        /**
         * Deletes an inventory item. (DELETE operation)
         * @param {string} id - The ID of the inventory item to delete.
         */
        window.deleteInventoryItem = (id) => {
            const initialLength = inventoryItems.length;
            inventoryItems = inventoryItems.filter(item => item.id !== id);
            if (inventoryItems.length < initialLength) {
                showMessageBox('Inventory item deleted successfully!');
                renderInventoryItems();
            } else {
                showMessageBox('Error: Inventory item not found for deletion.');
            }
        };

        // Event listeners for inventory date filters (currently just re-renders all)
        filterInventoryBtn.addEventListener('click', renderInventoryItems);


        // --- Expenses Management Functions (CRUD) ---

        /**
         * Renders the expenses in the table. (READ operation)
         */
        function renderExpenses() {
            expensesTableBody.innerHTML = ''; // Clear existing rows
            const filteredExpenses = filterDataByDateRange(expenses, 'date', expenseStartDateInput.value, expenseEndDateInput.value);

            if (filteredExpenses.length === 0) {
                expensesTableBody.innerHTML = `<tr><td colspan="5" class="table-empty-state">No expenses found for this period.</td></tr>`;
                return;
            }
            filteredExpenses.forEach(expense => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="font-medium">${expense.date}</td>
                    <td class="text-gray">${expense.category}</td>
                    <td class="text-gray">${expense.description}</td>
                    <td class="text-gray">$${expense.amount.toFixed(2)}</td>
                    <td class="table-actions">
                        <button onclick="editExpense('${expense.id}')" class="edit">Edit</button>
                        <button onclick="deleteExpense('${expense.id}')" class="delete">Delete</button>
                    </td>
                `;
                expensesTableBody.appendChild(row);
            });
        }

        /**
         * Handles form submission for adding/editing expenses. (CREATE/UPDATE operation)
         * @param {Event} event - The form submit event.
         */
        expenseForm.addEventListener('submit', (event) => {
            event.preventDefault();

            const id = expenseIdInput.value;
            const date = expenseDateInput.value;
            const category = expenseCategoryInput.value.trim();
            const description = expenseDescriptionInput.value.trim();
            const amount = parseFloat(expenseAmountInput.value);

            if (!date || !category || !description || isNaN(amount) || amount <= 0) {
                showMessageBox('Please fill in all fields correctly for expense.');
                return;
            }

            if (id) {
                // Update existing expense
                const index = expenses.findIndex(exp => exp.id === id);
                if (index !== -1) {
                    expenses[index] = { id, date, category, description, amount };
                    showMessageBox('Expense updated successfully!');
                } else {
                    showMessageBox('Error: Expense not found for update.');
                }
            } else {
                // Add new expense
                const newExpense = {
                    id: generateId(),
                    date,
                    category,
                    description,
                    amount
                };
                expenses.push(newExpense);
                showMessageBox('New expense added successfully!');
            }

            // Clear form and reset for new entry
            expenseForm.reset();
            expenseIdInput.value = '';
            cancelExpenseEditBtn.classList.add('hidden');
            renderExpenses();
        });

        /**
         * Populates the form with data for editing an expense. (READ for EDIT)
         * @param {string} id - The ID of the expense to edit.
         */
        window.editExpense = (id) => {
            const expenseToEdit = expenses.find(exp => exp.id === id);
            if (expenseToEdit) {
                expenseIdInput.value = expenseToEdit.id;
                expenseDateInput.value = expenseToEdit.date;
                expenseCategoryInput.value = expenseToEdit.category;
                expenseDescriptionInput.value = expenseToEdit.description;
                expenseAmountInput.value = expenseToEdit.amount;
                cancelExpenseEditBtn.classList.remove('hidden');
                expenseDateInput.focus();
            } else {
                showMessageBox('Expense not found for editing.');
            }
        };

        /**
         * Cancels the current expense edit operation and clears the form.
         */
        cancelExpenseEditBtn.addEventListener('click', () => {
            expenseForm.reset();
            expenseIdInput.value = '';
            cancelExpenseEditBtn.classList.add('hidden');
        });

        /**
         * Deletes an expense. (DELETE operation)
         * @param {string} id - The ID of the expense to delete.
         */
        window.deleteExpense = (id) => {
            const initialLength = expenses.length;
            expenses = expenses.filter(exp => exp.id !== id);
            if (expenses.length < initialLength) {
                showMessageBox('Expense deleted successfully!');
                renderExpenses();
            } else {
                showMessageBox('Error: Expense not found for deletion.');
            }
        };

        // Event listeners for expenses date filters
        filterExpensesBtn.addEventListener('click', renderExpenses);


        // --- Reports Section Functions ---

        /**
         * Generates and displays sales, expense, and balance reports for a given date range.
         */
        function generateReports() {
            const startDate = reportStartDateInput.value;
            const endDate = reportEndDateInput.value;

            const filteredSales = filterDataByDateRange(salesTransactions, 'date', startDate, endDate);
            const filteredExpenses = filterDataByDateRange(expenses, 'date', startDate, endDate);

            let totalSalesAmount = filteredSales.reduce((sum, transaction) => sum + transaction.amount, 0);
            let totalCostOfGoods = filteredSales.reduce((sum, transaction) => sum + transaction.costOfGoods, 0);
            let totalExpensesAmount = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);

            let netBalance = totalSalesAmount - totalCostOfGoods - totalExpensesAmount;

            reportTotalSalesSpan.textContent = `$${totalSalesAmount.toFixed(2)}`;
            reportTotalExpensesSpan.textContent = `$${totalExpensesAmount.toFixed(2)}`;
            reportNetBalanceSpan.textContent = `$${netBalance.toFixed(2)}`;
            reportNetBalanceSpan.style.color = netBalance >= 0 ? '#22c55e' : '#ef4444'; // Green for profit, red for loss

            // Render filtered sales details
            reportSalesTableBody.innerHTML = '';
            if (filteredSales.length === 0) {
                reportSalesTableBody.innerHTML = `<tr><td colspan="5" class="table-empty-state">No sales data for this period.</td></tr>`;
            } else {
                filteredSales.forEach(transaction => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td class="text-gray">${transaction.date}</td>
                        <td class="text-gray">${transaction.itemSold}</td>
                        <td class="text-gray">${transaction.quantity}</td>
                        <td class="text-gray">$${transaction.amount.toFixed(2)}</td>
                        <td class="text-gray">$${transaction.profit.toFixed(2)}</td>
                    `;
                    reportSalesTableBody.appendChild(row);
                });
            }

            // Render filtered expenses details
            reportExpensesTableBody.innerHTML = '';
            if (filteredExpenses.length === 0) {
                reportExpensesTableBody.innerHTML = `<tr><td colspan="4" class="table-empty-state">No expense data for this period.</td></tr>`;
            } else {
                filteredExpenses.forEach(expense => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td class="text-gray">${expense.date}</td>
                        <td class="text-gray">${expense.category}</td>
                        <td class="text-gray">${expense.description}</td>
                        <td class="text-gray">$${expense.amount.toFixed(2)}</td>
                    `;
                    reportExpensesTableBody.appendChild(row);
                });
            }
        }

        // Event listener for generate report button
        generateReportBtn.addEventListener('click', generateReports);


        // --- Menu Management Functions (CRUD) ---

        /**
         * Renders the menu items in the table. (READ operation)
         */
        function renderMenuItems() {
            menuItemsTableBody.innerHTML = ''; // Clear existing rows
            if (menuItems.length === 0) {
                menuItemsTableBody.innerHTML = `<tr><td colspan="5" class="table-empty-state">No menu items added yet.</td></tr>`;
                return;
            }
            menuItems.forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="font-medium">${item.id}</td>
                    <td class="text-gray">${item.name}</td>
                    <td class="text-gray">${item.category}</td>
                    <td class="text-gray">$${item.price.toFixed(2)}</td>
                    <td class="table-actions">
                        <button onclick="editMenuItem('${item.id}')" class="edit">Edit</button>
                        <button onclick="deleteMenuItem('${item.id}')" class="delete">Delete</button>
                    </td>
                `;
                menuItemsTableBody.appendChild(row);
            });
        }

        /**
         * Handles form submission for adding/editing menu items. (CREATE/UPDATE operation)
         * @param {Event} event - The form submit event.
         */
        menuForm.addEventListener('submit', (event) => {
            event.preventDefault();

            const id = menuItemIdInput.value;
            const name = itemNameInput.value.trim();
            const price = parseFloat(itemPriceInput.value);
            const category = itemCategoryInput.value.trim();

            if (!name || isNaN(price) || price <= 0 || !category) {
                showMessageBox('Please fill in all fields correctly for menu item.');
                return;
            }

            if (id) {
                // Update existing item
                const index = menuItems.findIndex(item => item.id === id);
                if (index !== -1) {
                    menuItems[index] = { id, name, price, category };
                    showMessageBox('Menu item updated successfully!');
                } else {
                    showMessageBox('Error: Menu item not found for update.');
                }
            } else {
                // Add new item
                const newItem = {
                    id: generateId(),
                    name,
                    price,
                    category
                };
                menuItems.push(newItem);
                showMessageBox('New menu item added successfully!');
            }

            // Clear form and reset for new entry
            menuForm.reset();
            menuItemIdInput.value = '';
            cancelMenuEditBtn.classList.add('hidden');
            renderMenuItems();
            renderOrderForm(); // Update order form dropdown
        });

        /**
         * Populates the form with data for editing a menu item. (READ for EDIT)
         * @param {string} id - The ID of the menu item to edit.
         */
        window.editMenuItem = (id) => {
            const itemToEdit = menuItems.find(item => item.id === id);
            if (itemToEdit) {
                menuItemIdInput.value = itemToEdit.id;
                itemNameInput.value = itemToEdit.name;
                itemPriceInput.value = itemToEdit.price;
                itemCategoryInput.value = itemToEdit.category;
                cancelMenuEditBtn.classList.remove('hidden');
                itemNameInput.focus(); // Focus on the first input for convenience
            } else {
                showMessageBox('Menu item not found for editing.');
            }
        };

        /**
         * Cancels the current menu item edit operation and clears the form.
         */
        cancelMenuEditBtn.addEventListener('click', () => {
            menuForm.reset();
            menuItemIdInput.value = '';
            cancelMenuEditBtn.classList.add('hidden');
        });

        /**
         * Deletes a menu item. (DELETE operation)
         * @param {string} id - The ID of the menu item to delete.
         */
        window.deleteMenuItem = (id) => {
            const initialLength = menuItems.length;
            menuItems = menuItems.filter(item => item.id !== id);
            if (menuItems.length < initialLength) {
                showMessageBox('Menu item deleted successfully!');
                renderMenuItems();
                renderOrderForm(); // Update order form dropdown
            } else {
                showMessageBox('Error: Menu item not found for deletion.');
            }
        };


        // Initialize: Show Order Management and render all relevant sections on load
        window.onload = () => {
            showSection('order-management'); // Set initial section to Order Management
            document.querySelector('.nav-link[data-section="order-management"]').classList.add('active');

            // Set default dates for date inputs
            const today = getTodayDate();
            const thirtyDaysAgo = new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0];

            kitchenStartDateInput.value = thirtyDaysAgo;
            kitchenEndDateInput.value = today;
            salesStartDateInput.value = thirtyDaysAgo;
            salesEndDateInput.value = today;
            inventoryStartDateInput.value = thirtyDaysAgo;
            inventoryEndDateInput.value = today;
            expenseStartDateInput.value = thirtyDaysAgo;
            expenseEndDateInput.value = today;
            reportStartDateInput.value = thirtyDaysAgo;
            reportEndDateInput.value = today;

            renderOrderForm();
            renderCurrentOrder();
            renderKitchenOrders();
            renderSalesTransactions();
            renderInventoryItems();
            renderExpenses();
            generateReports(); // Generate initial report based on default dates
        };
