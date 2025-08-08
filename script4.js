// script.js - Full Restaurant Management Frontend with Session Authentication

// --- Configuration & In-memory state ---
const BACKEND_API_URL = 'https://restaurantmgtsys.onrender.com/api';
const POLLING_INTERVAL = 10000; // 10 seconds for polling (adjust as needed)

let currentUser = null; // To store the logged-in user's info and role
let allMenuItems = []; // To store fetched menu items for order dropdowns
let allIngredients = []; // To store fetched ingredients for recipe dropdown
let currentOrder = []; // In-memory state for the current customer order
let currentRecipe = []; // In-memory array for the recipe being built for a menu item

// Notification related state
let lastKitchenOrderCount = 0;
let lastWaiterOrderStatuses = new Map(); // Map to store {orderId: status} for waiter notifications
let kitchenPollingIntervalId = null;
let waiterPollingIntervalId = null;

// Tone.js Synth for notifications
const synth = new Tone.Synth().toDestination();

// --- DOM Elements ---
const navLinks = document.querySelectorAll('.nav-link');
const contentSections = document.querySelectorAll('.content-section');
const currentSectionTitle = document.getElementById('current-section-title');

// Mobile menu elements
const menuToggle = document.getElementById('menu-toggle');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const logoutBtn = document.getElementById('logout-btn');

// Login section elements (NEW)
const loginSection = document.getElementById('login-section');
const loginForm = document.getElementById('login-form');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');

// Message Box
const messageBox = document.getElementById('message-box');
const messageText = document.getElementById('message-text');
const messageOkBtn = document.getElementById('message-ok-btn');

// All other section-specific elements (e.g., from your original code)
const orderMenuItemSelect = document.getElementById('order-menu-item');
const orderQuantityInput = document.getElementById('order-quantity');
const addToOrderBtn = document.getElementById('add-to-order-btn');
const currentOrderList = document.getElementById('current-order-list');
const currentOrderTotalSpan = document.getElementById('current-order-total');
const placeOrderBtn = document.getElementById('place-order-btn');
const kitchenOrdersTableBody = document.getElementById('kitchen-orders-table-body');
const kitchenStartDateInput = document.getElementById('kitchen-start-date');
const kitchenEndDateInput = document.getElementById('kitchen-end-date');
const filterKitchenBtn = document.getElementById('filter-kitchen-btn');
const salesTransactionsTableBody = document.getElementById('sales-transactions-table-body');
const salesStartDateInput = document.getElementById('sales-start-date');
const salesEndDateInput = document.getElementById('sales-end-date');
const filterSalesBtn = document.getElementById('filter-sales-btn');
const inventoryForm = document.getElementById('inventory-form');
const ingredientIdInput = document.getElementById('ingredient-id');
const ingredientNameInput = document.getElementById('ingredient-name');
const ingredientQuantityInput = document.getElementById('ingredient-quantity');
const ingredientUnitInput = document.getElementById('ingredient-unit');
const ingredientCostPerUnitInput = document.getElementById('ingredient-cost-per-unit');
const ingredientSpoilageInput = document.getElementById('ingredient-spoilage');
const inventoryItemsTableBody = document.getElementById('inventory-items-table-body');
const cancelIngredientEditBtn = document.getElementById('cancel-ingredient-edit-btn');
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
const reportStartDateInput = document.getElementById('report-start-date');
const reportEndDateInput = document.getElementById('report-end-date');
const generateReportBtn = document.getElementById('generate-report-btn');
const reportTotalSalesSpan = document.getElementById('report-total-sales');
const reportTotalExpensesSpan = document.getElementById('report-total-expenses');
const reportNetBalanceSpan = document.getElementById('report-net-balance');
const reportSalesTableBody = document.getElementById('report-sales-table-body');
const reportExpensesTableBody = document.getElementById('report-expenses-table-body');
const menuForm = document.getElementById('menu-form');
const menuItemIdInput = document.getElementById('menu-item-id');
const itemNameInput = document.getElementById('item-name');
const itemPriceInput = document.getElementById('item-price');
const itemCategoryInput = document.getElementById('item-category');
const menuItemsTableBody = document.getElementById('menu-items-table-body');
const cancelMenuEditBtn = document.getElementById('cancel-menu-edit-btn');
const recipeIngredientSelect = document.getElementById('recipe-ingredient-select');
const recipeQuantityUsedInput = document.getElementById('recipe-quantity-used');
const addRecipeIngredientBtn = document.getElementById('add-recipe-ingredient-btn');
const currentRecipeList = document.getElementById('current-recipe-list');


// --- Helper Functions ---

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

// Event listener for the OK button in the message box
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
 * Handles API fetch requests with session credentials.
 * @param {string} url - The API endpoint URL.
 * @param {object} options - Fetch options (method, headers, body).
 * @returns {Promise<object>} The JSON response data.
 * @throws {Error} If the network request fails or the server returns an error.
 */
async function fetchData(url, options = {}) {
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            credentials: 'include' // Crucial for sending cookies
        });

        if (response.status === 401) {
            // If Unauthorized, force logout and show login screen
            console.warn("Unauthorized access. Logging out.");
            await logout();
            throw new Error('Authentication expired. Please log in again.');
        }
        
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

// --- UI Management ---

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
    if (!currentUser) {
        return; // Do nothing if not logged in
    }

    hideAllSections();
    stopAllPolling();

    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.remove('hidden');
        targetSection.classList.add('active');
        currentSectionTitle.textContent = targetSection.querySelector('h2') ? targetSection.querySelector('h2').textContent : sectionId.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }

    // Special handling for sections that need data refresh and activate polling
    if (sectionId === 'order-management') {
        await renderOrderForm();
        renderCurrentOrder();
        await checkOrderReadyForWaiter();
        waiterPollingIntervalId = setInterval(checkOrderReadyForWaiter, POLLING_INTERVAL);
    } else if (sectionId === 'kitchen') {
        await renderKitchenOrders();
        await checkNewOrdersForChef();
        kitchenPollingIntervalId = setInterval(checkNewOrdersForChef, POLLING_INTERVAL);
        messageBox.classList.add('hidden');
    } else if (sectionId === 'sales') {
        await renderSalesTransactions();
        messageBox.classList.add('hidden');
    } else if (sectionId === 'inventory-management') {
        await renderInventoryItems();
        messageBox.classList.add('hidden');
    } else if (sectionId === 'expenses') {
        await renderExpenses();
        messageBox.classList.add('hidden');
    } else if (sectionId === 'reports') {
        if (!reportStartDateInput.value || !reportEndDateInput.value) {
            reportEndDateInput.value = getTodayDate();
            reportStartDateInput.value = new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0];
        }
        await generateReports();
    } else if (sectionId === 'menu-management') {
        await renderMenuItems();
        await populateRecipeIngredientSelect();
        renderCurrentRecipe();
        messageBox.classList.add('hidden');
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
    const targetElement = event.currentTarget;

    if (!targetElement || !(targetElement instanceof HTMLElement)) {
        console.error("Clicked element is not a valid HTML element:", targetElement);
        return;
    }

    // New logic: Check if user has permission to view this section
    const requiredRole = targetElement.dataset.role;
    if (requiredRole && currentUser && currentUser.role !== 'admin') {
        showMessageBox("You do not have permission to view this section.");
        return;
    }

    await showSection(targetElement.dataset.section);
    navLinks.forEach(link => {
        if (link && link instanceof HTMLElement) {
            link.classList.remove('active');
        }
    });
    targetElement.classList.add('active');
}

// Add event listeners to navigation links
navLinks.forEach(link => {
    link.addEventListener('click', handleNavLinkClick);
});

// --- Mobile Menu Toggle Logic ---
menuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('active');
    sidebarOverlay.classList.toggle('active');
});

sidebarOverlay.addEventListener('click', () => {
    sidebar.classList.remove('active');
    sidebarOverlay.classList.remove('active');
});


// --- Authentication Functions (NEW) ---

/**
 * Updates the UI based on the current user's authentication status and role.
 */
function updateUIForUserRole() {
    const mainContent = document.getElementById('main-content');
    if (currentUser) {
        loginSection.classList.add('hidden');
        mainContent.classList.remove('hidden');
        logoutBtn.classList.remove('hidden');
        document.getElementById('welcome-message').textContent = `Welcome, ${currentUser.username} (${currentUser.role})!`;

        // Hide all nav links initially
        navLinks.forEach(link => link.classList.add('hidden'));

        // Show links based on role
        if (currentUser.role === 'admin') {
            document.querySelectorAll('[data-role="admin"], [data-role="waitress"]').forEach(link => link.classList.remove('hidden'));
        } else if (currentUser.role === 'waitress') {
            document.querySelectorAll('[data-role="waitress"]').forEach(link => link.classList.remove('hidden'));
        }

        // Redirect to the first available section
        let firstLink = document.querySelector('.nav-link:not(.hidden)');
        if (firstLink) {
            firstLink.classList.add('active');
            showSection(firstLink.dataset.section);
        }

    } else {
        loginSection.classList.remove('hidden');
        mainContent.classList.add('hidden');
        logoutBtn.classList.add('hidden');
        stopAllPolling();
        loginForm.reset();
    }
}

/**
 * Handles the login form submission.
 */
loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const username = usernameInput.value;
    const password = passwordInput.value;
    try {
        const response = await fetchData(`${BACKEND_API_URL}/auth/login`, {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        currentUser = response.user;
        updateUIForUserRole();
        showMessageBox('Login successful!');
    } catch (error) {
        // Error handled by fetchData
    }
});

/**
 * Handles the logout button click.
 */
logoutBtn.addEventListener('click', logout);

async function logout() {
    try {
        await fetchData(`${BACKEND_API_URL}/auth/logout`, {
            method: 'POST'
        });
        currentUser = null;
        updateUIForUserRole();
        showMessageBox('Logged out successfully!');
    } catch (error) {
        // If logout fails on the server, we still clear the client-side state
        currentUser = null;
        updateUIForUserRole();
        console.error('Logout failed on the server, but client state cleared.', error);
    }
}


// --- Order Management Functions ---

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
    orderMenuItemSelect.value = '';
    orderQuantityInput.value = '1';
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
                items: currentOrder,
                totalAmount: totalOrderAmount
            })
        });
        showMessageBox(`Order ${newOrder._id} placed successfully! It has been sent to the kitchen.`);
        currentOrder = [];
        renderCurrentOrder();
    } catch (error) {
        // Error handled by fetchData
    }
});


// --- Kitchen Management Functions ---

/**
 * Renders kitchen orders in the table by fetching from backend.
 */
async function renderKitchenOrders() {
    kitchenOrdersTableBody.innerHTML = '';
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
                return `${item.menuItem ? item.menuItem.name : 'Unknown Item'} x ${item.quantity}`;
            }).join(', ');

            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="font-medium">${order._id.substring(order._id.length - 4)}</td>
                <td class="text-gray">${formatDateForInput(order.date)}</td>
                <td class="text-gray">${itemsList}</td>
                <td class="text-gray">Ugshs${order.totalAmount.toFixed(2)}</td>
                <td>
                    <span class="status-badge ${order.status.toLowerCase()}">
                        ${order.status}
                    </span>
                </td>
                <td class="table-actions">
                    ${(order.status === 'New' || order.status === 'Preparing') ?
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
 * Checks for new orders for the chef notification.
 */
async function checkNewOrdersForChef() {
    try {
        const orders = await fetchData(`${BACKEND_API_URL}/kitchen-orders`);
        const newOrderCount = orders.filter(order => order.status === 'New').length;

        if (lastKitchenOrderCount > 0 && newOrderCount > lastKitchenOrderCount) {
            showMessageBox(`New Order Alert! You have ${newOrderCount - lastKitchenOrderCount} new order(s) to prepare.`);
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
    try {
        const response = await fetchData(`${BACKEND_API_URL}/kitchen-orders/${orderId}/ready`, {
            method: 'PUT'
        });
        showMessageBox(response.message);
        await renderKitchenOrders();
    } catch (error) {
        // Error handled by fetchData
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
        await renderKitchenOrders();
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
    salesTransactionsTableBody.innerHTML = '';
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
                <td class="font-medium">${transaction._id.substring(transaction._id.length - 4)}</td>
                <td class="text-gray">${formatDateForInput(transaction.date)}</td>
                <td class="text-gray">${transaction.itemSold}</td>
                <td class="text-gray">${transaction.quantity}</td>
                <td class="text-gray">Ugshs${transaction.amount.toFixed(2)}</td>
                <td class="text-gray">Ugshs${transaction.costOfGoods.toFixed(2)}</td>
                <td class="text-gray">Ugshs${transaction.profit.toFixed(2)}</td>
                <td class="text-gray">${transaction.paymentMethod}</td>
                <td class="table-actions">
                    <button class="view-details">View Only</button>
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
    inventoryItemsTableBody.innerHTML = '';
    try {
        allIngredients = await fetchData(`${BACKEND_API_URL}/inventory`);
        if (allIngredients.length === 0) {
            inventoryItemsTableBody.innerHTML = `<tr><td colspan="8" class="table-empty-state">No inventory items added yet.</td></tr>`;
            return;
        }
        allIngredients.forEach(item => {
            const totalValue = item.quantity * item.costPerUnit;
            const row = document.createElement('tr');
            const actionButtons = (currentUser && currentUser.role === 'admin') ?
                `<button onclick="editInventoryItem('${item._id}')" class="edit">Edit</button>
                <button onclick="deleteInventoryItem('${item._id}')" class="delete">Delete</button>` :
                `<button disabled>No Actions</button>`;
            
            row.innerHTML = `
                <td class="font-medium">${item._id.substring(item._id.length - 4)}</td>
                <td class="text-gray">${item.name}</td>
                <td class="text-gray">${item.quantity.toFixed(2)}</td>
                <td class="text-gray">${item.unit}</td>
                <td class="text-gray">Ugshs${item.costPerUnit.toFixed(2)}</td>
                <td class="text-gray">${item.spoilage}</td>
                <td class="text-gray">Ugshs${totalValue.toFixed(2)}</td>
                <td class="table-actions">${actionButtons}</td>
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

    if (currentUser.role !== 'admin') {
        showMessageBox("You do not have permission to modify inventory.");
        return;
    }

    const id = ingredientIdInput.value;
    const name = ingredientNameInput.value.trim();
    const quantity = parseFloat(ingredientQuantityInput.value);
    const unit = ingredientUnitInput.value.trim();
    const costPerUnit = parseFloat(ingredientCostPerUnitInput.value);
    const spoilage = parseFloat(ingredientSpoilageInput.value);


    if (!name || isNaN(quantity) || quantity < 0 || isNaN(spoilage) || !unit || isNaN(costPerUnit) || costPerUnit < 0) {
        showMessageBox('Please fill in all fields correctly for inventory item.');
        return;
    }

    const payload = { name, quantity, unit, costPerUnit, spoilage };

    try {
        if (id) {
            await fetchData(`${BACKEND_API_URL}/inventory/${id}`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });
            showMessageBox('Inventory item updated successfully!');
        } else {
            await fetchData(`${BACKEND_API_URL}/inventory`, {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            showMessageBox('New inventory item added successfully!');
        }

        inventoryForm.reset();
        ingredientIdInput.value = '';
        cancelIngredientEditBtn.classList.add('hidden');
        await renderInventoryItems();
        await populateRecipeIngredientSelect();
    } catch (error) {
        // Error handled by fetchData
    }
});

/**
 * Populates the form with data for editing an inventory item.
 * @param {string} id - The ID of the inventory item to edit.
 */
window.editInventoryItem = async (id) => {
    if (currentUser.role !== 'admin') {
        showMessageBox("You do not have permission to edit inventory items.");
        return;
    }
    try {
        allIngredients = await fetchData(`${BACKEND_API_URL}/inventory`);
        const itemToEdit = allIngredients.find(item => item._id === id);
        if (itemToEdit) {
            ingredientIdInput.value = itemToEdit._id;
            ingredientNameInput.value = itemToEdit.name;
            ingredientQuantityInput.value = itemToEdit.quantity;
            ingredientUnitInput.value = itemToEdit.unit;
            ingredientCostPerUnitInput.value = itemToEdit.costPerUnit;
            ingredientSpoilageInput.value = itemToEdit.spoilage;
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
    if (currentUser.role !== 'admin') {
        showMessageBox("You do not have permission to delete inventory items.");
        return;
    }
    try {
        await fetchData(`${BACKEND_API_URL}/inventory/${id}`, {
            method: 'DELETE'
        });
        showMessageBox('Inventory item deleted successfully!');
        await renderInventoryItems();
        await populateRecipeIngredientSelect();
    } catch (error) {
        // Error handled by fetchData
    }
};


// --- Expenses Management Functions (CRUD) ---

/**
 * Renders the expenses in the table by fetching from backend.
 */
async function renderExpenses() {
    expensesTableBody.innerHTML = '';
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
            const actionButtons = (currentUser && currentUser.role === 'admin') ?
                `<button onclick="editExpense('${expense._id}')" class="edit">Edit</button>
                <button onclick="deleteExpense('${expense._id}')" class="delete">Delete</button>` :
                `<button disabled>No Actions</button>`;
            row.innerHTML = `
                <td class="font-medium">${formatDateForInput(expense.date)}</td>
                <td class="text-gray">${expense.category}</td>
                <td class="text-gray">${expense.description}</td>
                <td class="text-gray">Ugshs${expense.amount.toFixed(2)}</td>
                <td class="table-actions">${actionButtons}</td>
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

    if (currentUser.role !== 'admin') {
        showMessageBox("You do not have permission to modify expenses.");
        return;
    }

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
            await fetchData(`${BACKEND_API_URL}/expenses/${id}`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });
            showMessageBox('Expense updated successfully!');
        } else {
            await fetchData(`${BACKEND_API_URL}/expenses`, {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            showMessageBox('New expense added successfully!');
        }

        expenseForm.reset();
        expenseIdInput.value = '';
        cancelExpenseEditBtn.classList.add('hidden');
        await renderExpenses();
        await generateReports();
    } catch (error) {
        // Error handled by fetchData
    }
});

/**
 * Populates the form with data for editing an expense.
 * @param {string} id - The ID of the expense to edit.
 */
window.editExpense = async (id) => {
    if (currentUser.role !== 'admin') {
        showMessageBox("You do not have permission to edit expenses.");
        return;
    }
    try {
        const expenses = await fetchData(`${BACKEND_API_URL}/expenses`);
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
    } catch (error) {
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
    if (currentUser.role !== 'admin') {
        showMessageBox("You do not have permission to delete expenses.");
        return;
    }
    try {
        await fetchData(`${BACKEND_API_URL}/expenses/${id}`, {
            method: 'DELETE'
        });
        showMessageBox('Expense deleted successfully!');
        await renderExpenses();
        await generateReports();
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

        reportTotalSalesSpan.textContent = `Ugshs${reportData.totalSales.toFixed(2)}`;
        reportTotalExpensesSpan.textContent = `Ugshs${reportData.totalExpenses.toFixed(2)}`;
        reportNetBalanceSpan.textContent = `Ugshs${reportData.netProfit.toFixed(2)}`;
        reportNetBalanceSpan.style.color = reportData.netProfit >= 0 ? '#22c55e' : '#ef4444';

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
                    <td class="text-gray">Ugshs${transaction.amount.toFixed(2)}</td>
                    <td class="text-gray">Ugshs${transaction.profit.toFixed(2)}</td>
                `;
                reportSalesTableBody.appendChild(row);
            });
        }

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
                    <td class="text-gray">Ugshs${expense.amount.toFixed(2)}</td>
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
 * Populates the recipe ingredient select dropdown with all available ingredients.
 */
async function populateRecipeIngredientSelect() {
    recipeIngredientSelect.innerHTML = '<option value="">-- Select Ingredient --</option>';
    try {
        allIngredients.forEach(ingredient => {
            const option = document.createElement('option');
            option.value = ingredient._id;
            option.textContent = `${ingredient.name} (${ingredient.unit})`;
            recipeIngredientSelect.appendChild(option);
        });
    } catch (error) {
        // Error handled by fetchData
    }
}

/**
 * Renders the current recipe list (in-memory) for the menu item being edited/added.
 */
function renderCurrentRecipe() {
    currentRecipeList.innerHTML = '';
    if (currentRecipe.length === 0) {
        currentRecipeList.innerHTML = `<li class="order-list-item">No ingredients added to recipe.</li>`;
    } else {
        currentRecipe.forEach((recipeItem, index) => {
            const ingredient = allIngredients.find(ing => ing._id === recipeItem.ingredient);
            if (ingredient) {
                const listItem = document.createElement('li');
                listItem.classList.add('order-list-item');
                listItem.innerHTML = `
                    <span>${ingredient.name}: ${recipeItem.quantityUsed.toFixed(2)} ${ingredient.unit}</span>
                    <button onclick="removeRecipeIngredient(${index})">&times;</button>
                `;
                currentRecipeList.appendChild(listItem);
            }
        });
    }
}

/**
 * Adds an ingredient to the current menu item's recipe (in-memory).
 */
addRecipeIngredientBtn.addEventListener('click', () => {
    const selectedIngredientId = recipeIngredientSelect.value;
    const quantityUsed = parseFloat(recipeQuantityUsedInput.value);

    if (!selectedIngredientId || isNaN(quantityUsed) || quantityUsed <= 0) {
        showMessageBox('Please select an ingredient and enter a valid quantity used.');
        return;
    }

    const existingRecipeItemIndex = currentRecipe.findIndex(item => item.ingredient === selectedIngredientId);
    if (existingRecipeItemIndex > -1) {
        currentRecipe[existingRecipeItemIndex].quantityUsed += quantityUsed;
    } else {
        currentRecipe.push({ ingredient: selectedIngredientId, quantityUsed: quantityUsed });
    }

    renderCurrentRecipe();
    recipeIngredientSelect.value = '';
    recipeQuantityUsedInput.value = '0';
});

/**
 * Removes an ingredient from the current menu item's recipe (in-memory).
 * @param {number} index - The index of the recipe ingredient to remove.
 */
window.removeRecipeIngredient = (index) => {
    currentRecipe.splice(index, 1);
    renderCurrentRecipe();
};

/**
 * Renders the menu items in the table by fetching from backend.
 */
async function renderMenuItems() {
    menuItemsTableBody.innerHTML = '';
    try {
        const menuItems = await fetchData(`${BACKEND_API_URL}/menu`);

        if (menuItems.length === 0) {
            menuItemsTableBody.innerHTML = `<tr><td colspan="6" class="table-empty-state">No menu items added yet.</td></tr>`;
            return;
        }
        menuItems.forEach(item => {
            const recipeDisplay = item.recipe && item.recipe.length > 0
                ? item.recipe.map(rItem => {
                    const ingredientName = rItem.ingredient?.name || 'Unknown';
                    const ingredientUnit = rItem.ingredient?.unit || '';
                    return `${ingredientName} (${rItem.quantityUsed.toFixed(2)} ${ingredientUnit})`;
                }).join(', ')
                : 'N/A';

            const row = document.createElement('tr');
            const actionButtons = (currentUser && currentUser.role === 'admin') ?
                `<button onclick="openRecipeEditModal(${JSON.stringify(item).replace(/"/g, '&quot;')})" class="edit">Edit</button>
                <button onclick="deleteMenuItem('${item._id}')" class="delete">Delete</button>` :
                `<button disabled>No Actions</button>`;
            
            row.innerHTML = `
                <td class="font-medium">${item._id.substring(item._id.length - 4)}</td>
                <td class="text-gray">${item.name}</td>
                <td class="text-gray">${item.category}</td>
                <td class="text-gray">Ugshs${item.price.toFixed(2)}</td>
                <td class="text-gray">${recipeDisplay}</td>
                <td class="table-actions">${actionButtons}</td>
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

    if (currentUser.role !== 'admin') {
        showMessageBox("You do not have permission to modify menu items.");
        return;
    }

    const id = menuItemIdInput.value;
    const name = itemNameInput.value.trim();
    const price = parseFloat(itemPriceInput.value);
    const category = itemCategoryInput.value.trim();

    if (!name || isNaN(price) || price <= 0 || !category) {
        showMessageBox('Please fill in all fields correctly for menu item.');
        return;
    }

    const payload = {
        name,
        price,
        category,
        recipe: currentRecipe
    };

    try {
        if (id) {
            await fetchData(`${BACKEND_API_URL}/menu/${id}`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });
            showMessageBox('Menu item updated successfully!');
        } else {
            await fetchData(`${BACKEND_API_URL}/menu`, {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            showMessageBox('New menu item added successfully!');
        }

        menuForm.reset();
        menuItemIdInput.value = '';
        cancelMenuEditBtn.classList.add('hidden');
        currentRecipe = [];
        renderCurrentRecipe();
        await renderMenuItems();
        await renderOrderForm();
    } catch (error) {
        // Error handled by fetchData
    }
});

/**
 * Populates the form with data for editing a menu item.
 * @param {string} id - The ID of the menu item to edit.
 */
window.editMenuItem = async (id) => {
    if (currentUser.role !== 'admin') {
        showMessageBox("You do not have permission to edit menu items.");
        return;
    }
    try {
        const itemToEdit = await fetchData(`${BACKEND_API_URL}/menu/${id}`);
        if (itemToEdit) {
            menuItemIdInput.value = itemToEdit._id;
            itemNameInput.value = itemToEdit.name;
            itemPriceInput.value = itemToEdit.price;
            itemCategoryInput.value = itemToEdit.category;
            currentRecipe = itemToEdit.recipe.map(rItem => ({
                ingredient: rItem.ingredient._id,
                quantityUsed: rItem.quantityUsed
            }));
            renderCurrentRecipe();
            cancelMenuEditBtn.classList.remove('hidden');
            itemNameInput.focus();
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
    currentRecipe = [];
    renderCurrentRecipe();
});

/**
 * Deletes a menu item via backend API.
 * @param {string} id - The ID of the menu item to delete.
 */
window.deleteMenuItem = async (id) => {
    if (currentUser.role !== 'admin') {
        showMessageBox("You do not have permission to delete menu items.");
        return;
    }
    try {
        await fetchData(`${BACKEND_API_URL}/menu/${id}`, {
            method: 'DELETE'
        });
        showMessageBox('Menu item deleted successfully!');
        await renderMenuItems();
        await renderOrderForm();
    } catch (error) {
        // Error handled by fetchData
    }
};

/**
 * Checks for orders that have changed to 'Ready' status for waiter notification.
 */
async function checkOrderReadyForWaiter() {
    try {
        const orders = await fetchData(`${BACKEND_API_URL}/kitchen-orders`);
        let newReadyOrders = [];

        orders.forEach(order => {
            if (order.status === 'Ready' && lastWaiterOrderStatuses.get(order._id) !== 'Ready') {
                newReadyOrders.push(order._id);
            }
            lastWaiterOrderStatuses.set(order._id, order.status);
        });

        if (newReadyOrders.length > 0) {
            showMessageBox(`Order Ready! Order(s) ${newReadyOrders.join(', ')} are now ready for pickup.`);
        }
    } catch (error) {
        console.error("Error checking for ready orders:", error);
    }
}

let editingMenuItem = null;

function openRecipeEditModal(item) {
    if (currentUser.role !== 'admin') {
        showMessageBox("You do not have permission to edit menu items.");
        return;
    }
    editingMenuItem = item;
    document.getElementById('modal-item-name').value = item.name;
    document.getElementById('modal-item-price').value = item.price;
    document.getElementById('modal-item-category').value = item.category;

    renderModalRecipeTable(item.recipe);
    document.getElementById('recipe-edit-modal').classList.remove('hidden');
}

function closeRecipeEditModal() {
    editingMenuItem = null;
    document.getElementById('recipe-edit-modal').classList.add('hidden');
}

function renderModalRecipeTable(recipeArray) {
    const tbody = document.getElementById('modal-recipe-table-body');
    tbody.innerHTML = '';
    if (!recipeArray || recipeArray.length === 0) {
         tbody.innerHTML = `<tr><td colspan="4" class="table-empty-state">No recipe ingredients.</td></tr>`;
         return;
    }

    recipeArray.forEach((rItem, index) => {
        const ingredient = allIngredients.find(i => i._id === rItem.ingredient);
        const name = ingredient?.name || 'Unknown';
        const unit = ingredient?.unit || '';

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${name}</td>
            <td><input type="number" min="0" step="0.01" value="${rItem.quantityUsed}" onchange="updateIngredientQuantity(${index}, this.value)"></td>
            <td>${unit}</td>
            <td>
                <button onclick="deleteIngredientFromRecipe(${index})" class="delete">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function updateIngredientQuantity(index, newQuantity) {
    if (editingMenuItem && editingMenuItem.recipe[index]) {
        editingMenuItem.recipe[index].quantityUsed = parseFloat(newQuantity);
    }
}

function deleteIngredientFromRecipe(index) {
    if (editingMenuItem) {
        editingMenuItem.recipe.splice(index, 1);
        renderModalRecipeTable(editingMenuItem.recipe);
    }
}

async function saveEditedMenuItem() {
    if (!editingMenuItem) return;

    const name = document.getElementById('modal-item-name').value.trim();
    const price = parseFloat(document.getElementById('modal-item-price').value);
    const category = document.getElementById('modal-item-category').value.trim();

    if (!name || isNaN(price) || !category) {
        showMessageBox('Please fill out all fields correctly.');
        return;
    }

    const updatedData = {
        name,
        price,
        category,
        recipe: editingMenuItem.recipe.map(r => ({
            ingredient: r.ingredient,
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
}

// --- Initialization ---

/**
 * Checks for a pre-existing session on page load.
 */
async function checkSession() {
    try {
        // Attempt to fetch a protected route to see if a session is active
        const response = await fetch(`${BACKEND_API_URL}/menu`, {
            credentials: 'include'
        });
        if (response.ok) {
            // A session is active, get user info and update UI
            const userInfo = await response.json();
            const firstMenuItem = userInfo[0]; // Just to get some data
            if (firstMenuItem && firstMenuItem._id) {
              const userResponse = await fetchData(`${BACKEND_API_URL}/users/me`); // A new route to get user info by session
              currentUser = userResponse;
              updateUIForUserRole();
            } else {
              // Not a valid response, likely no session
              currentUser = null;
              updateUIForUserRole();
            }
        } else {
            // No active session
            currentUser = null;
            updateUIForUserRole();
        }
    } catch (error) {
        console.error("Session check failed:", error);
        currentUser = null;
        updateUIForUserRole();
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    // Set default dates for date inputs
    const today = getTodayDate();
    const thirtyDaysAgo = new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0];

    // Set all date inputs
    kitchenStartDateInput.value = thirtyDaysAgo;
    kitchenEndDateInput.value = today;
    salesStartDateInput.value = thirtyDaysAgo;
    salesEndDateInput.value = today;
    expenseStartDateInput.value = thirtyDaysAgo;
    expenseEndDateInput.value = today;
    reportStartDateInput.value = thirtyDaysAgo;
    reportEndDateInput.value = today;

    // Check if a user is already logged in from a previous session
    await checkSession();
});

