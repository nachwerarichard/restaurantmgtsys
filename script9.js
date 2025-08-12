const BACKEND_API_URL = 'https://restaurantmgtsys.onrender.com/api';
const POLLING_INTERVAL = 10000; // Adjusted to 10 seconds for less frequent network requests.

// --- In-memory state (Centralized state management) ---
const state = {
    currentOrder: [],
    allMenuItems: [],
    allIngredients: [],
    currentRecipe: [],
    lastKitchenOrderCount: 0,
    lastWaiterOrderStatuses: new Map(),
    kitchenPollingIntervalId: null,
    waiterPollingIntervalId: null,
    currentUserRole: null,
    editingIngredientId: null,
    editingMenuItemId: null,
    editingExpenseId: null,
};

// --- DOM Elements (Cached for performance) ---
const navLinks = document.querySelectorAll('.nav-link');
const contentSections = document.querySelectorAll('.content-section');
const currentSectionTitle = document.getElementById('current-section-title');
const menuToggle = document.getElementById('menu-toggle');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const messageBox = document.getElementById('message-box');
const messageText = document.getElementById('message-text');
const messageOkBtn = document.getElementById('message-ok-btn');
const loginForm = document.getElementById('login-form');
const loginPage = document.getElementById('login-page');
const mainAppContainer = document.getElementById('main-app-container');
const errorMessage = document.getElementById('error-message');
const logoutButton = document.getElementById('logout-btn');

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

// Sales Management
const salesTransactionsTableBody = document.getElementById('sales-transactions-table-body');
const salesStartDateInput = document.getElementById('sales-start-date');
const salesEndDateInput = document.getElementById('sales-end-date');
const filterSalesBtn = document.getElementById('filter-sales-btn');

// Inventory Management
const inventoryForm = document.getElementById('inventory-form');
const addInventoryBtn = document.getElementById('add-inventory-btn');
const ingredientNameInput = document.getElementById('ingredient-name');
const ingredientQuantityInput = document.getElementById('ingredient-quantity');
const ingredientUnitInput = document.getElementById('ingredient-unit');
const ingredientCostPerUnitInput = document.getElementById('ingredient-cost-per-unit');
const ingredientSpoilageInput = document.getElementById('ingredient-spoilage');
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

// Tone.js Synth for notifications
const synth = new Tone.Synth().toDestination();

// --- Role-based access control (Centralized) ---
const allowedRoles = {
    'order-management': ['admin', 'waiter'],
    'kitchen': ['admin', 'waiter'],
    'sales': ['admin'],
    'inventory-management': ['admin'],
    'expenses': ['admin'],
    'reports': ['admin'],
    'menu-management': ['admin', 'waiter'],
    'auditlogs': ['admin'],
};

// --- Helper Functions ---

function showMessageBox(message) {
    messageText.textContent = message;
    messageBox.classList.remove('hidden');
    playNotificationSound();
}

async function playNotificationSound() {
    await Tone.start();
    synth.triggerAttackRelease("C4", "8n");
}

const getTodayDate = () => {
    const today = new Date();
    const [year, month, day] = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, '0'), String(today.getDate()).padStart(2, '0')];
    return `${year}-${month}-${day}`;
};

const formatDateForInput = (dateObj) => {
    if (!dateObj) return '';
    const date = new Date(dateObj);
    const [year, month, day] = [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')];
    return `${year}-${month}-${day}`;
};

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

function checkUserRole(requiredRoles) {
    if (!state.currentUserRole || !requiredRoles) {
        return false;
    }
    return requiredRoles.includes(state.currentUserRole);
}

function hideAllSections() {
    contentSections.forEach(section => {
        section.classList.add('hidden');
        section.classList.remove('active');
    });
}

function stopAllPolling() {
    if (state.kitchenPollingIntervalId) {
        clearInterval(state.kitchenPollingIntervalId);
        state.kitchenPollingIntervalId = null;
    }
    if (state.waiterPollingIntervalId) {
        clearInterval(state.waiterPollingIntervalId);
        state.waiterPollingIntervalId = null;
    }
}

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

    switch (sectionId) {
        case 'order-management':
            await renderOrderForm();
            renderCurrentOrder();
            await checkOrderReadyForWaiter();
            state.waiterPollingIntervalId = setInterval(checkOrderReadyForWaiter, POLLING_INTERVAL);
            break;
        case 'kitchen':
            await renderKitchenOrders();
            await checkNewOrdersForChef();
            state.kitchenPollingIntervalId = setInterval(checkNewOrdersForChef, POLLING_INTERVAL);
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
            await renderAuditLogs();
            break;
    }

    if (sidebar.classList.contains('active')) {
        sidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');
    }
}

// --- Event Listeners (using Event Delegation where possible) ---

navLinks.forEach(link => {
    link.addEventListener('click', (event) => {
        event.preventDefault();
        const sectionId = event.currentTarget.dataset.section;
        showSection(sectionId);
    });
});

messageOkBtn.addEventListener('click', () => {
    messageBox.classList.add('hidden');
});

menuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('active');
    sidebarOverlay.classList.toggle('active');
});

sidebarOverlay.addEventListener('click', () => {
    sidebar.classList.remove('active');
    sidebarOverlay.classList.remove('active');
});

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

logoutButton.addEventListener('click', () => {
    sessionStorage.removeItem('userRole');
    state.currentUserRole = null;
    stopAllPolling();
    mainAppContainer.classList.add('hidden');
    loginPage.classList.remove('hidden');
    loginForm.reset();
    document.getElementById('username').focus();
});

// Order Management
addToOrderBtn.addEventListener('click', () => {
    const selectedItemId = orderMenuItemSelect.value;
    const quantity = parseInt(orderQuantityInput.value);

    if (!selectedItemId || isNaN(quantity) || quantity <= 0) {
        showMessageBox('Please select a menu item and enter a valid quantity.');
        return;
    }

    const existingItemIndex = state.currentOrder.findIndex(item => item.menuItemId === selectedItemId);
    if (existingItemIndex > -1) {
        state.currentOrder[existingItemIndex].quantity += quantity;
    } else {
        state.currentOrder.push({ menuItemId: selectedItemId, quantity: quantity });
    }

    renderCurrentOrder();
    orderMenuItemSelect.value = '';
    orderQuantityInput.value = '1';
});

placeOrderBtn.addEventListener('click', async () => {
    if (state.currentOrder.length === 0) {
        showMessageBox('Please add items to the order before placing it.');
        return;
    }

    const totalOrderAmount = state.currentOrder.reduce((total, item) => {
        const menuItem = state.allMenuItems.find(m => m._id === item.menuItemId);
        return total + (menuItem ? menuItem.price * item.quantity : 0);
    }, 0);

    try {
        const newOrder = await fetchData(`${BACKEND_API_URL}/kitchen-orders`, {
            method: 'POST',
            body: JSON.stringify({ items: state.currentOrder, totalAmount: totalOrderAmount })
        });
        showMessageBox(`Order ${newOrder._id} placed successfully! It has been sent to the kitchen.`);
        state.currentOrder = [];
        renderCurrentOrder();
    } catch (error) {
        // Handled by fetchData
    }
});

// Kitchen Management
filterKitchenBtn.addEventListener('click', renderKitchenOrders);
kitchenOrdersTableBody.addEventListener('click', async (event) => {
    const target = event.target;
    if (target.matches('.edit')) {
        const orderId = target.closest('tr').dataset.orderId;
        await markOrderReady(orderId);
    } else if (target.matches('.delete')) {
        const orderId = target.closest('tr').dataset.orderId;
        await cancelKitchenOrder(orderId);
    }
});

// Sales Management
filterSalesBtn.addEventListener('click', renderSalesTransactions);

// Inventory Management
filterInventoryBtn.addEventListener('click', renderInventoryItems);
addInventoryBtn.addEventListener('click', (event) => {
    event.preventDefault();
    handleInventoryFormSubmit();
});
cancelIngredientEditBtn.addEventListener('click', () => resetInventoryForm());
inventoryItemsTableBody.addEventListener('click', async (event) => {
    const target = event.target;
    const ingredientId = target.closest('tr').dataset.ingredientId;
    if (target.matches('.edit')) {
        await editIngredient(ingredientId);
    } else if (target.matches('.delete')) {
        await deleteIngredient(ingredientId);
    }
});

// Expenses Management
filterExpensesBtn.addEventListener('click', renderExpenses);
expenseForm.addEventListener('submit', handleExpenseFormSubmit);
cancelExpenseEditBtn.addEventListener('click', () => resetExpenseForm());
expensesTableBody.addEventListener('click', async (event) => {
    const target = event.target;
    const expenseId = target.closest('tr').dataset.expenseId;
    if (target.matches('.edit')) {
        await editExpense(expenseId);
    } else if (target.matches('.delete')) {
        await deleteExpense(expenseId);
    }
});

// Reports
generateReportBtn.addEventListener('click', generateReports);

// Menu Management
menuForm.addEventListener('submit', handleMenuFormSubmit);
cancelMenuEditBtn.addEventListener('click', () => resetMenuForm());
menuItemsTableBody.addEventListener('click', async (event) => {
    const target = event.target;
    const menuItemId = target.closest('tr').dataset.menuItemId;
    if (target.matches('.edit')) {
        await editMenuItem(menuItemId);
    } else if (target.matches('.delete')) {
        await deleteMenuItem(menuItemId);
    }
});

addRecipeIngredientBtn.addEventListener('click', addRecipeIngredient);

// --- Core Functionality ---

async function initializeApp(userRole) {
    state.currentUserRole = userRole;

    document.querySelectorAll('.nav-link[data-section]').forEach(link => {
        const sectionId = link.dataset.section;
        link.classList.toggle('hidden', !checkUserRole(allowedRoles[sectionId]));
    });

    loginPage.classList.add('hidden');
    mainAppContainer.classList.remove('hidden');
    errorMessage.classList.add('hidden');

    const today = getTodayDate();
    const thirtyDaysAgo = new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0];
    [kitchenStartDateInput, salesStartDateInput, inventoryStartDateInput, expenseStartDateInput, reportStartDateInput].forEach(input => input.value = thirtyDaysAgo);
    [kitchenEndDateInput, salesEndDateInput, inventoryEndDateInput, expenseEndDateInput, reportEndDateInput].forEach(input => input.value = today);

    try {
        // Pre-fetch all necessary data on app load to avoid delays later
        state.allMenuItems = await fetchData(`${BACKEND_API_URL}/menu`);
        state.allIngredients = await fetchData(`${BACKEND_API_URL}/inventory`);

        const orders = await fetchData(`${BACKEND_API_URL}/kitchen-orders`);
        orders.forEach(order => state.lastWaiterOrderStatuses.set(order._id, order.status));
    } catch (error) {
        console.error("Initial data fetch failed:", error);
    }

    if (state.currentUserRole === 'waiter') {
        await showSection('order-management');
    } else if (state.currentUserRole === 'admin') {
        await showSection('kitchen'); // A better default for admin, as they manage the kitchen
    }
}

// Order Management
async function renderOrderForm() {
    orderMenuItemSelect.innerHTML = '<option value="">-- Select an Item --</option>';
    try {
        state.allMenuItems = await fetchData(`${BACKEND_API_URL}/menu`);
        state.allMenuItems.forEach(item => {
            const option = document.createElement('option');
            option.value = item._id;
            option.textContent = `${item.name} ( Ugshs${item.price.toFixed(2)})`;
            orderMenuItemSelect.appendChild(option);
        });
    } catch (error) {
        // Handled by fetchData
    }
}

function renderCurrentOrder() {
    currentOrderList.innerHTML = '';
    let total = 0;
    if (state.currentOrder.length === 0) {
        currentOrderList.innerHTML = `<li class="order-list-item">No items in current order.</li>`;
    } else {
        state.currentOrder.forEach((orderItem, index) => {
            const menuItem = state.allMenuItems.find(item => item._id === orderItem.menuItemId);
            if (menuItem) {
                const listItem = document.createElement('li');
                listItem.classList.add('order-list-item');
                listItem.innerHTML = `
                    <span>${menuItem.name} x ${orderItem.quantity}</span>
                    <span>ugshs${(menuItem.price * orderItem.quantity).toFixed(2)}</span>
                    <button class="remove-item-btn" data-index="${index}">&times;</button>
                `;
                currentOrderList.appendChild(listItem);
                total += menuItem.price * orderItem.quantity;
            }
        });
    }
    currentOrderTotalSpan.textContent = total.toFixed(2);
}

currentOrderList.addEventListener('click', (event) => {
    if (event.target.classList.contains('remove-item-btn')) {
        const index = event.target.dataset.index;
        state.currentOrder.splice(index, 1);
        renderCurrentOrder();
    }
});


// Kitchen Management
async function renderKitchenOrders() {
    kitchenOrdersTableBody.innerHTML = '';
    const startDate = kitchenStartDateInput.value;
    const endDate = kitchenEndDateInput.value;
    let url = `${BACKEND_API_URL}/kitchen-orders`;
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (params.toString()) url += `?${params.toString()}`;

    try {
        const orders = await fetchData(url);
        if (orders.length === 0) {
            kitchenOrdersTableBody.innerHTML = `<tr><td colspan="6" class="table-empty-state">No kitchen orders found for this period.</td></tr>`;
            return;
        }

        orders.forEach(order => {
            const itemsList = order.items.map(item => `${item.menuItem?.name || 'Unknown Item'} x ${item.quantity}`).join(', ');
            const row = document.createElement('tr');
            row.dataset.orderId = order._id;
            row.innerHTML = `
                <td class="font-medium">${order._id.substring(0, 8)}...</td>
                <td class="text-gray">${formatDateForInput(order.date)}</td>
                <td class="text-gray">${itemsList}</td>
                <td class="text-gray">Ugshs${order.totalAmount.toFixed(2)}</td>
                <td>
                    <span class="status-badge ${order.status.toLowerCase().replace(' ', '-')}">${order.status}</span>
                </td>
                <td class="table-actions">
                    ${(order.status === 'New' || order.status === 'Preparing') && checkUserRole(['admin']) ?
                        `<button class="edit" data-action="mark-ready">Mark Ready</button>` :
                        `<button class="edit" disabled>Mark Ready</button>`
                    }
                    ${order.status !== 'Cancelled' && checkUserRole(['admin']) ?
                        `<button class="delete" data-action="cancel">Cancel</button>` :
                        `<button class="delete" disabled>Cancel</button>`
                    }
                </td>
            `;
            kitchenOrdersTableBody.appendChild(row);
        });
    } catch (error) {
        // Handled by fetchData
    }
}

async function checkNewOrdersForChef() {
    if (state.currentUserRole !== 'admin') return;
    try {
        const orders = await fetchData(`${BACKEND_API_URL}/kitchen-orders`);
        const newOrderCount = orders.filter(order => order.status === 'New').length;
        if (newOrderCount > state.lastKitchenOrderCount) {
            const ordersToNotify = newOrderCount - state.lastKitchenOrderCount;
            showMessageBox(`New Order Alert! You have ${ordersToNotify} new order(s) to prepare.`);
        }
        state.lastKitchenOrderCount = newOrderCount;
    } catch (error) {
        console.error("Error checking for new orders:", error);
    }
}

async function markOrderReady(orderId) {
    if (!checkUserRole(['admin'])) {
        showMessageBox('You do not have permission to perform this action.');
        return;
    }
    try {
        const response = await fetchData(`${BACKEND_API_URL}/kitchen-orders/${orderId}/ready`, { method: 'PUT' });
        showMessageBox(response.message);
        await Promise.all([renderKitchenOrders(), renderInventoryItems(), renderSalesTransactions(), generateReports()]);
    } catch (error) {
        // Handled by fetchData
    }
}

async function cancelKitchenOrder(orderId) {
    if (!checkUserRole(['admin'])) {
        showMessageBox('You do not have permission to perform this action.');
        return;
    }
    try {
        const response = await fetchData(`${BACKEND_API_URL}/kitchen-orders/${orderId}/cancel`, { method: 'PUT' });
        showMessageBox(response.message);
        await renderKitchenOrders();
    } catch (error) {
        // Handled by fetchData
    }
}

// Waiter Notifications
async function checkOrderReadyForWaiter() {
    if (state.currentUserRole !== 'waiter') return;
    try {
        const orders = await fetchData(`${BACKEND_API_URL}/kitchen-orders`);
        orders.forEach(order => {
            const lastStatus = state.lastWaiterOrderStatuses.get(order._id);
            if (lastStatus !== 'Ready for Pickup' && order.status === 'Ready for Pickup') {
                showMessageBox(`Order ${order._id.substring(0, 8)}... is ready for pickup!`);
            }
            state.lastWaiterOrderStatuses.set(order._id, order.status);
        });
    } catch (error) {
        console.error("Error checking order statuses:", error);
    }
}


// Sales Management
async function renderSalesTransactions() {
    salesTransactionsTableBody.innerHTML = '';
    const startDate = salesStartDateInput.value;
    const endDate = salesEndDateInput.value;
    let url = `${BACKEND_API_URL}/sales`;
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (params.toString()) url += `?${params.toString()}`;

    try {
        const sales = await fetchData(url);
        if (sales.length === 0) {
            salesTransactionsTableBody.innerHTML = `<tr><td colspan="9" class="table-empty-state">No sales transactions found for this period.</td></tr>`;
            return;
        }
        sales.forEach(transaction => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="font-medium">${transaction._id.substring(0, 8)}...</td>
                <td class="text-gray">${formatDateForInput(transaction.date)}</td>
                <td class="text-gray">${transaction.itemSold}</td>
                <td class="text-gray">${transaction.quantity}</td>
                <td class="text-gray">Ugshs${transaction.amount.toFixed(2)}</td>
            `;
            salesTransactionsTableBody.appendChild(row);
        });
    } catch (error) {
        // Handled by fetchData
    }
}


// Inventory Management
async function renderInventoryItems() {
    inventoryItemsTableBody.innerHTML = '';
    const startDate = inventoryStartDateInput.value;
    const endDate = inventoryEndDateInput.value;
    let url = `${BACKEND_API_URL}/inventory`;
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (params.toString()) url += `?${params.toString()}`;

    try {
        const items = await fetchData(url);
        state.allIngredients = items;
        if (items.length === 0) {
            inventoryItemsTableBody.innerHTML = `<tr><td colspan="6" class="table-empty-state">No inventory items found.</td></tr>`;
            return;
        }
        items.forEach(item => {
            const row = document.createElement('tr');
            row.dataset.ingredientId = item._id;
            row.innerHTML = `
                <td class="font-medium">${item.name}</td>
                <td class="text-gray">${item.quantity.toFixed(2)} ${item.unit}</td>
                <td class="text-gray">Ugshs${item.costPerUnit.toFixed(2)}</td>
                <td class="text-gray">${item.spoilageRate}%</td>
                <td class="text-gray">${formatDateForInput(item.dateAdded)}</td>
                <td class="table-actions">
                    <button class="edit">Edit</button>
                    <button class="delete">Delete</button>
                </td>
            `;
            inventoryItemsTableBody.appendChild(row);
        });
    } catch (error) {
        // Handled by fetchData
    }
}

function handleInventoryFormSubmit(event) {
    if (event) event.preventDefault();
    const isEditing = !!state.editingIngredientId;

    const data = {
        name: ingredientNameInput.value,
        quantity: parseFloat(ingredientQuantityInput.value),
        unit: ingredientUnitInput.value,
        costPerUnit: parseFloat(ingredientCostPerUnitInput.value),
        spoilageRate: parseFloat(ingredientSpoilageInput.value),
    };

    if (Object.values(data).some(value => !value && value !== 0)) {
        showMessageBox('Please fill out all fields.');
        return;
    }
    if (data.quantity < 0 || data.costPerUnit < 0 || data.spoilageRate < 0) {
        showMessageBox('Quantity, cost, and spoilage rate cannot be negative.');
        return;
    }

    const url = isEditing ? `${BACKEND_API_URL}/inventory/${state.editingIngredientId}` : `${BACKEND_API_URL}/inventory`;
    const method = isEditing ? 'PUT' : 'POST';

    fetchData(url, {
        method: method,
        body: JSON.stringify(data),
    }).then(() => {
        showMessageBox(`Ingredient ${isEditing ? 'updated' : 'added'} successfully!`);
        resetInventoryForm();
        renderInventoryItems();
        populateRecipeIngredientSelect();
    }).catch(error => {
        console.error('Error submitting inventory form:', error);
    });
}

async function editIngredient(ingredientId) {
    state.editingIngredientId = ingredientId;
    try {
        const ingredient = await fetchData(`${BACKEND_API_URL}/inventory/${ingredientId}`);
        ingredientNameInput.value = ingredient.name;
        ingredientQuantityInput.value = ingredient.quantity;
        ingredientUnitInput.value = ingredient.unit;
        ingredientCostPerUnitInput.value = ingredient.costPerUnit;
        ingredientSpoilageInput.value = ingredient.spoilageRate;
        addInventoryBtn.textContent = 'Update Ingredient';
        cancelIngredientEditBtn.classList.remove('hidden');
    } catch (error) {
        console.error('Error fetching ingredient for edit:', error);
    }
}

async function deleteIngredient(ingredientId) {
    if (!confirm('Are you sure you want to delete this ingredient?')) return;
    try {
        const response = await fetchData(`${BACKEND_API_URL}/inventory/${ingredientId}`, { method: 'DELETE' });
        showMessageBox(response.message);
        renderInventoryItems();
        populateRecipeIngredientSelect();
    } catch (error) {
        console.error('Error deleting ingredient:', error);
    }
}

function resetInventoryForm() {
    inventoryForm.reset();
    state.editingIngredientId = null;
    addInventoryBtn.textContent = 'Add Ingredient';
    cancelIngredientEditBtn.classList.add('hidden');
}

// Expenses Management
async function renderExpenses() {
    expensesTableBody.innerHTML = '';
    const startDate = expenseStartDateInput.value;
    const endDate = expenseEndDateInput.value;
    let url = `${BACKEND_API_URL}/expenses`;
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (params.toString()) url += `?${params.toString()}`;

    try {
        const expenses = await fetchData(url);
        if (expenses.length === 0) {
            expensesTableBody.innerHTML = `<tr><td colspan="5" class="table-empty-state">No expenses found for this period.</td></tr>`;
            return;
        }
        expenses.forEach(expense => {
            const row = document.createElement('tr');
            row.dataset.expenseId = expense._id;
            row.innerHTML = `
                <td class="font-medium">${formatDateForInput(expense.date)}</td>
                <td class="text-gray">${expense.category}</td>
                <td class="text-gray">${expense.description}</td>
                <td class="text-gray">Ugshs${expense.amount.toFixed(2)}</td>
                <td class="table-actions">
                    <button class="edit">Edit</button>
                    <button class="delete">Delete</button>
                </td>
            `;
            expensesTableBody.appendChild(row);
        });
    } catch (error) {
        // Handled by fetchData
    }
}

function handleExpenseFormSubmit(event) {
    event.preventDefault();
    const isEditing = !!state.editingExpenseId;

    const data = {
        date: expenseDateInput.value,
        category: expenseCategoryInput.value,
        description: expenseDescriptionInput.value,
        amount: parseFloat(expenseAmountInput.value),
    };

    if (Object.values(data).some(value => !value && value !== 0)) {
        showMessageBox('Please fill out all fields.');
        return;
    }
    if (data.amount < 0) {
        showMessageBox('Amount cannot be negative.');
        return;
    }

    const url = isEditing ? `${BACKEND_API_URL}/expenses/${state.editingExpenseId}` : `${BACKEND_API_URL}/expenses`;
    const method = isEditing ? 'PUT' : 'POST';

    fetchData(url, {
        method: method,
        body: JSON.stringify(data),
    }).then(() => {
        showMessageBox(`Expense ${isEditing ? 'updated' : 'added'} successfully!`);
        resetExpenseForm();
        renderExpenses();
    }).catch(error => {
        console.error('Error submitting expense form:', error);
    });
}

async function editExpense(expenseId) {
    state.editingExpenseId = expenseId;
    try {
        const expense = await fetchData(`${BACKEND_API_URL}/expenses/${expenseId}`);
        expenseDateInput.value = formatDateForInput(expense.date);
        expenseCategoryInput.value = expense.category;
        expenseDescriptionInput.value = expense.description;
        expenseAmountInput.value = expense.amount;
        expenseForm.querySelector('button[type="submit"]').textContent = 'Update Expense';
        cancelExpenseEditBtn.classList.remove('hidden');
    } catch (error) {
        console.error('Error fetching expense for edit:', error);
    }
}

async function deleteExpense(expenseId) {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    try {
        const response = await fetchData(`${BACKEND_API_URL}/expenses/${expenseId}`, { method: 'DELETE' });
        showMessageBox(response.message);
        renderExpenses();
    } catch (error) {
        console.error('Error deleting expense:', error);
    }
}

function resetExpenseForm() {
    expenseForm.reset();
    state.editingExpenseId = null;
    expenseForm.querySelector('button[type="submit"]').textContent = 'Add Expense';
    cancelExpenseEditBtn.classList.add('hidden');
}


// Reports
async function generateReports() {
    const startDate = reportStartDateInput.value;
    const endDate = reportEndDateInput.value;
    if (!startDate || !endDate) {
        showMessageBox('Please select both a start and end date for the report.');
        return;
    }
    try {
        const report = await fetchData(`${BACKEND_API_URL}/reports?startDate=${startDate}&endDate=${endDate}`);
        
        reportTotalSalesSpan.textContent = `Ugshs${report.totalSales.toFixed(2)}`;
        reportTotalExpensesSpan.textContent = `Ugshs${report.totalExpenses.toFixed(2)}`;
        const netBalance = report.totalSales - report.totalExpenses;
        reportNetBalanceSpan.textContent = `Ugshs${netBalance.toFixed(2)}`;
        reportNetBalanceSpan.classList.toggle('text-red', netBalance < 0);
        reportNetBalanceSpan.classList.toggle('text-green', netBalance >= 0);

        renderReportTable(reportSalesTableBody, report.sales);
        renderReportTable(reportExpensesTableBody, report.expenses);

    } catch (error) {
        console.error('Error generating report:', error);
    }
}

function renderReportTable(tableBody, data) {
    tableBody.innerHTML = '';
    if (data.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" class="table-empty-state">No data found for this period.</td></tr>`;
        return;
    }
    data.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="font-medium">${formatDateForInput(item.date)}</td>
            <td class="text-gray">${item.item || item.description}</td>
            <td class="text-gray">${item.amount ? 'Ugshs' + item.amount.toFixed(2) : ''}</td>
            <td class="text-gray">${item.quantity || ''}</td>
        `;
        tableBody.appendChild(row);
    });
}


// Menu Management
async function renderMenuItems() {
    menuItemsTableBody.innerHTML = '';
    try {
        const menuItems = await fetchData(`${BACKEND_API_URL}/menu`);
        if (menuItems.length === 0) {
            menuItemsTableBody.innerHTML = `<tr><td colspan="5" class="table-empty-state">No menu items found.</td></tr>`;
            return;
        }
        menuItems.forEach(item => {
            const row = document.createElement('tr');
            row.dataset.menuItemId = item._id;
            const recipeList = item.recipe.map(ing => {
                const ingredient = state.allIngredients.find(i => i._id === ing.ingredientId);
                return `${ingredient?.name || 'Unknown'} x ${ing.quantityUsed}${ingredient?.unit || ''}`;
            }).join(', ');
            row.innerHTML = `
                <td class="font-medium">${item.name}</td>
                <td class="text-gray">Ugshs${item.price.toFixed(2)}</td>
                <td class="text-gray">${item.category}</td>
                <td class="text-gray">${recipeList || 'No recipe defined'}</td>
                <td class="table-actions">
                    <button class="edit">Edit</button>
                    <button class="delete">Delete</button>
                </td>
            `;
            menuItemsTableBody.appendChild(row);
        });
    } catch (error) {
        // Handled by fetchData
    }
}

function handleMenuFormSubmit(event) {
    event.preventDefault();
    const isEditing = !!state.editingMenuItemId;

    const data = {
        name: itemNameInput.value,
        price: parseFloat(itemPriceInput.value),
        category: itemCategoryInput.value,
        recipe: state.currentRecipe,
    };

    if (!data.name || isNaN(data.price) || data.price < 0 || !data.category) {
        showMessageBox('Please fill out all menu item fields correctly.');
        return;
    }

    const url = isEditing ? `${BACKEND_API_URL}/menu/${state.editingMenuItemId}` : `${BACKEND_API_URL}/menu`;
    const method = isEditing ? 'PUT' : 'POST';

    fetchData(url, {
        method: method,
        body: JSON.stringify(data),
    }).then(() => {
        showMessageBox(`Menu item ${isEditing ? 'updated' : 'added'} successfully!`);
        resetMenuForm();
        renderMenuItems();
        renderOrderForm(); // Refresh order form with new menu item
    }).catch(error => {
        console.error('Error submitting menu form:', error);
    });
}

async function editMenuItem(menuItemId) {
    state.editingMenuItemId = menuItemId;
    try {
        const menuItem = await fetchData(`${BACKEND_API_URL}/menu/${menuItemId}`);
        itemNameInput.value = menuItem.name;
        itemPriceInput.value = menuItem.price;
        itemCategoryInput.value = menuItem.category;
        state.currentRecipe = menuItem.recipe;
        renderCurrentRecipe();
        menuForm.querySelector('button[type="submit"]').textContent = 'Update Menu Item';
        cancelMenuEditBtn.classList.remove('hidden');
    } catch (error) {
        console.error('Error fetching menu item for edit:', error);
    }
}

async function deleteMenuItem(menuItemId) {
    if (!confirm('Are you sure you want to delete this menu item?')) return;
    try {
        const response = await fetchData(`${BACKEND_API_URL}/menu/${menuItemId}`, { method: 'DELETE' });
        showMessageBox(response.message);
        renderMenuItems();
        renderOrderForm(); // Refresh order form
    } catch (error) {
        console.error('Error deleting menu item:', error);
    }
}

function resetMenuForm() {
    menuForm.reset();
    state.editingMenuItemId = null;
    state.currentRecipe = [];
    renderCurrentRecipe();
    menuForm.querySelector('button[type="submit"]').textContent = 'Add Menu Item';
    cancelMenuEditBtn.classList.add('hidden');
}


// Recipe Management
async function populateRecipeIngredientSelect() {
    recipeIngredientSelect.innerHTML = '<option value="">-- Select an Ingredient --</option>';
    try {
        state.allIngredients = await fetchData(`${BACKEND_API_URL}/inventory`);
        state.allIngredients.forEach(ingredient => {
            const option = document.createElement('option');
            option.value = ingredient._id;
            option.textContent = `${ingredient.name} (${ingredient.unit})`;
            recipeIngredientSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error populating recipe ingredients:', error);
    }
}

function addRecipeIngredient() {
    const ingredientId = recipeIngredientSelect.value;
    const quantity = parseFloat(recipeQuantityUsedInput.value);

    if (!ingredientId || isNaN(quantity) || quantity <= 0) {
        showMessageBox('Please select an ingredient and enter a valid quantity.');
        return;
    }

    const ingredient = state.allIngredients.find(i => i._id === ingredientId);
    if (ingredient) {
        state.currentRecipe.push({
            ingredientId: ingredient._id,
            name: ingredient.name,
            quantityUsed: quantity,
        });
        renderCurrentRecipe();
        recipeIngredientSelect.value = '';
        recipeQuantityUsedInput.value = '';
    } else {
        showMessageBox('Selected ingredient not found.');
    }
}

function renderCurrentRecipe() {
    currentRecipeList.innerHTML = '';
    if (state.currentRecipe.length === 0) {
        currentRecipeList.innerHTML = `<li>No ingredients added to recipe.</li>`;
        return;
    }
    state.currentRecipe.forEach((item, index) => {
        const listItem = document.createElement('li');
        listItem.innerHTML = `
            <span>${item.name} x ${item.quantityUsed}</span>
            <button class="remove-recipe-item-btn" data-index="${index}">&times;</button>
        `;
        currentRecipeList.appendChild(listItem);
    });
}

currentRecipeList.addEventListener('click', (event) => {
    if (event.target.classList.contains('remove-recipe-item-btn')) {
        const index = event.target.dataset.index;
        state.currentRecipe.splice(index, 1);
        renderCurrentRecipe();
    }
});


// Audit Logs (Placeholder - Assuming a backend endpoint exists)
async function renderAuditLogs() {
    const auditLogsTableBody = document.getElementById('audit-logs-table-body');
    auditLogsTableBody.innerHTML = '<tr><td colspan="3" class="table-empty-state">Audit logs functionality not yet fully implemented.</td></tr>';
    // To implement:
    // try {
    //     const logs = await fetchData(`${BACKEND_API_URL}/auditlogs`);
    //     ... logic to render logs
    // } catch (error) {
    //     console.error('Error fetching audit logs:', error);
    // }
}


// --- Initial App Load ---
document.addEventListener('DOMContentLoaded', () => {
    const userRole = sessionStorage.getItem('userRole');
    if (userRole) {
        initializeApp(userRole);
    } else {
        loginPage.classList.remove('hidden');
    }
});
