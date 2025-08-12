// --- Configuration & Global State ---
const BACKEND_API_URL = 'https://restaurantmgtsys.onrender.com/api';
const POLLING_INTERVAL = 5000; // 5 seconds for polling

let currentOrder = [];
let allMenuItems = [];
let allIngredients = [];
let currentRecipe = [];
let lastKitchenOrderCount = 0;
let lastWaiterOrderStatuses = new Map();
let kitchenPollingIntervalId = null;
let waiterPollingIntervalId = null;
let currentUserRole = null;
let editingMenuItem = null; // State for the menu item being edited in the modal
const synth = new Tone.Synth().toDestination();

// --- DOM Elements ---
const navLinks = document.querySelectorAll('.nav-link');
const contentSections = document.querySelectorAll('.content-section');
const currentSectionTitle = document.getElementById('current-section-title');

// Shared elements
const messageBox = document.getElementById('message-box');
const messageText = document.getElementById('message-text');
const messageOkBtn = document.getElementById('message-ok-btn');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const menuToggle = document.getElementById('menu-toggle');
const loginPage = document.getElementById('login-page');
const mainAppContainer = document.getElementById('main-app-container');
const loginForm = document.getElementById('login-form');
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

// Sales
const salesTransactionsTableBody = document.getElementById('sales-transactions-table-body');
const salesStartDateInput = document.getElementById('sales-start-date');
const salesEndDateInput = document.getElementById('sales-end-date');
const filterSalesBtn = document.getElementById('filter-sales-btn');

// Inventory Management
const inventoryForm = document.getElementById('inventory-form');
const ingredientIdInput = document.getElementById('ingredient-id');
const ingredientNameInput = document.getElementById('ingredient-name');
const ingredientCostPerUnitInput = document.getElementById('ingredient-cost-per-unit');
const inventoryItemsTableBody = document.getElementById('inventory-items-table-body');
const cancelIngredientEditBtn = document.getElementById('cancel-ingredient-edit-btn');
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
const recipeIngredientSelect = document.getElementById('recipe-ingredient-select');
const addRecipeIngredientBtn = document.getElementById('add-recipe-ingredient-btn');
const currentRecipeList = document.getElementById('current-recipe-list');

// Modals
const recipeEditModal = document.getElementById('recipe-edit-modal');
const modalItemNameInput = document.getElementById('modal-item-name');
const modalItemPriceInput = document.getElementById('modal-item-price');
const modalItemCategoryInput = document.getElementById('modal-item-category');
const modalRecipeTableBody = document.getElementById('modal-recipe-table-body');
const modalAddIngredientBtn = document.getElementById('modal-add-ingredient-btn');
const modalSaveBtn = document.getElementById('save-modal-btn');
const modalCloseBtn = document.getElementById('close-modal-btn');
const modalRecipeIngredientSelect = document.getElementById('modal-recipe-ingredient-select');
const modalRecipeQuantityUsedInput = document.getElementById('modal-recipe-quantity-used');

// Audit Logs
const auditLogsTableBody = document.getElementById('audit-logs-table-body');

// --- Helper Functions ---
const allowedRoles = {
    'order-management': ['admin', 'waiter'],
    'kitchen': ['admin', 'waiter'],
    'sales': ['admin'],
    'inventory-management': ['admin'],
    'expenses': ['admin'],
    'reports': ['admin'],
    'menu-management': ['admin', 'waiter'],
    'auditlogs': ['admin']
};

const showMessageBox = async (message) => {
    messageText.textContent = message;
    messageBox.classList.remove('hidden');
    await Tone.start();
    synth.triggerAttackRelease("C4", "8n");
};

const getTodayDate = () => new Date().toISOString().split('T')[0];

const formatDateForInput = (dateObj) => dateObj ? new Date(dateObj).toISOString().split('T')[0] : '';

const formatDateForDisplay = (dateString) => {
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return date.toLocaleDateString('en-US', options);
};

const fetchData = async (url, options = {}) => {
    try {
        const response = await fetch(url, {
            headers: { 'Content-Type': 'application/json', ...options.headers },
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
};

const checkUserRole = (requiredRoles) => currentUserRole && requiredRoles?.includes(currentUserRole);

const hideAllSections = () => contentSections.forEach(section => section.classList.add('hidden'));

const stopAllPolling = () => {
    clearInterval(kitchenPollingIntervalId);
    clearInterval(waiterPollingIntervalId);
};

const showLoading = (tableBody, colspan) => {
    tableBody.innerHTML = `<tr><td colspan="${colspan}" class="table-empty-state loading">Loading...</td></tr>`;
};

const renderEmptyTableMessage = (tableBody, message, colspan) => {
    tableBody.innerHTML = `<tr><td colspan="${colspan}" class="table-empty-state">${message}</td></tr>`;
};

// --- Main Application Logic ---

async function initializeApp(userRole) {
    currentUserRole = userRole;

    document.querySelectorAll('.nav-link[data-section]').forEach(link => {
        const sectionId = link.dataset.section;
        link.classList.toggle('hidden', !checkUserRole(allowedRoles[sectionId]));
    });

    loginPage.classList.add('hidden');
    mainAppContainer.classList.remove('hidden');
    errorMessage.classList.add('hidden');

    const today = getTodayDate();
    const thirtyDaysAgo = new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0];

    [kitchenStartDateInput, salesStartDateInput, expenseStartDateInput, reportStartDateInput].forEach(input => input.value = thirtyDaysAgo);
    [kitchenEndDateInput, salesEndDateInput, expenseEndDateInput, reportEndDateInput].forEach(input => input.value = today);

    await Promise.all([
        renderOrderForm(),
        renderKitchenOrders(),
        renderSalesTransactions(),
        renderInventoryItems(),
        renderExpenses(),
        generateReports(),
        populateRecipeIngredientSelect()
    ]);

    try {
        const orders = await fetchData(`${BACKEND_API_URL}/kitchen-orders`);
        orders.forEach(order => lastWaiterOrderStatuses.set(order._id, order.status));
    } catch (error) {
        console.error("Failed to initialize waiter order statuses:", error);
    }

    const defaultSection = currentUserRole === 'waiter' ? 'order-management' : 'order-management';
    await showSection(defaultSection);
}

async function showSection(sectionId) {
    if (!checkUserRole(allowedRoles[sectionId])) {
        return showMessageBox('You do not have permission to access this section.');
    }

    hideAllSections();
    stopAllPolling();

    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.remove('hidden');
        currentSectionTitle.textContent = targetSection.querySelector('h2').textContent;
    }

    switch (sectionId) {
        case 'order-management':
            await renderOrderForm();
            renderCurrentOrder();
            waiterPollingIntervalId = setInterval(checkOrderReadyForWaiter, POLLING_INTERVAL);
            break;
        case 'kitchen':
            await renderKitchenOrders();
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

    sidebar.classList.remove('active');
    sidebarOverlay.classList.remove('active');
}

// --- Event Listeners (Centralized) ---

// Navigation
navLinks.forEach(link => link.addEventListener('click', (e) => {
    e.preventDefault();
    const sectionId = e.currentTarget.dataset.section;
    showSection(sectionId);
}));

// User Auth
loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const users = { 'Ronald': { password: '123', role: 'admin' }, 'Martha': { password: '123', role: 'waiter' } };

    if (users[username] && users[username].password === password) {
        sessionStorage.setItem('userRole', users[username].role);
        await initializeApp(users[username].role);
    } else {
        errorMessage.classList.remove('hidden');
    }
});

logoutButton.addEventListener('click', () => {
    sessionStorage.removeItem('userRole');
    currentUserRole = null;
    stopAllPolling();
    mainAppContainer.classList.add('hidden');
    loginPage.classList.remove('hidden');
    loginForm.reset();
    document.getElementById('username').focus();
});

// Mobile menu
menuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('active');
    sidebarOverlay.classList.toggle('active');
});
sidebarOverlay.addEventListener('click', () => {
    sidebar.classList.remove('active');
    sidebarOverlay.classList.remove('active');
});

// Generic Message Box
messageOkBtn.addEventListener('click', () => messageBox.classList.add('hidden'));

// --- Section-Specific Logic ---

// Order Management
addToOrderBtn.addEventListener('click', () => {
    const selectedItemId = orderMenuItemSelect.value;
    const quantity = parseInt(orderQuantityInput.value);

    if (!selectedItemId || isNaN(quantity) || quantity <= 0) {
        return showMessageBox('Please select a menu item and enter a valid quantity.');
    }

    const existingItem = currentOrder.find(item => item.menuItemId === selectedItemId);
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        currentOrder.push({ menuItemId: selectedItemId, quantity: quantity });
    }

    renderCurrentOrder();
    orderMenuItemSelect.value = '';
    orderQuantityInput.value = '1';
});

placeOrderBtn.addEventListener('click', async () => {
    if (currentOrder.length === 0) {
        return showMessageBox('Please add items to the order before placing it.');
    }

    const totalAmount = currentOrder.reduce((sum, item) => {
        const menuItem = allMenuItems.find(m => m._id === item.menuItemId);
        return sum + (menuItem?.price * item.quantity || 0);
    }, 0);

    try {
        const newOrder = await fetchData(`${BACKEND_API_URL}/kitchen-orders`, {
            method: 'POST',
            body: JSON.stringify({ items: currentOrder, totalAmount })
        });
        showMessageBox(`Order ${newOrder._id} placed successfully!`);
        currentOrder = [];
        renderCurrentOrder();
    } catch (error) {
        // Error handled by fetchData
    }
});

function renderCurrentOrder() {
    currentOrderList.innerHTML = '';
    let total = 0;
    if (currentOrder.length === 0) {
        return (currentOrderList.innerHTML = `<li class="order-list-item">No items in current order.</li>`);
    }

    currentOrder.forEach((orderItem, index) => {
        const menuItem = allMenuItems.find(item => item._id === orderItem.menuItemId);
        if (menuItem) {
            const itemTotal = menuItem.price * orderItem.quantity;
            currentOrderList.innerHTML += `
                <li class="order-list-item">
                    <span>${menuItem.name} x ${orderItem.quantity}</span>
                    <span>Ugshs${itemTotal.toFixed(2)}</span>
                    <button class="delete-order-item" data-index="${index}">&times;</button>
                </li>
            `;
            total += itemTotal;
        }
    });
    currentOrderTotalSpan.textContent = total.toFixed(2);
}

// Event delegation for dynamically added order items
currentOrderList.addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-order-item')) {
        const index = e.target.dataset.index;
        currentOrder.splice(index, 1);
        renderCurrentOrder();
    }
});

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
        // Error handled by fetchData
    }
}

async function checkOrderReadyForWaiter() {
    if (!checkUserRole(['waiter', 'admin'])) return;
    try {
        const orders = await fetchData(`${BACKEND_API_URL}/kitchen-orders`);
        const newReadyOrders = orders.filter(order => order.status === 'Ready' && lastWaiterOrderStatuses.get(order._id) !== 'Ready');
        if (newReadyOrders.length > 0) {
            const orderIds = newReadyOrders.map(o => o._id).join(', ');
            showMessageBox(`Order Ready! Order(s) ${orderIds} are now ready for pickup.`);
        }
        orders.forEach(order => lastWaiterOrderStatuses.set(order._id, order.status));
    } catch (error) {
        console.error("Error checking for ready orders:", error);
    }
}

// Kitchen Management
filterKitchenBtn.addEventListener('click', renderKitchenOrders);
kitchenOrdersTableBody.addEventListener('click', async (e) => {
    const orderId = e.target.dataset.id;
    if (!orderId || !checkUserRole(['admin'])) return;

    if (e.target.classList.contains('mark-ready-btn')) {
        try {
            const response = await fetchData(`${BACKEND_API_URL}/kitchen-orders/${orderId}/ready`, { method: 'PUT' });
            showMessageBox(response.message);
            await Promise.all([renderKitchenOrders(), renderInventoryItems(), renderSalesTransactions(), generateReports()]);
        } catch (error) {
            // Handled by fetchData
        }
    } else if (e.target.classList.contains('cancel-order-btn')) {
        try {
            const response = await fetchData(`${BACKEND_API_URL}/kitchen-orders/${orderId}/cancel`, { method: 'PUT' });
            showMessageBox(response.message);
            await renderKitchenOrders();
        } catch (error) {
            // Handled by fetchData
        }
    }
});

async function renderKitchenOrders() {
    showLoading(kitchenOrdersTableBody, 6);
    const startDate = kitchenStartDateInput.value;
    const endDate = kitchenEndDateInput.value;
    let url = `${BACKEND_API_URL}/kitchen-orders?startDate=${startDate}&endDate=${endDate}`;

    try {
        const orders = await fetchData(url);
        if (orders.length === 0) {
            return renderEmptyTableMessage(kitchenOrdersTableBody, 'No kitchen orders found for this period.', 6);
        }

        kitchenOrdersTableBody.innerHTML = orders.map(order => {
            const itemsList = order.items.map(item => `${item.menuItem?.name || 'Unknown Item'} x ${item.quantity}`).join(', ');
            const isReadyOrCancelled = order.status === 'Ready' || order.status === 'Cancelled';
            return `
                <tr>
                    <td class="font-medium">${order._id}</td>
                    <td class="text-gray">${formatDateForInput(order.date)}</td>
                    <td class="text-gray">${itemsList}</td>
                    <td class="text-gray">Ugshs${order.totalAmount.toFixed(2)}</td>
                    <td><span class="status-badge ${order.status.toLowerCase()}">${order.status}</span></td>
                    <td class="table-actions">
                        ${checkUserRole(['admin']) && !isReadyOrCancelled ?
                            `<button data-id="${order._id}" class="edit mark-ready-btn">Mark Ready</button>` :
                            `<button disabled>Mark Ready</button>`
                        }
                        ${checkUserRole(['admin']) && order.status !== 'Cancelled' ?
                            `<button data-id="${order._id}" class="delete cancel-order-btn">Cancel</button>` :
                            `<button disabled>Cancel</button>`
                        }
                    </td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        renderEmptyTableMessage(kitchenOrdersTableBody, 'Failed to load kitchen orders.', 6);
    }
}

async function checkNewOrdersForChef() {
    if (currentUserRole !== 'admin') return;
    try {
        const orders = await fetchData(`${BACKEND_API_URL}/kitchen-orders`);
        const newOrderCount = orders.filter(order => order.status === 'New').length;

        if (newOrderCount > lastKitchenOrderCount) {
            const ordersToNotify = newOrderCount - lastKitchenOrderCount;
            if (ordersToNotify > 0) showMessageBox(`New Order Alert! You have ${ordersToNotify} new order(s) to prepare.`);
        }
        lastKitchenOrderCount = newOrderCount;
    } catch (error) {
        console.error("Error checking for new orders:", error);
    }
}

// Sales Management
filterSalesBtn.addEventListener('click', renderSalesTransactions);

async function renderSalesTransactions() {
    showLoading(salesTransactionsTableBody, 9);
    const startDate = salesStartDateInput.value;
    const endDate = salesEndDateInput.value;
    const url = `${BACKEND_API_URL}/sales?startDate=${startDate}&endDate=${endDate}`;

    try {
        const sales = await fetchData(url);
        if (sales.length === 0) {
            return renderEmptyTableMessage(salesTransactionsTableBody, 'No sales transactions found for this period.', 9);
        }

        salesTransactionsTableBody.innerHTML = sales.map(transaction => `
            <tr>
                <td class="font-medium">${transaction._id}</td>
                <td class="text-gray">${formatDateForInput(transaction.date)}</td>
                <td class="text-gray">${transaction.itemSold}</td>
                <td class="text-gray">${transaction.quantity}</td>
                <td class="text-gray">Ugshs${transaction.amount.toFixed(2)}</td>
                <td class="text-gray">Ugshs${transaction.costOfGoods.toFixed(2)}</td>
                <td class="text-gray">Ugshs${transaction.profit.toFixed(2)}</td>
                <td class="text-gray">${transaction.paymentMethod}</td>
                <td class="table-actions"><button class="view-details">View Only</button></td>
            </tr>
        `).join('');
    } catch (error) {
        renderEmptyTableMessage(salesTransactionsTableBody, 'Failed to load sales transactions.', 9);
    }
}

// Inventory Management
filterInventoryBtn.addEventListener('click', renderInventoryItems);
cancelIngredientEditBtn.addEventListener('click', () => {
    inventoryForm.reset();
    ingredientIdInput.value = '';
    cancelIngredientEditBtn.classList.add('hidden');
});

inventoryForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!checkUserRole(['admin'])) return showMessageBox('You do not have permission to perform this action.');

    const id = ingredientIdInput.value;
    const name = ingredientNameInput.value.trim();
    const costPerUnit = parseFloat(ingredientCostPerUnitInput.value);

    if (!name || isNaN(costPerUnit) || costPerUnit < 0) {
        return showMessageBox('Please fill in the ingredient name and a valid cost.');
    }
    const payload = { name, costPerUnit };

    try {
        const method = id ? 'PUT' : 'POST';
        const url = id ? `${BACKEND_API_URL}/inventory/${id}` : `${BACKEND_API_URL}/inventory`;
        await fetchData(url, { method, body: JSON.stringify(payload) });

        showMessageBox(`Inventory item ${id ? 'updated' : 'added'} successfully!`);
        inventoryForm.reset();
        ingredientIdInput.value = '';
        cancelIngredientEditBtn.classList.add('hidden');
        await Promise.all([renderInventoryItems(), populateRecipeIngredientSelect()]);
    } catch (error) {
        // Handled by fetchData
    }
});

// Event delegation for inventory table
inventoryItemsTableBody.addEventListener('click', async (e) => {
    const itemId = e.target.closest('tr')?.querySelector('td')?.textContent;
    if (!itemId || !checkUserRole(['admin'])) return;

    if (e.target.classList.contains('edit')) {
        const itemToEdit = allIngredients.find(item => item._id === itemId);
        if (itemToEdit) {
            ingredientIdInput.value = itemToEdit._id;
            ingredientNameInput.value = itemToEdit.name;
            ingredientCostPerUnitInput.value = itemToEdit.costPerUnit;
            cancelIngredientEditBtn.classList.remove('hidden');
            ingredientNameInput.focus();
        }
    } else if (e.target.classList.contains('delete')) {
        try {
            await fetchData(`${BACKEND_API_URL}/inventory/${itemId}`, { method: 'DELETE' });
            showMessageBox('Inventory item deleted successfully!');
            await Promise.all([renderInventoryItems(), populateRecipeIngredientSelect()]);
        } catch (error) {
            // Handled by fetchData
        }
    }
});

async function renderInventoryItems() {
    showLoading(inventoryItemsTableBody, 4);
    try {
        allIngredients = await fetchData(`${BACKEND_API_URL}/inventory`);
        if (allIngredients.length === 0) {
            return renderEmptyTableMessage(inventoryItemsTableBody, 'No inventory items added yet.', 4);
        }

        inventoryItemsTableBody.innerHTML = allIngredients.map(item => `
            <tr>
                <td class="font-medium">${item._id}</td>
                <td class="text-gray">${item.name}</td>
                <td class="text-gray">Ugshs${item.costPerUnit.toFixed(2)}</td>
                <td class="table-actions">
                    ${checkUserRole(['admin']) ? `<button class="edit">Edit</button>` : ''}
                    ${checkUserRole(['admin']) ? `<button class="delete">Delete</button>` : ''}
                </td>
            </tr>
        `).join('');
    } catch (error) {
        renderEmptyTableMessage(inventoryItemsTableBody, 'Failed to load inventory items.', 4);
    }
}

// Expenses Management
filterExpensesBtn.addEventListener('click', renderExpenses);
cancelExpenseEditBtn.addEventListener('click', () => {
    expenseForm.reset();
    expenseIdInput.value = '';
    cancelExpenseEditBtn.classList.add('hidden');
});

expenseForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!checkUserRole(['admin'])) return showMessageBox('You do not have permission to perform this action.');

    const id = expenseIdInput.value;
    const date = expenseDateInput.value;
    const category = expenseCategoryInput.value.trim();
    const description = expenseDescriptionInput.value.trim();
    const amount = parseFloat(expenseAmountInput.value);

    if (!date || !category || !description || isNaN(amount) || amount <= 0) {
        return showMessageBox('Please fill in all fields correctly.');
    }
    const payload = { date, category, description, amount };

    try {
        const method = id ? 'PUT' : 'POST';
        const url = id ? `${BACKEND_API_URL}/expenses/${id}` : `${BACKEND_API_URL}/expenses`;
        await fetchData(url, { method, body: JSON.stringify(payload) });

        showMessageBox(`Expense ${id ? 'updated' : 'added'} successfully!`);
        expenseForm.reset();
        expenseIdInput.value = '';
        cancelExpenseEditBtn.classList.add('hidden');
        await Promise.all([renderExpenses(), generateReports()]);
    } catch (error) {
        // Handled by fetchData
    }
});

expensesTableBody.addEventListener('click', async (e) => {
    const expenseId = e.target.closest('tr')?.querySelector('td')?.textContent;
    if (!expenseId || !checkUserRole(['admin'])) return;

    if (e.target.classList.contains('edit')) {
        try {
            const expenseToEdit = await fetchData(`${BACKEND_API_URL}/expenses/${expenseId}`);
            if (expenseToEdit) {
                expenseIdInput.value = expenseToEdit._id;
                expenseDateInput.value = formatDateForInput(expenseToEdit.date);
                expenseCategoryInput.value = expenseToEdit.category;
                expenseDescriptionInput.value = expenseToEdit.description;
                expenseAmountInput.value = expenseToEdit.amount;
                cancelExpenseEditBtn.classList.remove('hidden');
                expenseDateInput.focus();
            }
        } catch (error) {
            // Handled by fetchData
        }
    } else if (e.target.classList.contains('delete')) {
        try {
            await fetchData(`${BACKEND_API_URL}/expenses/${expenseId}`, { method: 'DELETE' });
            showMessageBox('Expense deleted successfully!');
            await Promise.all([renderExpenses(), generateReports()]);
        } catch (error) {
            // Handled by fetchData
        }
    }
});

async function renderExpenses() {
    showLoading(expensesTableBody, 5);
    const startDate = expenseStartDateInput.value;
    const endDate = expenseEndDateInput.value;
    const url = `${BACKEND_API_URL}/expenses?startDate=${startDate}&endDate=${endDate}`;

    try {
        const expenses = await fetchData(url);
        if (expenses.length === 0) {
            return renderEmptyTableMessage(expensesTableBody, 'No expenses found for this period.', 5);
        }

        expensesTableBody.innerHTML = expenses.map(expense => `
            <tr>
                <td class="font-medium">${expense._id}</td>
                <td class="text-gray">${formatDateForInput(expense.date)}</td>
                <td class="text-gray">${expense.category}</td>
                <td class="text-gray">${expense.description}</td>
                <td class="text-gray">Ugshs${expense.amount.toFixed(2)}</td>
                <td class="table-actions">
                    ${checkUserRole(['admin']) ? `<button class="edit">Edit</button>` : ''}
                    ${checkUserRole(['admin']) ? `<button class="delete">Delete</button>` : ''}
                </td>
            </tr>
        `).join('');
    } catch (error) {
        renderEmptyTableMessage(expensesTableBody, 'Failed to load expenses.', 5);
    }
}

// Reports
generateReportBtn.addEventListener('click', generateReports);

async function generateReports() {
    if (!checkUserRole(['admin'])) return showMessageBox('You do not have permission to view reports.');

    const startDate = reportStartDateInput.value;
    const endDate = reportEndDateInput.value;
    if (!startDate || !endDate) {
        return showMessageBox('Please select both start and end dates.');
    }

    try {
        const reportData = await fetchData(`${BACKEND_API_URL}/reports/financial?startDate=${startDate}&endDate=${endDate}`);
        reportTotalSalesSpan.textContent = `Ugshs${reportData.totalSales.toFixed(2)}`;
        reportTotalExpensesSpan.textContent = `Ugshs${reportData.totalExpenses.toFixed(2)}`;
        reportNetBalanceSpan.textContent = `Ugshs${reportData.netProfit.toFixed(2)}`;
        reportNetBalanceSpan.style.color = reportData.netProfit >= 0 ? '#22c55e' : '#ef4444';

        renderReportSales(reportData.salesDetails);
        renderReportExpenses(reportData.expenseDetails);
    } catch (error) {
        // Handled by fetchData
    }
}

function renderReportSales(salesDetails) {
    reportSalesTableBody.innerHTML = '';
    if (salesDetails.length === 0) {
        return renderEmptyTableMessage(reportSalesTableBody, 'No sales data for this period.', 5);
    }
    reportSalesTableBody.innerHTML = salesDetails.map(transaction => `
        <tr>
            <td class="text-gray">${formatDateForInput(transaction.date)}</td>
            <td class="text-gray">${transaction.itemSold}</td>
            <td class="text-gray">${transaction.quantity}</td>
            <td class="text-gray">Ugshs${transaction.amount.toFixed(2)}</td>
            <td class="text-gray">Ugshs${transaction.profit.toFixed(2)}</td>
        </tr>
    `).join('');
}

function renderReportExpenses(expenseDetails) {
    reportExpensesTableBody.innerHTML = '';
    if (expenseDetails.length === 0) {
        return renderEmptyTableMessage(reportExpensesTableBody, 'No expense data for this period.', 4);
    }
    reportExpensesTableBody.innerHTML = expenseDetails.map(expense => `
        <tr>
            <td class="text-gray">${formatDateForInput(expense.date)}</td>
            <td class="text-gray">${expense.category}</td>
            <td class="text-gray">${expense.description}</td>
            <td class="text-gray">Ugshs${expense.amount.toFixed(2)}</td>
        </tr>
    `).join('');
}

// Menu Management
cancelMenuEditBtn.addEventListener('click', () => {
    menuForm.reset();
    menuItemIdInput.value = '';
    cancelMenuEditBtn.classList.add('hidden');
    currentRecipe = [];
    renderCurrentRecipe();
});

menuForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!checkUserRole(['admin'])) return showMessageBox('You do not have permission to perform this action.');

    const id = menuItemIdInput.value;
    const name = itemNameInput.value.trim();
    const price = parseFloat(itemPriceInput.value);
    const category = itemCategoryInput.value.trim();

    if (!name || isNaN(price) || price <= 0 || !category) {
        return showMessageBox('Please fill in all fields correctly.');
    }
    const payload = { name, price, category, recipe: currentRecipe };

    try {
        const method = id ? 'PUT' : 'POST';
        const url = id ? `${BACKEND_API_URL}/menu/${id}` : `${BACKEND_API_URL}/menu`;
        await fetchData(url, { method, body: JSON.stringify(payload) });

        showMessageBox(`Menu item ${id ? 'updated' : 'added'} successfully!`);
        menuForm.reset();
        menuItemIdInput.value = '';
        cancelMenuEditBtn.classList.add('hidden');
        currentRecipe = [];
        renderCurrentRecipe();
        await Promise.all([renderMenuItems(), renderOrderForm()]);
    } catch (error) {
        // Handled by fetchData
    }
});

menuItemsTableBody.addEventListener('click', (e) => {
    const row = e.target.closest('tr');
    if (!row) return;

    const itemId = row.querySelector('.font-medium').textContent;
    if (!checkUserRole(['admin'])) return;

    if (e.target.classList.contains('edit')) {
        const itemToEdit = allMenuItems.find(item => item._id === itemId);
        if (itemToEdit) openRecipeEditModal(itemToEdit);
    } else if (e.target.classList.contains('delete')) {
        deleteMenuItem(itemId);
    }
});

async function renderMenuItems() {
    showLoading(menuItemsTableBody, 6);
    try {
        allMenuItems = await fetchData(`${BACKEND_API_URL}/menu`);
        if (allMenuItems.length === 0) {
            return renderEmptyTableMessage(menuItemsTableBody, 'No menu items added yet.', 6);
        }

        menuItemsTableBody.innerHTML = allMenuItems.map(item => {
            const recipeDisplay = item.recipe?.length > 0 ?
                item.recipe.map(rItem => rItem.ingredient?.name || 'Unknown').join(', ') : 'N/A';

            return `
                <tr>
                    <td class="font-medium">${item._id}</td>
                    <td class="text-gray">${item.name}</td>
                    <td class="text-gray">${item.category}</td>
                    <td class="text-gray">Ugshs${item.price.toFixed(2)}</td>
                    <td class="text-gray">${recipeDisplay}</td>
                    <td class="table-actions">
                        ${checkUserRole(['admin']) ? `<button class="edit">Edit</button>` : ''}
                        ${checkUserRole(['admin']) ? `<button class="delete">Delete</button>` : ''}
                    </td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        renderEmptyTableMessage(menuItemsTableBody, 'Failed to load menu items.', 6);
    }
}

async function deleteMenuItem(id) {
    if (!checkUserRole(['admin'])) return showMessageBox('You do not have permission to perform this action.');
    try {
        await fetchData(`${BACKEND_API_URL}/menu/${id}`, { method: 'DELETE' });
        showMessageBox('Menu item deleted successfully!');
        await Promise.all([renderMenuItems(), renderOrderForm()]);
    } catch (error) {
        // Handled by fetchData
    }
}

async function populateRecipeIngredientSelect() {
    const selectElements = [recipeIngredientSelect, modalRecipeIngredientSelect];
    selectElements.forEach(select => select.innerHTML = '<option value="">-- Select Ingredient --</option>');
    try {
        allIngredients = await fetchData(`${BACKEND_API_URL}/inventory`);
        allIngredients.forEach(ingredient => {
            selectElements.forEach(select => {
                const option = document.createElement('option');
                option.value = ingredient._id;
                option.textContent = ingredient.name;
                select.appendChild(option);
            });
        });
    } catch (error) {
        // Handled by fetchData
    }
}

addRecipeIngredientBtn.addEventListener('click', () => {
    if (!checkUserRole(['admin'])) return showMessageBox('You do not have permission to add ingredients.');
    const selectedId = recipeIngredientSelect.value;
    if (!selectedId) return showMessageBox('Please select an ingredient.');

    const existingItem = currentRecipe.find(item => item.ingredient === selectedId);
    if (!existingItem) {
        currentRecipe.push({ ingredient: selectedId, quantityUsed: 1 }); // Default quantity
    }
    renderCurrentRecipe();
    recipeIngredientSelect.value = '';
});

currentRecipeList.addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-recipe-item')) {
        const index = e.target.dataset.index;
        if (checkUserRole(['admin'])) {
            currentRecipe.splice(index, 1);
            renderCurrentRecipe();
        } else {
            showMessageBox('You do not have permission to remove ingredients.');
        }
    }
});

function renderCurrentRecipe() {
    currentRecipeList.innerHTML = '';
    if (currentRecipe.length === 0) {
        return (currentRecipeList.innerHTML = `<li class="order-list-item">No ingredients added to recipe.</li>`);
    }

    currentRecipe.forEach((recipeItem, index) => {
        const ingredient = allIngredients.find(ing => ing._id === recipeItem.ingredient);
        if (ingredient) {
            currentRecipeList.innerHTML += `
                <li class="order-list-item">
                    <span>${ingredient.name}</span>
                    <button class="delete-recipe-item" data-index="${index}">&times;</button>
                </li>
            `;
        }
    });
}

// Modal Recipe Edit
modalAddIngredientBtn.addEventListener('click', () => {
    const selectedId = modalRecipeIngredientSelect.value;
    const quantity = parseFloat(modalRecipeQuantityUsedInput.value);

    if (!selectedId || isNaN(quantity) || quantity <= 0) {
        return showMessageBox('Please select an ingredient and enter a valid quantity.');
    }

    if (editingMenuItem) {
        const existingItem = editingMenuItem.recipe.find(item => item.ingredient._id === selectedId);
        if (existingItem) {
            existingItem.quantityUsed = quantity;
        } else {
            const ingredient = allIngredients.find(i => i._id === selectedId);
            editingMenuItem.recipe.push({ ingredient, quantityUsed: quantity });
        }
        renderModalRecipeTable(editingMenuItem.recipe);
    }
});

modalSaveBtn.addEventListener('click', async () => {
    if (!editingMenuItem) return;

    const name = modalItemNameInput.value.trim();
    const price = parseFloat(modalItemPriceInput.value);
    const category = modalItemCategoryInput.value.trim();

    if (!name || isNaN(price) || !category) return showMessageBox('Please fill out all fields correctly.');

    const updatedData = {
        name,
        price,
        category,
        recipe: editingMenuItem.recipe.map(r => ({
            ingredient: r.ingredient._id,
            quantityUsed: r.quantityUsed
        }))
    };

    try {
        await fetchData(`${BACKEND_API_URL}/menu/${editingMenuItem._id}`, {
            method: 'PUT',
            body: JSON.stringify(updatedData)
        });
        showMessageBox('Menu item updated successfully!');
        closeRecipeEditModal();
        await renderMenuItems();
    } catch (err) {
        showMessageBox('Error updating menu item.');
    }
});

modalCloseBtn.addEventListener('click', closeRecipeEditModal);

function openRecipeEditModal(item) {
    if (!checkUserRole(['admin'])) return showMessageBox('You do not have permission to edit menu items.');
    editingMenuItem = item;
    modalItemNameInput.value = item.name;
    modalItemPriceInput.value = item.price;
    modalItemCategoryInput.value = item.category;

    renderModalRecipeTable(item.recipe);
    recipeEditModal.classList.remove('hidden');
}

function closeRecipeEditModal() {
    editingMenuItem = null;
    recipeEditModal.classList.add('hidden');
}

function renderModalRecipeTable(recipeArray) {
    modalRecipeTableBody.innerHTML = '';
    recipeArray.forEach((rItem, index) => {
        const name = rItem.ingredient?.name || 'Unknown';
        const unit = rItem.ingredient?.unit || '';

        modalRecipeTableBody.innerHTML += `
            <tr>
                <td>${name}</td>
                <td><input type="number" min="0" step="0.01" value="${rItem.quantityUsed}" data-index="${index}" class="quantity-input"></td>
                <td>${unit}</td>
                <td><button class="delete delete-modal-item-btn" data-index="${index}">Delete</button></td>
            </tr>
        `;
    });
}

modalRecipeTableBody.addEventListener('change', (e) => {
    if (e.target.classList.contains('quantity-input')) {
        const index = e.target.dataset.index;
        const newQuantity = parseFloat(e.target.value);
        if (editingMenuItem?.recipe[index]) {
            editingMenuItem.recipe[index].quantityUsed = newQuantity;
        }
    }
});

modalRecipeTableBody.addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-modal-item-btn')) {
        const index = e.target.dataset.index;
        if (editingMenuItem) {
            editingMenuItem.recipe.splice(index, 1);
            renderModalRecipeTable(editingMenuItem.recipe);
        }
    }
});

// Audit Logs
async function renderAuditLogs() {
    if (!checkUserRole(['admin'])) {
        return renderEmptyTableMessage(auditLogsTableBody, 'You do not have permission to view audit logs.', 4);
    }
    showLoading(auditLogsTableBody, 4);

    try {
        const auditLogs = await fetchData(`${BACKEND_API_URL}/auditlogs`);
        if (auditLogs.length === 0) {
            return renderEmptyTableMessage(auditLogsTableBody, 'No audit logs found.', 4);
        }

        auditLogsTableBody.innerHTML = auditLogs.map(log => `
            <tr>
                <td class="text-gray">${formatDateForDisplay(log.timestamp)}</td>
                <td class="text-gray">${log.user}</td>
                <td class="text-gray">${log.action}</td>
                <td class="text-gray">${log.details}</td>
            </tr>
        `).join('');
    } catch (error) {
        renderEmptyTableMessage(auditLogsTableBody, 'Failed to load audit logs.', 4);
    }
}

// Initializer
document.addEventListener('DOMContentLoaded', async () => {
    const userRoleFromSession = sessionStorage.getItem('userRole');
    if (userRoleFromSession) {
        await initializeApp(userRoleFromSession);
    } else {
        loginPage.classList.remove('hidden');
        mainAppContainer.classList.add('hidden');
    }
});
