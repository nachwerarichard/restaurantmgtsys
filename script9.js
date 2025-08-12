// =====================================================================
// Global Constants & State Management
// =====================================================================
const BACKEND_API_URL = 'https://restaurantmgtsys.onrender.com/api';
const POLLING_INTERVAL = 5000; // 5 seconds for polling

// --- In-memory state variables for client-side data caching ---
let currentOrder = [];
let allMenuItems = [];
let allIngredients = [];
let currentRecipe = []; // Used for the recipe being built for a menu item

// --- Notification Polling State ---
let lastKitchenOrderCount = 0; // Tracks new orders for the kitchen
let lastWaiterOrderStatuses = new Map(); // Tracks status changes for waiters
let kitchenPollingIntervalId = null;
let waiterPollingIntervalId = null;

// --- User & Role Management ---
let currentUserRole = null;
const allowedRoles = {
    'order-management': ['admin', 'waiter'],
    'kitchen': ['admin', 'chef'], // Changed 'waiter' to 'chef' for clarity
    'sales': ['admin'],
    'inventory-management': ['admin'],
    'expenses': ['admin'],
    'reports': ['admin'],
    'menu-management': ['admin'],
    'auditlogs': ['admin']
};

// --- Tone.js Synth for notifications ---
const synth = new Tone.Synth().toDestination();

// =====================================================================
// DOM Element Selectors
// =====================================================================
// General UI
const navLinks = document.querySelectorAll('.nav-link');
const contentSections = document.querySelectorAll('.content-section');
const currentSectionTitle = document.getElementById('current-section-title');
const messageBox = document.getElementById('message-box');
const messageText = document.getElementById('message-text');
const messageOkBtn = document.getElementById('message-ok-btn');

// Mobile Menu
const menuToggle = document.getElementById('menu-toggle');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');

// Order Management
const orderMenuItemSelect = document.getElementById('order-menu-item');
const orderQuantityInput = document.getElementById('order-quantity');
const addToOrderBtn = document.getElementById('add-to-order-btn');
const currentOrderList = document.getElementById('current-order-list');
const currentOrderTotalSpan = document.getElementById('current-order-total');
const placeOrderBtn = document.getElementById('place-order-btn');

// Kitchen Management
const kitchenOrdersTableBody = document.getElementById('kitchen-orders-table-body');
const kitchenStartDateInput = document.getElementById('kitchen-start-date');
const kitchenEndDateInput = document.getElementById('kitchen-end-date');
const filterKitchenBtn = document.getElementById('filter-kitchen-btn');

// Sales
const salesTransactionsTableBody = document.getElementById('sales-transactions-table-body');
const salesStartDateInput = document.getElementById('sales-start-date');
const salesEndDateInput = document.getElementById('sales-end-date');
const filterSalesBtn = document.getElementById('filter-sales-btn');

// Inventory Management
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

// Expenses Management
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

// Reports
const reportStartDateInput = document.getElementById('report-start-date');
const reportEndDateInput = document.getElementById('report-end-date');
const generateReportBtn = document.getElementById('generate-report-btn');
const reportTotalSalesSpan = document.getElementById('report-total-sales');
const reportTotalExpensesSpan = document.getElementById('report-total-expenses');
const reportNetBalanceSpan = document.getElementById('report-net-balance');
const reportSalesTableBody = document.getElementById('report-sales-table-body');
const reportExpensesTableBody = document.getElementById('report-expenses-table-body');

// Menu Management
const menuForm = document.getElementById('menu-form');
const menuItemIdInput = document.getElementById('menu-item-id');
const itemNameInput = document.getElementById('item-name');
const itemPriceInput = document.getElementById('item-price');
const itemCategoryInput = document.getElementById('item-category');
const menuItemsTableBody = document.getElementById('menu-items-table-body');
const cancelMenuEditBtn = document.getElementById('cancel-menu-edit-btn');

// Recipe Management
const recipeIngredientSelect = document.getElementById('recipe-ingredient-select');
const recipeQuantityUsedInput = document.getElementById('recipe-quantity-used');
const addRecipeIngredientBtn = document.getElementById('add-recipe-ingredient-btn');
const currentRecipeList = document.getElementById('current-recipe-list');

// Login
const loginForm = document.getElementById('login-form');
const loginPage = document.getElementById('login-page');
const mainAppContainer = document.getElementById('main-app-container');
const errorMessage = document.getElementById('error-message');
const logoutButton = document.getElementById('logout-btn');


// =====================================================================
// Helper Functions
// =====================================================================

/**
 * Checks if the user is authorized for a given role.
 * @param {string[]} requiredRoles - An array of roles that can access the section.
 * @returns {boolean} True if the current user role is in the allowed roles.
 */
function checkUserRole(requiredRoles) {
    if (!currentUserRole || !requiredRoles) {
        return false;
    }
    return requiredRoles.includes(currentUserRole);
}

/**
 * Displays a custom message box.
 * @param {string} message - The message to display.
 */
function showMessageBox(message) {
    messageText.textContent = message;
    messageBox.classList.remove('hidden');
    playNotificationSound();
}

/**
 * Plays a loud notification sound using Tone.js.
 */
async function playNotificationSound() {
    await Tone.start();
    synth.triggerAttackRelease("C4", "8n");
}

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
 * Handles API fetch requests with integrated error handling.
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
        throw error;
    }
}


// =====================================================================
// UI and Navigation Management
// =====================================================================

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
 * Stops all active polling intervals.
 */
function stopAllPolling() {
    if (kitchenPollingIntervalId) {
        clearInterval(kitchenPollingIntervalId);
        kitchenPollingIntervalId = null;
    }
    if (waiterPollingIntervalId) {
        clearInterval(waiterPollingIntervalId);
        waiterPollingIntervalId = null;
    }
}

/**
 * Shows a specific content section and updates the title.
 * @param {string} sectionId - The ID of the section to show.
 */
async function showSection(sectionId) {
    if (!checkUserRole(allowedRoles[sectionId])) {
        showMessageBox('You do not have permission to access this section.');
        return;
    }

    hideAllSections();
    stopAllPolling();

    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.remove('hidden');
        targetSection.classList.add('active');
        currentSectionTitle.textContent = targetSection.querySelector('h2').textContent;
    }

    // Special handling for sections that need data refresh and activate polling
    switch (sectionId) {
        case 'order-management':
            await renderOrderForm();
            renderCurrentOrder();
            await checkOrderReadyForWaiter();
            waiterPollingIntervalId = setInterval(checkOrderReadyForWaiter, POLLING_INTERVAL);
            break;
        case 'kitchen':
            await renderKitchenOrders();
            await checkNewOrdersForChef();
            kitchenPollingIntervalId = setInterval(checkNewOrdersForChef, POLLING_INTERVAL);
            break;
        case 'sales':
            await renderSalesTransactions();
            break;
        case 'inventory-management':
            await renderInventoryItems();
            break;
        case 'expenses':
            await renderExpenses();
            break;
        case 'reports':
            if (!reportStartDateInput.value || !reportEndDateInput.value) {
                reportEndDateInput.value = getTodayDate();
                reportStartDateInput.value = new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0];
            }
            await generateReports();
            break;
        case 'menu-management':
            await renderMenuItems();
            await populateRecipeIngredientSelect();
            renderCurrentRecipe();
            break;
        case 'auditlogs':
            renderAuditLogs();
            break;
    }

    if (sidebar.classList.contains('active')) {
        sidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');
    }
}

/**
 * Handles navigation link clicks.
 * @param {Event} event - The click event.
 */
async function handleNavLinkClick(event) {
    event.preventDefault();
    const sectionId = event.currentTarget.dataset.section;
    if (sectionId) {
        await showSection(sectionId);
    }
}

// =====================================================================
// User Authentication and Session Management
// =====================================================================

/**
 * Initializes the main application based on the user's role.
 */
async function initializeApp(userRole) {
    currentUserRole = userRole;

    document.querySelectorAll('.nav-link[data-section]').forEach(link => {
        const sectionId = link.dataset.section;
        if (!checkUserRole(allowedRoles[sectionId])) {
            link.classList.add('hidden');
        } else {
            link.classList.remove('hidden');
        }
    });

    loginPage.classList.add('hidden');
    mainAppContainer.classList.remove('hidden');
    errorMessage.classList.add('hidden');

    const today = getTodayDate();
    const thirtyDaysAgo = new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0];

    // Set default dates for all date inputs
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

    // Load initial data for all relevant sections
    await Promise.all([
        renderOrderForm(),
        renderKitchenOrders(),
        renderSalesTransactions(),
        renderInventoryItems(),
        renderExpenses(),
        generateReports(),
        populateRecipeIngredientSelect()
    ]);
    
    // Initial population of lastWaiterOrderStatuses for accurate change detection
    try {
        const orders = await fetchData(`${BACKEND_API_URL}/kitchen-orders`);
        orders.forEach(order => {
            lastWaiterOrderStatuses.set(order._id, order.status);
        });
    } catch (error) {
        console.error("Failed to initialize waiter order statuses:", error);
    }
    
    // Show a default section based on role
    if (currentUserRole === 'waiter') {
        await showSection('order-management');
    } else if (currentUserRole === 'admin') {
        await showSection('kitchen');
    }
}

/**
 * Handles user login and role-based access.
 */
loginForm.addEventListener('submit', async function(event) {
    event.preventDefault();
    const usernameInput = document.getElementById('username').value.trim();
    const passwordInput = document.getElementById('password').value.trim();

    const users = {
        'Ronald': { password: '123', role: 'admin' },
        'Martha': { password: '123', role: 'waiter' }
    };

    if (users[usernameInput] && users[usernameInput].password === passwordInput) {
        const role = users[usernameInput].role;
        sessionStorage.setItem('userRole', role);
        await initializeApp(role);
    } else {
        errorMessage.classList.remove('hidden');
    }
});

/**
 * Handles user logout.
 */
logoutButton.addEventListener('click', () => {
    sessionStorage.removeItem('userRole');
    currentUserRole = null;
    stopAllPolling();
    mainAppContainer.classList.add('hidden');
    loginPage.classList.remove('hidden');
    loginForm.reset();
    document.getElementById('username').focus();
});


// =====================================================================
// Order Management Functions
// =====================================================================

/**
 * Populates the menu item select dropdown.
 */
async function renderOrderForm() {
    orderMenuItemSelect.innerHTML = '<option value="">-- Select an Item --</option>';
    try {
        allMenuItems = await fetchData(`${BACKEND_API_URL}/menu`);
        allMenuItems.forEach(item => {
            const option = document.createElement('option');
            option.value = item._id;
            option.textContent = `${item.name} (Ugshs${item.price.toFixed(2)})`;
            orderMenuItemSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Failed to render order form:', error);
    }
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
            const menuItem = allMenuItems.find(item => item._id === orderItem.menuItemId);
            if (menuItem) {
                const listItem = document.createElement('li');
                listItem.classList.add('order-list-item');
                listItem.innerHTML = `
                    <span>${menuItem.name} x ${orderItem.quantity}</span>
                    <span>Ugshs${(menuItem.price * orderItem.quantity).toFixed(2)}</span>
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
    orderMenuItemSelect.value = '';
    orderQuantityInput.value = '1';
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
                items: currentOrder,
                totalAmount: totalOrderAmount
            })
        });
        showMessageBox(`Order ${newOrder._id} placed successfully! It has been sent to the kitchen.`);
        currentOrder = [];
        renderCurrentOrder();
    } catch (error) {
        console.error('Error placing order:', error);
    }
});


// =====================================================================
// Kitchen Management Functions
// =====================================================================

/**
 * Renders kitchen orders in the table.
 */
async function renderKitchenOrders() {
    kitchenOrdersTableBody.innerHTML = '';
    const startDate = kitchenStartDateInput.value;
    const endDate = kitchenEndDateInput.value;
    let url = `${BACKEND_API_URL}/kitchen-orders?startDate=${startDate}&endDate=${endDate}`;

    try {
        const orders = await fetchData(url);
        if (orders.length === 0) {
            kitchenOrdersTableBody.innerHTML = `<tr><td colspan="6" class="table-empty-state">No kitchen orders found for this period.</td></tr>`;
            return;
        }

        orders.forEach(order => {
            const itemsList = order.items.map(item => `${item.menuItem ? item.menuItem.name : 'Unknown Item'} x ${item.quantity}`).join(', ');
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="font-medium">${order._id}</td>
                <td class="text-gray">${formatDateForInput(order.date)}</td>
                <td class="text-gray">${itemsList}</td>
                <td class="text-gray">Ugshs${order.totalAmount.toFixed(2)}</td>
                <td><span class="status-badge ${order.status.toLowerCase()}">${order.status}</span></td>
                <td class="table-actions">
                    ${(order.status === 'New' || order.status === 'Preparing') && checkUserRole(['admin', 'chef']) ?
                        `<button onclick="markOrderReady('${order._id}')" class="edit">Mark Ready</button>` :
                        `<button class="edit" disabled>Mark Ready</button>`
                    }
                    ${order.status !== 'Cancelled' && checkUserRole(['admin', 'chef']) ?
                        `<button onclick="cancelKitchenOrder('${order._id}')" class="delete">Cancel</button>` :
                        `<button class="delete" disabled>Cancelled</button>`
                    }
                </td>
            `;
            kitchenOrdersTableBody.appendChild(row);
        });
    } catch (error) {
        console.error('Failed to render kitchen orders:', error);
    }
}

/**
 * Checks for new orders for the chef notification.
 */
async function checkNewOrdersForChef() {
    try {
        if (currentUserRole !== 'admin' && currentUserRole !== 'chef') {
            return;
        }

        const orders = await fetchData(`${BACKEND_API_URL}/kitchen-orders`);
        const newOrderCount = orders.filter(order => order.status === 'New').length;

        if (newOrderCount > lastKitchenOrderCount) {
            const ordersToNotify = newOrderCount - lastKitchenOrderCount;
            if (ordersToNotify > 0) {
                showMessageBox(`New Order Alert! You have ${ordersToNotify} new order(s) to prepare.`);
            }
        }
        
        lastKitchenOrderCount = newOrderCount;
    } catch (error) {
        console.error("Error checking for new orders:", error);
    }
}

/**
 * Marks a kitchen order as ready via backend API.
 * @param {string} orderId - The ID of the order to mark ready.
 */
window.markOrderReady = async (orderId) => {
    if (!checkUserRole(['admin', 'chef'])) {
        showMessageBox('You do not have permission to perform this action.');
        return;
    }
    try {
        const response = await fetchData(`${BACKEND_API_URL}/kitchen-orders/${orderId}/ready`, { method: 'PUT' });
        showMessageBox(response.message);
        await renderKitchenOrders();
        await renderInventoryItems();
        await renderSalesTransactions();
        await generateReports();
    } catch (error) {
        if (error.message.includes('insufficient inventory')) {
            console.error('Inventory check failed:', error);
        }
    }
};

/**
 * Cancels a kitchen order via backend API.
 * @param {string} orderId - The ID of the order to cancel.
 */
window.cancelKitchenOrder = async (orderId) => {
    if (!checkUserRole(['admin', 'chef'])) {
        showMessageBox('You do not have permission to perform this action.');
        return;
    }
    try {
        const response = await fetchData(`${BACKEND_API_URL}/kitchen-orders/${orderId}/cancel`, { method: 'PUT' });
        showMessageBox(response.message);
        await renderKitchenOrders();
    } catch (error) {
        console.error('Failed to cancel order:', error);
    }
};

/**
 * Checks for orders that have been marked as 'Ready' for the waiter.
 */
async function checkOrderReadyForWaiter() {
    try {
        if (currentUserRole !== 'waiter' && currentUserRole !== 'admin') {
            return;
        }

        const orders = await fetchData(`${BACKEND_API_URL}/kitchen-orders`);
        orders.forEach(order => {
            const lastStatus = lastWaiterOrderStatuses.get(order._id);
            if (order.status === 'Ready' && lastStatus !== 'Ready') {
                showMessageBox(`Order ${order._id} is ready for pickup!`);
            }
            lastWaiterOrderStatuses.set(order._id, order.status);
        });
    } catch (error) {
        console.error('Error checking for ready orders:', error);
    }
}

// Event listeners for kitchen date filters
filterKitchenBtn.addEventListener('click', renderKitchenOrders);


// =====================================================================
// Sales Management Functions
// =====================================================================

/**
 * Renders the sales transactions in the table.
 */
async function renderSalesTransactions() {
    salesTransactionsTableBody.innerHTML = '';
    const startDate = salesStartDateInput.value;
    const endDate = salesEndDateInput.value;
    let url = `${BACKEND_API_URL}/sales?startDate=${startDate}&endDate=${endDate}`;

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
                <td class="text-gray">Ugshs${transaction.amount.toFixed(2)}</td>
            `;
            salesTransactionsTableBody.appendChild(row);
        });
    } catch (error) {
        console.error('Failed to render sales transactions:', error);
    }
}

// Event listeners for sales date filters
filterSalesBtn.addEventListener('click', renderSalesTransactions);


// =====================================================================
// Inventory Management Functions (CRUD)
// =====================================================================

async function renderInventoryItems() {
    inventoryItemsTableBody.innerHTML = '';
    const startDate = inventoryStartDateInput.value;
    const endDate = inventoryEndDateInput.value;
    let url = `${BACKEND_API_URL}/inventory?startDate=${startDate}&endDate=${endDate}`;

    try {
        allIngredients = await fetchData(url);
        if (allIngredients.length === 0) {
            inventoryItemsTableBody.innerHTML = `<tr><td colspan="7" class="table-empty-state">No inventory items found.</td></tr>`;
            return;
        }

        allIngredients.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="font-medium">${item.name}</td>
                <td class="text-gray">${item.quantity} ${item.unit}</td>
                <td class="text-gray">Ugshs${item.costPerUnit.toFixed(2)}</td>
                <td class="text-gray">Ugshs${(item.quantity * item.costPerUnit).toFixed(2)}</td>
                <td class="table-actions">
                    <button onclick="editInventoryItem('${item._id}')" class="edit">Edit</button>
                    <button onclick="deleteInventoryItem('${item._id}')" class="delete">Delete</button>
                </td>
            `;
            inventoryItemsTableBody.appendChild(row);
        });
    } catch (error) {
        console.error('Failed to render inventory items:', error);
    }
}

function clearInventoryForm() {
    inventoryForm.reset();
    ingredientIdInput.value = '';
    document.querySelector('#inventory-form button[type="submit"]').textContent = 'Add Ingredient';
}

window.editInventoryItem = (id) => {
    const item = allIngredients.find(i => i._id === id);
    if (item) {
        ingredientIdInput.value = item._id;
        ingredientNameInput.value = item.name;
        ingredientQuantityInput.value = item.quantity;
        ingredientUnitInput.value = item.unit;
        ingredientCostPerUnitInput.value = item.costPerUnit;
        document.querySelector('#inventory-form button[type="submit"]').textContent = 'Update Ingredient';
    }
};

window.deleteInventoryItem = async (id) => {
    if (confirm('Are you sure you want to delete this ingredient?')) {
        try {
            const response = await fetchData(`${BACKEND_API_URL}/inventory/${id}`, { method: 'DELETE' });
            showMessageBox(response.message);
            await renderInventoryItems();
        } catch (error) {
            console.error('Failed to delete ingredient:', error);
        }
    }
};

inventoryForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = ingredientIdInput.value;
    const method = id ? 'PUT' : 'POST';
    const url = id ? `${BACKEND_API_URL}/inventory/${id}` : `${BACKEND_API_URL}/inventory`;

    try {
        const response = await fetchData(url, {
            method,
            body: JSON.stringify({
                name: ingredientNameInput.value,
                quantity: parseFloat(ingredientQuantityInput.value),
                unit: ingredientUnitInput.value,
                costPerUnit: parseFloat(ingredientCostPerUnitInput.value)
            })
        });
        showMessageBox(response.message);
        clearInventoryForm();
        await renderInventoryItems();
    } catch (error) {
        console.error('Failed to save inventory item:', error);
    }
});

cancelIngredientEditBtn.addEventListener('click', clearInventoryForm);
filterInventoryBtn.addEventListener('click', renderInventoryItems);


// =====================================================================
// Expenses Management Functions
// =====================================================================

async function renderExpenses() {
    expensesTableBody.innerHTML = '';
    const startDate = expenseStartDateInput.value;
    const endDate = expenseEndDateInput.value;
    let url = `${BACKEND_API_URL}/expenses?startDate=${startDate}&endDate=${endDate}`;

    try {
        const expenses = await fetchData(url);
        if (expenses.length === 0) {
            expensesTableBody.innerHTML = `<tr><td colspan="6" class="table-empty-state">No expenses found for this period.</td></tr>`;
            return;
        }

        expenses.forEach(expense => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="font-medium">${formatDateForInput(expense.date)}</td>
                <td class="text-gray">${expense.category}</td>
                <td class="text-gray">${expense.description}</td>
                <td class="text-gray">Ugshs${expense.amount.toFixed(2)}</td>
                <td class="table-actions">
                    <button onclick="editExpense('${expense._id}')" class="edit">Edit</button>
                    <button onclick="deleteExpense('${expense._id}')" class="delete">Delete</button>
                </td>
            `;
            expensesTableBody.appendChild(row);
        });
    } catch (error) {
        console.error('Failed to render expenses:', error);
    }
}

function clearExpenseForm() {
    expenseForm.reset();
    expenseIdInput.value = '';
    document.querySelector('#expense-form button[type="submit"]').textContent = 'Add Expense';
}

window.editExpense = async (id) => {
    try {
        const expense = await fetchData(`${BACKEND_API_URL}/expenses/${id}`);
        expenseIdInput.value = expense._id;
        expenseDateInput.value = formatDateForInput(expense.date);
        expenseCategoryInput.value = expense.category;
        expenseDescriptionInput.value = expense.description;
        expenseAmountInput.value = expense.amount;
        document.querySelector('#expense-form button[type="submit"]').textContent = 'Update Expense';
    } catch (error) {
        console.error('Failed to fetch expense for editing:', error);
    }
};

window.deleteExpense = async (id) => {
    if (confirm('Are you sure you want to delete this expense?')) {
        try {
            const response = await fetchData(`${BACKEND_API_URL}/expenses/${id}`, { method: 'DELETE' });
            showMessageBox(response.message);
            await renderExpenses();
        } catch (error) {
            console.error('Failed to delete expense:', error);
        }
    }
};

expenseForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = expenseIdInput.value;
    const method = id ? 'PUT' : 'POST';
    const url = id ? `${BACKEND_API_URL}/expenses/${id}` : `${BACKEND_API_URL}/expenses`;

    try {
        const response = await fetchData(url, {
            method,
            body: JSON.stringify({
                date: expenseDateInput.value,
                category: expenseCategoryInput.value,
                description: expenseDescriptionInput.value,
                amount: parseFloat(expenseAmountInput.value)
            })
        });
        showMessageBox(response.message);
        clearExpenseForm();
        await renderExpenses();
    } catch (error) {
        console.error('Failed to save expense:', error);
    }
});

cancelExpenseEditBtn.addEventListener('click', clearExpenseForm);
filterExpensesBtn.addEventListener('click', renderExpenses);


// =====================================================================
// Menu Management and Recipes
// =====================================================================

async function renderMenuItems() {
    menuItemsTableBody.innerHTML = '';
    try {
        allMenuItems = await fetchData(`${BACKEND_API_URL}/menu`);
        if (allMenuItems.length === 0) {
            menuItemsTableBody.innerHTML = `<tr><td colspan="5" class="table-empty-state">No menu items found.</td></tr>`;
            return;
        }

        allMenuItems.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="font-medium">${item.name}</td>
                <td class="text-gray">${item.category}</td>
                <td class="text-gray">Ugshs${item.price.toFixed(2)}</td>
                <td class="text-gray">${item.recipe.length} ingredients</td>
                <td class="table-actions">
                    <button onclick="editMenuItem('${item._id}')" class="edit">Edit</button>
                    <button onclick="deleteMenuItem('${item._id}')" class="delete">Delete</button>
                </td>
            `;
            menuItemsTableBody.appendChild(row);
        });
    } catch (error) {
        console.error('Failed to render menu items:', error);
    }
}

async function populateRecipeIngredientSelect() {
    recipeIngredientSelect.innerHTML = '<option value="">-- Select an Ingredient --</option>';
    try {
        allIngredients = await fetchData(`${BACKEND_API_URL}/inventory`);
        allIngredients.forEach(ingredient => {
            const option = document.createElement('option');
            option.value = ingredient._id;
            option.textContent = `${ingredient.name} (${ingredient.unit})`;
            recipeIngredientSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Failed to populate ingredient select:', error);
    }
}

function renderCurrentRecipe() {
    currentRecipeList.innerHTML = '';
    if (currentRecipe.length === 0) {
        currentRecipeList.innerHTML = `<li class="order-list-item">No ingredients in recipe.</li>`;
        return;
    }

    currentRecipe.forEach((rec, index) => {
        const ingredient = allIngredients.find(ing => ing._id === rec.ingredient);
        if (ingredient) {
            const listItem = document.createElement('li');
            listItem.classList.add('order-list-item');
            listItem.innerHTML = `
                <span>${ingredient.name} x ${rec.quantityUsed} ${ingredient.unit}</span>
                <button onclick="removeRecipeIngredient(${index})">&times;</button>
            `;
            currentRecipeList.appendChild(listItem);
        }
    });
}

addRecipeIngredientBtn.addEventListener('click', () => {
    const selectedIngredientId = recipeIngredientSelect.value;
    const quantityUsed = parseFloat(recipeQuantityUsedInput.value);

    if (!selectedIngredientId || isNaN(quantityUsed) || quantityUsed <= 0) {
        showMessageBox('Please select an ingredient and enter a valid quantity.');
        return;
    }

    currentRecipe.push({ ingredient: selectedIngredientId, quantityUsed: quantityUsed });
    renderCurrentRecipe();
    recipeIngredientSelect.value = '';
    recipeQuantityUsedInput.value = '';
});

window.removeRecipeIngredient = (index) => {
    currentRecipe.splice(index, 1);
    renderCurrentRecipe();
};

function clearMenuForm() {
    menuForm.reset();
    menuItemIdInput.value = '';
    currentRecipe = [];
    renderCurrentRecipe();
    document.querySelector('#menu-form button[type="submit"]').textContent = 'Add Menu Item';
}

window.editMenuItem = (id) => {
    const item = allMenuItems.find(i => i._id === id);
    if (item) {
        menuItemIdInput.value = item._id;
        itemNameInput.value = item.name;
        itemPriceInput.value = item.price;
        itemCategoryInput.value = item.category;
        currentRecipe = item.recipe;
        renderCurrentRecipe();
        document.querySelector('#menu-form button[type="submit"]').textContent = 'Update Menu Item';
    }
};

window.deleteMenuItem = async (id) => {
    if (confirm('Are you sure you want to delete this menu item?')) {
        try {
            const response = await fetchData(`${BACKEND_API_URL}/menu/${id}`, { method: 'DELETE' });
            showMessageBox(response.message);
            await renderMenuItems();
        } catch (error) {
            console.error('Failed to delete menu item:', error);
        }
    }
};

menuForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = menuItemIdInput.value;
    const method = id ? 'PUT' : 'POST';
    const url = id ? `${BACKEND_API_URL}/menu/${id}` : `${BACKEND_API_URL}/menu`;

    if (currentRecipe.length === 0) {
        showMessageBox('Please add at least one ingredient to the recipe.');
        return;
    }

    try {
        const response = await fetchData(url, {
            method,
            body: JSON.stringify({
                name: itemNameInput.value,
                price: parseFloat(itemPriceInput.value),
                category: itemCategoryInput.value,
                recipe: currentRecipe
            })
        });
        showMessageBox(response.message);
        clearMenuForm();
        await renderMenuItems();
    } catch (error) {
        console.error('Failed to save menu item:', error);
    }
});

cancelMenuEditBtn.addEventListener('click', clearMenuForm);


// =====================================================================
// Reports Functions
// =====================================================================

async function generateReports() {
    const startDate = reportStartDateInput.value;
    const endDate = reportEndDateInput.value;

    if (!startDate || !endDate) {
        showMessageBox('Please select a start and end date for the report.');
        return;
    }

    reportSalesTableBody.innerHTML = '';
    reportExpensesTableBody.innerHTML = '';

    try {
        const [sales, expenses] = await Promise.all([
            fetchData(`${BACKEND_API_URL}/sales?startDate=${startDate}&endDate=${endDate}`),
            fetchData(`${BACKEND_API_URL}/expenses?startDate=${startDate}&endDate=${endDate}`)
        ]);

        let totalSales = sales.reduce((sum, s) => sum + s.amount, 0);
        let totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
        let netBalance = totalSales - totalExpenses;

        reportTotalSalesSpan.textContent = totalSales.toFixed(2);
        reportTotalExpensesSpan.textContent = totalExpenses.toFixed(2);
        reportNetBalanceSpan.textContent = netBalance.toFixed(2);

        sales.forEach(sale => {
            const row = document.createElement('tr');
            row.innerHTML = `<td>${formatDateForInput(sale.date)}</td><td>${sale.itemSold}</td><td>Ugshs${sale.amount.toFixed(2)}</td>`;
            reportSalesTableBody.appendChild(row);
        });

        expenses.forEach(expense => {
            const row = document.createElement('tr');
            row.innerHTML = `<td>${formatDateForInput(expense.date)}</td><td>${expense.category}</td><td>Ugshs${expense.amount.toFixed(2)}</td>`;
            reportExpensesTableBody.appendChild(row);
        });
    } catch (error) {
        console.error('Failed to generate report:', error);
    }
}

generateReportBtn.addEventListener('click', generateReports);


// =====================================================================
// Audit Logs Functions (Placeholder)
// =====================================================================

async function renderAuditLogs() {
    // This is a placeholder. You would implement the fetch and rendering logic here.
    const auditLogsTableBody = document.getElementById('audit-logs-table-body');
    if (auditLogsTableBody) {
        auditLogsTableBody.innerHTML = `<tr><td colspan="3" class="table-empty-state">Audit logs functionality to be implemented.</td></tr>`;
    }
    console.log("Audit Logs functionality is not yet implemented.");
}


// =====================================================================
// General Event Listeners
// =====================================================================
navLinks.forEach(link => {
    link.addEventListener('click', handleNavLinkClick);
});

menuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('active');
    sidebarOverlay.classList.toggle('active');
});

sidebarOverlay.addEventListener('click', () => {
    sidebar.classList.remove('active');
    sidebarOverlay.classList.remove('active');
});

messageOkBtn.addEventListener('click', () => {
    messageBox.classList.add('hidden');
});


// =====================================================================
// Initial Page Load Check
// =====================================================================

/**
 * Checks for a user role in sessionStorage on page load.
 */
function checkIfLoggedIn() {
    const userRole = sessionStorage.getItem('userRole');
    if (userRole) {
        initializeApp(userRole);
    } else {
        loginPage.classList.remove('hidden');
        mainAppContainer.classList.add('hidden');
        loginForm.reset();
        document.getElementById('username').focus();
    }
}

window.addEventListener('load', checkIfLoggedIn);
