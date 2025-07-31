// script.js - Frontend JavaScript for Restaurant Management System

// --- Configuration ---
// IMPORTANT: Ensure this URL matches where your Node.js backend is deployed.
// If your backend is deployed on Render.com at restaurantmgtsys.onrender.com, use this URL.
// If running locally, change it back to 'http://localhost:5000/api'.
const BACKEND_API_URL = 'https://restaurantmgtsys.onrender.com/api';

// --- In-memory state (for current order being built) ---
let currentOrder = [];
let allMenuItems = []; // To store fetched menu items for dropdowns

// --- Helper Functions ---

/**
 * Displays a custom message box.
 * @param {string} message - The message to display.
 */
function showMessageBox(message) {
    messageText.textContent = message;
    messageBox.classList.remove('hidden');
}

// Event listener for the OK button in the message box
const messageBox = document.getElementById('message-box');
const messageText = document.getElementById('message-text');
const messageOkBtn = document.getElementById('message-ok-btn');

messageOkBtn.addEventListener('click', () => {
    messageBox.classList.add('hidden');
});

/**
 * Helper to get today's date in YYYY-MM-DD format.
 * @returns {string} Current date in YYYY-MM-DD format.
 */
const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Helper to format a Date object to YYYY-MM-DD string.
 * @param {Date} dateObj - The Date object to format.
 * @returns {string} Formatted date string.
 */
const formatDateForInput = (dateObj) => {
    if (!dateObj) return '';
    const date = new Date(dateObj);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Handles API fetch requests.
 * @param {string} url - The API endpoint URL.
 * @param {object} options - Fetch options (method, headers, body).
 * @returns {Promise<object>} The JSON response data.
 * @throws {Error} If the network request fails or the server returns an error.
 */
async function fetchData(url, options = {}) {
    try {
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Fetch error:', error);
        showMessageBox(`Error: ${error.message}`);
        throw error; // Re-throw to allow calling function to handle
    }
}

// --- DOM Elements ---
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
async function showSection(sectionId) {
    hideAllSections();
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.remove('hidden');
        targetSection.classList.add('active');
        currentSectionTitle.textContent = targetSection.querySelector('h2') ? targetSection.querySelector('h2').textContent : sectionId.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }
    // Special handling for sections that need data refresh
    if (sectionId === 'order-management') {
        await renderOrderForm();
        renderCurrentOrder(); // Render the in-memory current order
    } else if (sectionId === 'kitchen') {
        await renderKitchenOrders();
    } else if (sectionId === 'sales') {
        await renderSalesTransactions();
    } else if (sectionId === 'inventory-management') {
        await renderInventoryItems();
    } else if (sectionId === 'expenses') {
        await renderExpenses();
    } else if (sectionId === 'reports') {
        // Reports are generated on button click, but we can set default dates
        if (!reportStartDateInput.value || !reportEndDateInput.value) {
            reportEndDateInput.value = getTodayDate();
            reportStartDateInput.value = new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]; // 30 days ago
        }
        await generateReports(); // Automatically generate on load
    } else if (sectionId === 'menu-management') {
        await renderMenuItems();
    }
}

/**
 * Handles navigation link clicks.
 * @param {Event} event - The click event.
 */
async function handleNavLinkClick(event) {
    event.preventDefault();
    const targetElement = event.currentTarget; // Assign to a clearer variable

    // Defensive check: Ensure targetElement is a valid HTMLElement before proceeding
    // This helps prevent the TypeError if for some reason event.currentTarget becomes null or not an element.
    if (!targetElement || !(targetElement instanceof HTMLElement)) {
        console.error("Clicked element is not a valid HTML element:", targetElement);
        return; // Exit the function to prevent the TypeError
    }

    await showSection(targetElement.dataset.section); // Use targetElement.dataset.section directly

    // Update active state for navigation links
    navLinks.forEach(link => {
        // Also add a defensive check here for each link in the NodeList
        if (link && link instanceof HTMLElement) {
            link.classList.remove('active');
        }
    });
    targetElement.classList.add('active'); // Add 'active' to the clicked link
}

// Add event listeners to navigation links
navLinks.forEach(link => {
    link.addEventListener('click', handleNavLinkClick);
});

// --- Order Management Functions ---

/**
 * Populates the menu item select dropdown.
 */
async function renderOrderForm() {
    orderMenuItemSelect.innerHTML = '<option value="">-- Select an Item --</option>';
    try {
        allMenuItems = await fetchData(`${BACKEND_API_URL}/menu`); // Fetch all menu items
        allMenuItems.forEach(item => {
            const option = document.createElement('option');
            option.value = item._id; // Use MongoDB _id
            option.textContent = `${item.name} ($${item.price.toFixed(2)})`;
            orderMenuItemSelect.appendChild(option);
        });
    } catch (error) {
        // Error handled by fetchData
    }
}

/**
 * Renders the items currently added to the order (in-memory).
 */
function renderCurrentOrder() {
    currentOrderList.innerHTML = '';
    let total = 0;
    if (currentOrder.length === 0) {
        currentOrderList.innerHTML = `<li class="order-list-item">No items in current order.</li>`;
    } else {
        currentOrder.forEach((orderItem, index) => {
            const menuItem = allMenuItems.find(item => item._id === orderItem.menuItemId); // Find from fetched items
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
 * Adds a selected menu item to the current order (in-memory).
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
 * Removes an item from the current order (in-memory).
 * @param {number} index - The index of the item to remove.
 */
window.removeOrderItem = (index) => {
    currentOrder.splice(index, 1);
    renderCurrentOrder();
};

/**
 * Places the current order, sending it to the backend kitchen orders.
 */
placeOrderBtn.addEventListener('click', async () => {
    if (currentOrder.length === 0) {
        showMessageBox('Please add items to the order before placing it.');
        return;
    }

    let totalOrderAmount = 0;
    currentOrder.forEach(item => {
        const menuItem = allMenuItems.find(m => m._id === item.menuItemId);
        if (menuItem) {
            totalOrderAmount += menuItem.price * item.quantity;
        }
    });

    try {
        const newOrder = await fetchData(`${BACKEND_API_URL}/kitchen-orders`, {
            method: 'POST',
            body: JSON.stringify({
                items: currentOrder, // Send menuItemId and quantity
                totalAmount: totalOrderAmount
            })
        });
        showMessageBox(`Order ${newOrder._id} placed successfully! It has been sent to the kitchen.`);
        currentOrder = []; // Clear current order
        renderCurrentOrder();
        // Optionally navigate to kitchen view or refresh it
        // await showSection('kitchen');
    } catch (error) {
        // Error handled by fetchData
    }
});


// --- Kitchen Management Functions ---

/**
 * Renders kitchen orders in the table by fetching from backend.
 */
async function renderKitchenOrders() {
    kitchenOrdersTableBody.innerHTML = ''; // Clear existing rows
    const startDate = kitchenStartDateInput.value;
    const endDate = kitchenEndDateInput.value;
    let url = `${BACKEND_API_URL}/kitchen-orders`;
    if (startDate && endDate) {
        url += `?startDate=${startDate}&endDate=${endDate}`;
    } else if (startDate) {
        url += `?startDate=${startDate}`;
    } else if (endDate) {
        url += `?endDate=${endDate}`;
    }

    try {
        const orders = await fetchData(url);

        if (orders.length === 0) {
            kitchenOrdersTableBody.innerHTML = `<tr><td colspan="6" class="table-empty-state">No kitchen orders found for this period.</td></tr>`;
            return;
        }

        orders.forEach(order => {
            const itemsList = order.items.map(item => {
                // Backend populates menuItem, so we can access its name
                return `${item.menuItem ? item.menuItem.name : 'Unknown Item'} x ${item.quantity}`;
            }).join(', ');

            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="font-medium">${order._id}</td>
                <td class="text-gray">${formatDateForInput(order.date)}</td>
                <td class="text-gray">${itemsList}</td>
                <td class="text-gray">$${order.totalAmount.toFixed(2)}</td>
                <td>
                    <span class="status-badge ${order.status.toLowerCase()}">
                        ${order.status}
                    </span>
                </td>
                <td class="table-actions">
                    ${order.status === 'New' || order.status === 'Preparing' ?
                        `<button onclick="markOrderReady('${order._id}')" class="edit">Mark Ready</button>` :
                        `<button class="edit" disabled>Mark Ready</button>`
                    }
                    ${order.status !== 'Cancelled' ?
                        `<button onclick="cancelKitchenOrder('${order._id}')" class="delete">Cancel</button>` :
                        `<button class="delete" disabled>Cancelled</button>`
                    }
                </td>
            `;
            kitchenOrdersTableBody.appendChild(row);
        });
    } catch (error) {
        // Error handled by fetchData
    }
}

/**
 * Marks a kitchen order as ready via backend API.
 * @param {string} orderId - The ID of the order to mark ready.
 */
window.markOrderReady = async (orderId) => {
    try {
        const response = await fetchData(`${BACKEND_API_URL}/kitchen-orders/${orderId}/ready`, {
            method: 'PUT'
        });
        showMessageBox(response.message);
        await renderKitchenOrders(); // Refresh kitchen orders
        await renderInventoryItems(); // Inventory changes
        await renderSalesTransactions(); // Sales changes
        await generateReports(); // Reports might change
    } catch (error) {
        // Error handled by fetchData
        if (error.message.includes('insufficient inventory')) {
            // Specific handling for inventory errors if needed
        }
    }
};

/**
 * Cancels a kitchen order via backend API.
 * @param {string} orderId - The ID of the order to cancel.
 */
window.cancelKitchenOrder = async (orderId) => {
    try {
        const response = await fetchData(`${BACKEND_API_URL}/kitchen-orders/${orderId}/cancel`, {
            method: 'PUT'
        });
        showMessageBox(response.message);
        await renderKitchenOrders(); // Refresh kitchen orders
    } catch (error) {
        // Error handled by fetchData
    }
};

// Event listeners for kitchen date filters
filterKitchenBtn.addEventListener('click', renderKitchenOrders);


// --- Sales Management Functions ---

/**
 * Renders the sales transactions in the table by fetching from backend.
 */
async function renderSalesTransactions() {
    salesTransactionsTableBody.innerHTML = ''; // Clear existing rows
    const startDate = salesStartDateInput.value;
    const endDate = salesEndDateInput.value;
    let url = `${BACKEND_API_URL}/sales`;
    if (startDate && endDate) {
        url += `?startDate=${startDate}&endDate=${endDate}`;
    } else if (startDate) {
        url += `?startDate=${startDate}`;
    } else if (endDate) {
        url += `?endDate=${endDate}`;
    }

    try {
        const sales = await fetchData(url);

        if (sales.length === 0) {
            salesTransactionsTableBody.innerHTML = `<tr><td colspan="9" class="table-empty-state">No sales transactions found for this period.</td></tr>`;
            return;
        }
        sales.forEach(transaction => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="font-medium">${transaction._id}</td>
                <td class="text-gray">${formatDateForInput(transaction.date)}</td>
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
    } catch (error) {
        // Error handled by fetchData
    }
}

// Event listeners for sales date filters
filterSalesBtn.addEventListener('click', renderSalesTransactions);


// --- Inventory Management Functions (CRUD) ---

/**
 * Renders the inventory items in the table by fetching from backend.
 */
async function renderInventoryItems() {
    inventoryItemsTableBody.innerHTML = ''; // Clear existing rows
    // Inventory itself is not date-ranged, but we can filter expenses/purchases if they were recorded here
    // For now, just display all current inventory.
    try {
        const ingredients = await fetchData(`${BACKEND_API_URL}/inventory`);

        if (ingredients.length === 0) {
            inventoryItemsTableBody.innerHTML = `<tr><td colspan="7" class="table-empty-state">No inventory items added yet.</td></tr>`;
            return;
        }
        ingredients.forEach(item => {
            const totalValue = item.quantity * item.costPerUnit;
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="font-medium">${item._id}</td>
                <td class="text-gray">${item.name}</td>
                <td class="text-gray">${item.quantity.toFixed(2)}</td>
                <td class="text-gray">${item.unit}</td>
                <td class="text-gray">$${item.costPerUnit.toFixed(2)}</td>
                <td class="text-gray">$${totalValue.toFixed(2)}</td>
                <td class="table-actions">
                    <button onclick="editInventoryItem('${item._id}')" class="edit">Edit</button>
                    <button onclick="deleteInventoryItem('${item._id}')" class="delete">Delete</button>
                </td>
            `;
            inventoryItemsTableBody.appendChild(row);
        });
    } catch (error) {
        // Error handled by fetchData
    }
}

/**
 * Handles form submission for adding/editing inventory items.
 */
inventoryForm.addEventListener('submit', async (event) => {
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

    const payload = { name, quantity, unit, costPerUnit };

    try {
        if (id) {
            // Update existing item
            await fetchData(`${BACKEND_API_URL}/inventory/${id}`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });
            showMessageBox('Inventory item updated successfully!');
        } else {
            // Add new item
            await fetchData(`${BACKEND_API_URL}/inventory`, {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            showMessageBox('New inventory item added successfully!');
        }

        // Clear form and reset for new entry
        inventoryForm.reset();
        ingredientIdInput.value = '';
        cancelIngredientEditBtn.classList.add('hidden');
        await renderInventoryItems(); // Refresh inventory display
    } catch (error) {
        // Error handled by fetchData
    }
});

/**
 * Populates the form with data for editing an inventory item.
 * @param {string} id - The ID of the inventory item to edit.
 */
window.editInventoryItem = async (id) => {
    try {
        const ingredients = await fetchData(`${BACKEND_API_URL}/inventory`);
        const itemToEdit = ingredients.find(item => item._id === id);
        if (itemToEdit) {
            ingredientIdInput.value = itemToEdit._id;
            ingredientNameInput.value = itemToEdit.name;
            ingredientQuantityInput.value = itemToEdit.quantity;
            ingredientUnitInput.value = itemToEdit.unit;
            ingredientCostPerUnitInput.value = itemToEdit.costPerUnit;
            cancelIngredientEditBtn.classList.remove('hidden');
            ingredientNameInput.focus();
        } else {
            showMessageBox('Inventory item not found for editing.');
        }
    } catch (error) {
        // Error handled by fetchData
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
 * Deletes an inventory item via backend API.
 * @param {string} id - The ID of the inventory item to delete.
 */
window.deleteInventoryItem = async (id) => {
    try {
        await fetchData(`${BACKEND_API_URL}/inventory/${id}`, {
            method: 'DELETE'
        });
        showMessageBox('Inventory item deleted successfully!');
        await renderInventoryItems(); // Refresh inventory display
    } catch (error) {
        // Error handled by fetchData
    }
};

// Event listeners for inventory date filters (currently just re-renders all)
filterInventoryBtn.addEventListener('click', renderInventoryItems);


// --- Expenses Management Functions (CRUD) ---

/**
 * Renders the expenses in the table by fetching from backend.
 */
async function renderExpenses() {
    expensesTableBody.innerHTML = ''; // Clear existing rows
    const startDate = expenseStartDateInput.value;
    const endDate = expenseEndDateInput.value;
    let url = `${BACKEND_API_URL}/expenses`;
    if (startDate && endDate) {
        url += `?startDate=${startDate}&endDate=${endDate}`;
    } else if (startDate) {
        url += `?startDate=${startDate}`;
    } else if (endDate) {
        url += `?endDate=${endDate}`;
    }

    try {
        const expenses = await fetchData(url);

        if (expenses.length === 0) {
            expensesTableBody.innerHTML = `<tr><td colspan="5" class="table-empty-state">No expenses found for this period.</td></tr>`;
            return;
        }
        expenses.forEach(expense => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="font-medium">${formatDateForInput(expense.date)}</td>
                <td class="text-gray">${expense.category}</td>
                <td class="text-gray">${expense.description}</td>
                <td class="text-gray">$${expense.amount.toFixed(2)}</td>
                <td class="table-actions">
                    <button onclick="editExpense('${expense._id}')" class="edit">Edit</button>
                    <button onclick="deleteExpense('${expense._id}')" class="delete">Delete</button>
                </td>
            `;
            expensesTableBody.appendChild(row);
        });
    } catch (error) {
        // Error handled by fetchData
    }
}

/**
 * Handles form submission for adding/editing expenses.
 */
expenseForm.addEventListener('submit', async (event) => {
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

    const payload = { date: new Date(date), category, description, amount };

    try {
        if (id) {
            // Update existing expense
            await fetchData(`${BACKEND_API_URL}/expenses/${id}`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });
            showMessageBox('Expense updated successfully!');
        } else {
            // Add new expense
            await fetchData(`${BACKEND_API_URL}/expenses`, {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            showMessageBox('New expense added successfully!');
        }

        // Clear form and reset for new entry
        expenseForm.reset();
        expenseIdInput.value = '';
        cancelExpenseEditBtn.classList.add('hidden');
        await renderExpenses(); // Refresh expenses display
        await generateReports(); // Reports might change
    } catch (error) {
        // Error handled by fetchData
    }
});

/**
 * Populates the form with data for editing an expense.
 * @param {string} id - The ID of the expense to edit.
 */
window.editExpense = async (id) => {
    try {
        const expenses = await fetchData(`${BACKEND_API_URL}/expenses`); // Fetch all to find by ID
        const expenseToEdit = expenses.find(exp => exp._id === id);
        if (expenseToEdit) {
            expenseIdInput.value = expenseToEdit._id;
            expenseDateInput.value = formatDateForInput(expenseToEdit.date);
            expenseCategoryInput.value = expenseToEdit.category;
            expenseDescriptionInput.value = expenseToEdit.description;
            expenseAmountInput.value = expenseToEdit.amount;
            cancelExpenseEditBtn.classList.remove('hidden');
            expenseDateInput.focus();
        } else {
            showMessageBox('Expense not found for editing.');
        }
    }
    catch (error) {
        // Error handled by fetchData
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
 * Deletes an expense via backend API.
 * @param {string} id - The ID of the expense to delete.
 */
window.deleteExpense = async (id) => {
    try {
        await fetchData(`${BACKEND_API_URL}/expenses/${id}`, {
            method: 'DELETE'
        });
        showMessageBox('Expense deleted successfully!');
        await renderExpenses(); // Refresh expenses display
        await generateReports(); // Reports might change
    } catch (error) {
        // Error handled by fetchData
    }
};

// Event listeners for expenses date filters
filterExpensesBtn.addEventListener('click', renderExpenses);


// --- Reports Section Functions ---

/**
 * Generates and displays sales, expense, and balance reports for a given date range.
 */
async function generateReports() {
    const startDate = reportStartDateInput.value;
    const endDate = reportEndDateInput.value;

    if (!startDate || !endDate) {
        showMessageBox('Please select both start and end dates for the report.');
        return;
    }

    try {
        const reportData = await fetchData(`${BACKEND_API_URL}/reports/financial?startDate=${startDate}&endDate=${endDate}`);

        reportTotalSalesSpan.textContent = `$${reportData.totalSales.toFixed(2)}`;
        reportTotalExpensesSpan.textContent = `$${reportData.totalExpenses.toFixed(2)}`;
        reportNetBalanceSpan.textContent = `$${reportData.netProfit.toFixed(2)}`;
        reportNetBalanceSpan.style.color = reportData.netProfit >= 0 ? '#22c55e' : '#ef4444'; // Green for profit, red for loss

        // Render filtered sales details
        reportSalesTableBody.innerHTML = '';
        if (reportData.salesDetails.length === 0) {
            reportSalesTableBody.innerHTML = `<tr><td colspan="5" class="table-empty-state">No sales data for this period.</td></tr>`;
        } else {
            reportData.salesDetails.forEach(transaction => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="text-gray">${formatDateForInput(transaction.date)}</td>
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
        if (reportData.expenseDetails.length === 0) {
            reportExpensesTableBody.innerHTML = `<tr><td colspan="4" class="table-empty-state">No expense data for this period.</td></tr>`;
        } else {
            reportData.expenseDetails.forEach(expense => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="text-gray">${formatDateForInput(expense.date)}</td>
                    <td class="text-gray">${expense.category}</td>
                    <td class="text-gray">${expense.description}</td>
                    <td class="text-gray">$${expense.amount.toFixed(2)}</td>
                `;
                reportExpensesTableBody.appendChild(row);
            });
        }
    } catch (error) {
        // Error handled by fetchData
    }
}

// Event listener for generate report button
generateReportBtn.addEventListener('click', generateReports);


// --- Menu Management Functions (CRUD) ---

/**
 * Renders the menu items in the table by fetching from backend.
 */
async function renderMenuItems() {
    menuItemsTableBody.innerHTML = ''; // Clear existing rows
    try {
        const menuItems = await fetchData(`${BACKEND_API_URL}/menu`);

        if (menuItems.length === 0) {
            menuItemsTableBody.innerHTML = `<tr><td colspan="5" class="table-empty-state">No menu items added yet.</td></tr>`;
            return;
        }
        menuItems.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="font-medium">${item._id}</td>
                <td class="text-gray">${item.name}</td>
                <td class="text-gray">${item.category}</td>
                <td class="text-gray">$${item.price.toFixed(2)}</td>
                <td class="table-actions">
                    <button onclick="editMenuItem('${item._id}')" class="edit">Edit</button>
                    <button onclick="deleteMenuItem('${item._id}')" class="delete">Delete</button>
                </td>
            `;
            menuItemsTableBody.appendChild(row);
        });
    } catch (error) {
        // Error handled by fetchData
    }
}

/**
 * Handles form submission for adding/editing menu items.
 */
menuForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const id = menuItemIdInput.value;
    const name = itemNameInput.value.trim();
    const price = parseFloat(itemPriceInput.value);
    const category = itemCategoryInput.value.trim();

    if (!name || isNaN(price) || price <= 0 || !category) {
        showMessageBox('Please fill in all fields correctly for menu item.');
        return;
    }

    // Note: The frontend currently does not have a UI to define recipes.
    // The backend expects a 'recipe' array in the MenuItem schema.
    // For now, we send an empty array or rely on backend defaults.
    // You would extend the UI to allow adding ingredients to a recipe if needed.
    const payload = {
        name,
        price,
        category,
        recipe: [] // Sending an empty recipe array for now.
    };

    try {
        if (id) {
            // Update existing item
            await fetchData(`${BACKEND_API_URL}/menu/${id}`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });
            showMessageBox('Menu item updated successfully!');
        } else {
            // Add new item
            await fetchData(`${BACKEND_API_URL}/menu`, {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            showMessageBox('New menu item added successfully!');
        }

        // Clear form and reset for new entry
        menuForm.reset();
        menuItemIdInput.value = '';
        cancelMenuEditBtn.classList.add('hidden');
        await renderMenuItems(); // Refresh menu display
        await renderOrderForm(); // Update order form dropdown
    } catch (error) {
        // Error handled by fetchData
    }
});

/**
 * Populates the form with data for editing a menu item.
 * @param {string} id - The ID of the menu item to edit.
 */
window.editMenuItem = async (id) => {
    try {
        const menuItems = await fetchData(`${BACKEND_API_URL}/menu`); // Fetch all to find by ID
        const itemToEdit = menuItems.find(item => item._id === id);
        if (itemToEdit) {
            menuItemIdInput.value = itemToEdit._id;
            itemNameInput.value = itemToEdit.name;
            itemPriceInput.value = itemToEdit.price;
            itemCategoryInput.value = itemToEdit.category;
            cancelMenuEditBtn.classList.remove('hidden');
            itemNameInput.focus(); // Focus on the first input for convenience
        } else {
            showMessageBox('Menu item not found for editing.');
        }
    } catch (error) {
        // Error handled by fetchData
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
 * Deletes a menu item via backend API.
 * @param {string} id - The ID of the menu item to delete.
 */
window.deleteMenuItem = async (id) => {
    try {
        await fetchData(`${BACKEND_API_URL}/menu/${id}`, {
            method: 'DELETE'
        });
        showMessageBox('Menu item deleted successfully!');
        await renderMenuItems(); // Refresh menu display
        await renderOrderForm(); // Update order form dropdown
    } catch (error) {
        // Error handled by fetchData
    }
};


// Initialize: Show Order Management and render all relevant sections on load
document.addEventListener('DOMContentLoaded', async () => {
    showSection('order-management'); // Set initial section to Order Management
    const initialNavLink = document.querySelector('.nav-link[data-section="order-management"]');
    if (initialNavLink) { // Defensive check for initial active class assignment
        initialNavLink.classList.add('active');
    }

    // Set default dates for date inputs
    const today = getTodayDate();
    const thirtyDaysAgo = new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0];

    kitchenStartDateInput.value = thirtyDaysAgo;
    kitchenEndDateInput.value = today;
    salesStartDateInput.value = thirtyDaysAgo;
    salesEndDateInput.value = today;
    inventoryStartDateInput.value = thirtyDaysAgo; // Inventory display itself is not date-filtered
    inventoryEndDateInput.value = today;
    expenseStartDateInput.value = thirtyDaysAgo;
    expenseEndDateInput.value = today;
    reportStartDateInput.value = thirtyDaysAgo;
    reportEndDateInput.value = today;

    // Initial data loads for all sections
    await renderOrderForm(); // Populates menu items for order creation
    renderCurrentOrder(); // Renders the empty initial order
    await renderKitchenOrders();
    await renderSalesTransactions();
    await renderInventoryItems();
    await renderExpenses();
    await generateReports(); // Generate initial report based on default dates
});
