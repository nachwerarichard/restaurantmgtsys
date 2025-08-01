// server.js - Full Node.js Express application with MongoDB (Mongoose)

// Load environment variables from .env file
require('dotenv').config();

const express = require('express'); // Import Express framework
const mongoose = require('mongoose'); // Import Mongoose for MongoDB interaction
const cors = require('cors'); // Import CORS middleware for cross-origin requests

// Initialize Express app
const app = express();

// Middleware
app.use(express.json()); // Enable parsing of JSON request bodies
app.use(cors()); // Enable CORS for all routes, allowing frontend to connect

// --- Database Connection ---
const MONGODB_URI = process.env.MONGODB_URI; // Get MongoDB URI from environment variables

mongoose.connect(MONGODB_URI)
    .then(() => console.log('MongoDB connected successfully!')) // Success message
    .catch(err => {
        console.error('MongoDB connection error:', err); // Error message
        process.exit(1); // Exit process if database connection fails
    });

// --- MongoDB Schemas and Models ---

// Ingredient Schema
const ingredientSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, unique: true },
    quantity: { type: Number, required: true, min: 0, default: 0 }, // Current stock
    unit: { type: String, required: true, trim: true }, // e.g., kg, liter, pcs
    costPerUnit: { type: Number, required: true, min: 0 }
}, { timestamps: true });
const Ingredient = mongoose.model('Ingredient', ingredientSchema);

// MenuItem Schema
const menuItemSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, unique: true },
    price: { type: Number, required: true, min: 0 },
    category: { type: String, required: true, trim: true },
    // Embedded recipe: array of objects linking to Ingredient and quantity used
    recipe: [{
        ingredient: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient', required: true },
        quantityUsed: { type: Number, required: true, min: 0 }
    }]
}, { timestamps: true });
const MenuItem = mongoose.model('MenuItem', menuItemSchema);

// Expense Schema
const expenseSchema = new mongoose.Schema({
    date: { type: Date, required: true },
    category: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 }
}, { timestamps: true });
const Expense = mongoose.model('Expense', expenseSchema);

// Sale Schema
const saleSchema = new mongoose.Schema({
    date: { type: Date, required: true },
    itemSold: { type: String, required: true, trim: true }, // Name of the menu item sold
    quantity: { type: Number, required: true, min: 1 }, // Quantity of the menu item sold
    amount: { type: Number, required: true, min: 0 }, // Total sale amount for this item
    costOfGoods: { type: Number, required: true, min: 0 }, // Calculated cost of ingredients
    profit: { type: Number, required: true }, // Sale amount - cost of goods
    paymentMethod: { type: String, required: true, trim: true }
}, { timestamps: true });
const Sale = mongoose.model('Sale', saleSchema);

// KitchenOrder Schema
const kitchenOrderSchema = new mongoose.Schema({
    date: { type: Date, required: true },
    items: [{ // Array of items in the order
        menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
        quantity: { type: Number, required: true, min: 1 }
    }],
    totalAmount: { type: Number, required: true, min: 0 },
    status: { type: String, required: true, enum: ['New', 'Preparing', 'Ready', 'Cancelled'], default: 'New' }
}, { timestamps: true });
const KitchenOrder = mongoose.model('KitchenOrder', kitchenOrderSchema);


// --- Helper Functions ---

/**
 * Validates date range query parameters.
 * @param {string} startDateStr - Start date string (YYYY-MM-DD).
 * @param {string} endDateStr - End date string (YYYY-MM-DD).
 * @returns {object} An object with valid Date objects for start and end, or null if invalid.
 */
const validateDateRange = (startDateStr, endDateStr) => {
    let startDate = null;
    let endDate = null;

    if (startDateStr) {
        startDate = new Date(startDateStr + 'T00:00:00.000Z'); // UTC start of day
        if (isNaN(startDate.getTime())) {
            return { error: 'Invalid start date format' };
        }
    }
    if (endDateStr) {
        endDate = new Date(endDateStr + 'T23:59:59.999Z'); // UTC end of day
        if (isNaN(endDate.getTime())) {
            return { error: 'Invalid end date format' };
        }
    }

    if (startDate && endDate && startDate > endDate) {
        return { error: 'Start date cannot be after end date' };
    }
    return { startDate, endDate };
};

// --- Controllers (Logic for API Endpoints) ---

// --- Menu Item Controllers ---
const menuController = {
    getAllMenuItems: async (req, res) => {
        try {
            const menuItems = await MenuItem.find().populate('recipe.ingredient'); // Populate ingredient details
            res.status(200).json(menuItems);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },
    createMenuItem: async (req, res) => {
        const { name, price, category, recipe } = req.body;
        const newMenuItem = new MenuItem({ name, price, category, recipe });

        try {
            const savedMenuItem = await newMenuItem.save();
            // Populate the recipe ingredients before sending response
            const populatedMenuItem = await MenuItem.findById(savedMenuItem._id).populate('recipe.ingredient');
            res.status(201).json(populatedMenuItem);
        } catch (error) {
            if (error.code === 11000) { // Duplicate key error
                return res.status(409).json({ message: 'Menu item with this name already exists.' });
            }
            res.status(400).json({ message: error.message });
        }
    },
    updateMenuItem: async (req, res) => {
        const { id } = req.params;
        const { name, price, category, recipe } = req.body;

        try {
            const updatedMenuItem = await MenuItem.findByIdAndUpdate(
                id,
                { name, price, category, recipe },
                { new: true, runValidators: true }
            ).populate('recipe.ingredient');

            if (!updatedMenuItem) {
                return res.status(404).json({ message: 'Menu item not found' });
            }
            res.status(200).json(updatedMenuItem);
        } catch (error) {
            if (error.code === 11000) {
                return res.status(409).json({ message: 'Menu item with this name already exists.' });
            }
            res.status(400).json({ message: error.message });
        }
    },
    deleteMenuItem: async (req, res) => {
        const { id } = req.params;

        try {
            const deletedMenuItem = await MenuItem.findByIdAndDelete(id);
            if (!deletedMenuItem) {
                return res.status(404).json({ message: 'Menu item not found' });
            }
            res.status(200).json({ message: 'Menu item deleted successfully' });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
};

// --- Inventory Controllers ---
const inventoryController = {
    getAllIngredients: async (req, res) => {
        try {
            const ingredients = await Ingredient.find();
            res.status(200).json(ingredients);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },
    createIngredient: async (req, res) => {
        const { name, quantity, unit, costPerUnit } = req.body;
        const newIngredient = new Ingredient({ name, quantity, unit, costPerUnit });

        try {
            const savedIngredient = await newIngredient.save();
            res.status(201).json(savedIngredient);
        } catch (error) {
            if (error.code === 11000) {
                return res.status(409).json({ message: 'Ingredient with this name already exists.' });
            }
            res.status(400).json({ message: error.message });
        }
    },
    updateIngredient: async (req, res) => {
        const { id } = req.params;
        const { name, quantity, unit, costPerUnit } = req.body;

        try {
            const updatedIngredient = await Ingredient.findByIdAndUpdate(
                id,
                { name, quantity, unit, costPerUnit },
                { new: true, runValidators: true }
            );

            if (!updatedIngredient) {
                return res.status(404).json({ message: 'Ingredient not found' });
            }
            res.status(200).json(updatedIngredient);
        } catch (error) {
            if (error.code === 11000) {
                return res.status(409).json({ message: 'Ingredient with this name already exists.' });
            }
            res.status(400).json({ message: error.message });
        }
    },
    deleteIngredient: async (req, res) => {
        const { id } = req.params;

        try {
            const deletedIngredient = await Ingredient.findByIdAndDelete(id);
            if (!deletedIngredient) {
                return res.status(404).json({ message: 'Ingredient not found' });
            }
            res.status(200).json({ message: 'Ingredient deleted successfully' });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
};

// --- Expense Controllers ---
const expenseController = {
    getAllExpenses: async (req, res) => {
        const { startDate: startDateStr, endDate: endDateStr } = req.query;
        const { startDate, endDate, error } = validateDateRange(startDateStr, endDateStr);

        if (error) {
            return res.status(400).json({ message: error });
        }

        let query = {};
        if (startDate && endDate) {
            query.date = { $gte: startDate, $lte: endDate };
        } else if (startDate) {
            query.date = { $gte: startDate };
        } else if (endDate) {
            query.date = { $lte: endDate };
        }

        try {
            const expenses = await Expense.find(query).sort({ date: -1 }); // Sort by date descending
            res.status(200).json(expenses);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },
    createExpense: async (req, res) => {
        const { date, category, description, amount } = req.body;
        const newExpense = new Expense({ date, category, description, amount });

        try {
            const savedExpense = await newExpense.save();
            res.status(201).json(savedExpense);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    },
    updateExpense: async (req, res) => {
        const { id } = req.params;
        const { date, category, description, amount } = req.body;

        try {
            const updatedExpense = await Expense.findByIdAndUpdate(
                id,
                { date, category, description, amount },
                { new: true, runValidators: true }
            );

            if (!updatedExpense) {
                return res.status(404).json({ message: 'Expense not found' });
            }
            res.status(200).json(updatedExpense);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    },
    deleteExpense: async (req, res) => {
        const { id } = req.params;

        try {
            const deletedExpense = await Expense.findByIdAndDelete(id);
            if (!deletedExpense) {
                return res.status(404).json({ message: 'Expense not found' });
            }
            res.status(200).json({ message: 'Expense deleted successfully' });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
};

// --- Kitchen Order Controllers ---
const kitchenOrderController = {
    createKitchenOrder: async (req, res) => {
        const { items, totalAmount } = req.body; // items: [{ menuItemId, quantity }]

        if (!items || items.length === 0) {
            return res.status(400).json({ message: 'Order must contain items.' });
        }

        const orderItemsWithDetails = [];
        for (const item of items) {
            const menuItem = await MenuItem.findById(item.menuItemId);
            if (!menuItem) {
                return res.status(404).json({ message: `Menu item with ID ${item.menuItemId} not found.` });
            }
            orderItemsWithDetails.push({ menuItem: menuItem._id, quantity: item.quantity });
        }

        const newOrder = new KitchenOrder({
            date: new Date(),
            items: orderItemsWithDetails,
            totalAmount,
            status: 'New'
        });

        try {
            const savedOrder = await newOrder.save();
            // Populate menu item details for response
            const populatedOrder = await KitchenOrder.findById(savedOrder._id).populate('items.menuItem');
            res.status(201).json(populatedOrder);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    },

    getAllKitchenOrders: async (req, res) => {
        const { startDate: startDateStr, endDate: endDateStr } = req.query;
        const { startDate, endDate, error } = validateDateRange(startDateStr, endDateStr);

        if (error) {
            return res.status(400).json({ message: error });
        }

        let query = {};
        if (startDate && endDate) {
            query.date = { $gte: startDate, $lte: endDate };
        } else if (startDate) {
            query.date = { $gte: startDate };
        } else if (endDate) {
            query.date = { $lte: endDate };
        }

        try {
            const orders = await KitchenOrder.find(query)
                .populate('items.menuItem') // Populate menu item details
                .sort({ date: -1, createdAt: -1 }); // Sort by date and then creation time
            res.status(200).json(orders);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    markOrderReady: async (req, res) => {
        const { id } = req.params;

        try {
            const order = await KitchenOrder.findById(id).populate({
                path: 'items.menuItem',
                populate: {
                    path: 'recipe.ingredient' // Populate ingredients within the menu item's recipe
                }
            });

            if (!order) {
                return res.status(404).json({ message: 'Order not found' });
            }
            if (order.status === 'Ready' || order.status === 'Cancelled') {
                return res.status(400).json({ message: `Order is already ${order.status}. Cannot mark ready.` });
            }

            let totalOrderCostOfGoods = 0;
            const inventoryUpdates = [];
            const salesToRecord = [];
            const insufficientStockMessages = [];

            // --- Phase 1: Check Inventory Availability ---
            for (const orderItem of order.items) {
                const menuItem = orderItem.menuItem; // Already populated
                if (!menuItem) {
                    insufficientStockMessages.push(`Menu item with ID ${orderItem.menuItem._id} not found.`);
                    continue;
                }

                if (!menuItem.recipe || menuItem.recipe.length === 0) {
                    console.warn(`Warning: No recipe defined for menu item "${menuItem.name}". Cannot deduct inventory.`);
                    // Still allow sale, but cost of goods for this item will be 0
                    salesToRecord.push({
                        itemSold: menuItem.name,
                        quantity: orderItem.quantity,
                        amount: menuItem.price * orderItem.quantity,
                        costOfGoods: 0,
                        profit: menuItem.price * orderItem.quantity,
                        paymentMethod: 'Kitchen Order'
                    });
                    continue;
                }

                let itemCostOfGoods = 0;
                for (const recipeItem of menuItem.recipe) {
                    const ingredient = recipeItem.ingredient; // Already populated
                    if (!ingredient) {
                        insufficientStockMessages.push(`Ingredient with ID ${recipeItem.ingredient._id} for "${menuItem.name}" not found.`);
                        continue;
                    }

                    const requiredQuantity = recipeItem.quantityUsed * orderItem.quantity;
                    if (ingredient.quantity < requiredQuantity) {
                        insufficientStockMessages.push(
                            `Insufficient stock for "${ingredient.name}" (needed for "${menuItem.name}"). ` +
                            `Needed: ${requiredQuantity.toFixed(2)} ${ingredient.unit}, ` +
                            `Available: ${ingredient.quantity.toFixed(2)} ${ingredient.unit}.`
                        );
                    }
                }
            }

            if (insufficientStockMessages.length > 0) {
                return res.status(400).json({
                    message: 'Cannot mark order ready due to insufficient inventory.',
                    details: insufficientStockMessages
                });
            }

            // --- Phase 2: Deduct Inventory and Calculate Costs (if Phase 1 passed) ---
            for (const orderItem of order.items) {
                const menuItem = orderItem.menuItem;
                let itemCostOfGoods = 0;

                if (menuItem.recipe && menuItem.recipe.length > 0) {
                    for (const recipeItem of menuItem.recipe) {
                        const ingredient = recipeItem.ingredient;
                        const requiredQuantity = recipeItem.quantityUsed * orderItem.quantity;

                        // Add to batch update for ingredients
                        inventoryUpdates.push({
                            id: ingredient._id,
                            deductQuantity: requiredQuantity
                        });
                        itemCostOfGoods += requiredQuantity * ingredient.costPerUnit;
                    }
                }

                const itemSaleAmount = menuItem.price * orderItem.quantity;
                salesToRecord.push({
                    itemSold: menuItem.name,
                    quantity: orderItem.quantity,
                    amount: itemSaleAmount,
                    costOfGoods: itemCostOfGoods,
                    profit: itemSaleAmount - itemCostOfGoods,
                    paymentMethod: 'Kitchen Order'
                });
                totalOrderCostOfGoods += itemCostOfGoods;
            }

            // --- Phase 3: Perform Database Updates in a Transaction (for atomicity) ---
            const session = await mongoose.startSession();
            session.startTransaction();

            try {
                // Update ingredients
                for (const update of inventoryUpdates) {
                    await Ingredient.findByIdAndUpdate(
                        update.id,
                        { $inc: { quantity: -update.deductQuantity } }, // Decrement quantity
                        { session }
                    );
                }

                // Record sales
                await Sale.insertMany(salesToRecord, { session });

                // Update order status
                order.status = 'Ready';
                await order.save({ session });

                await session.commitTransaction();
                res.status(200).json({ message: `Order ${id} marked as Ready! Inventory updated and sales recorded.`, order });

            } catch (transactionError) {
                await session.abortTransaction();
                console.error('Transaction failed:', transactionError);
                res.status(500).json({ message: 'Failed to process order. Transaction aborted.', error: transactionError.message });
            } finally {
                session.endSession();
            }

        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    cancelKitchenOrder: async (req, res) => {
        const { id } = req.params;

        try {
            const order = await KitchenOrder.findById(id);
            if (!order) {
                return res.status(404).json({ message: 'Order not found' });
            }
            if (order.status === 'Ready' || order.status === 'Cancelled') {
                return res.status(400).json({ message: `Order is already ${order.status}. Cannot cancel.` });
            }

            order.status = 'Cancelled';
            const updatedOrder = await order.save();
            res.status(200).json({ message: `Order ${id} has been cancelled.`, order: updatedOrder });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
};

// --- Sales Controllers ---
const salesController = {
    getAllSales: async (req, res) => {
        const { startDate: startDateStr, endDate: endDateStr } = req.query;
        const { startDate, endDate, error } = validateDateRange(startDateStr, endDateStr);

        if (error) {
            return res.status(400).json({ message: error });
        }

        let query = {};
        if (startDate && endDate) {
            query.date = { $gte: startDate, $lte: endDate };
        } else if (startDate) {
            query.date = { $gte: startDate };
        } else if (endDate) {
            query.date = { $lte: endDate };
        }

        try {
            const sales = await Sale.find(query).sort({ date: -1, createdAt: -1 });
            res.status(200).json(sales);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
};

// --- Report Controllers ---
const reportController = {
    generateFinancialReport: async (req, res) => {
        const { startDate: startDateStr, endDate: endDateStr } = req.query;
        const { startDate, endDate, error } = validateDateRange(startDateStr, endDateStr);

        if (error) {
            return res.status(400).json({ message: error });
        }

        let salesQuery = {};
        let expenseQuery = {};

        if (startDate && endDate) {
            salesQuery.date = { $gte: startDate, $lte: endDate };
            expenseQuery.date = { $gte: startDate, $lte: endDate };
        } else if (startDate) {
            salesQuery.date = { $gte: startDate };
            expenseQuery.date = { $gte: startDate };
        } else if (endDate) {
            salesQuery.date = { $lte: endDate };
            expenseQuery.date = { $lte: endDate };
        }

        try {
            const sales = await Sale.find(salesQuery);
            const expenses = await Expense.find(expenseQuery);

            const totalSalesAmount = sales.reduce((sum, s) => sum + s.amount, 0);
            const totalCostOfGoods = sales.reduce((sum, s) => sum + s.costOfGoods, 0);
            const totalExpensesAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

            const netProfit = totalSalesAmount - totalCostOfGoods - totalExpensesAmount;

            res.status(200).json({
                startDate: startDateStr,
                endDate: endDateStr,
                totalSales: totalSalesAmount,
                totalCostOfGoods: totalCostOfGoods,
                totalExpenses: totalExpensesAmount,
                netProfit: netProfit,
                salesDetails: sales,
                expenseDetails: expenses
            });

        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
};


// --- API Routes ---
app.get('/api/ingredients', async (req, res) => {
    try {
        const ingredients = await Ingredient.find();
        res.json(ingredients);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch ingredients' });
    }
});
app.get('/menu/:id', async (req, res) => {
    const menuItem = await MenuItem.findById(req.params.id);
    if (!menuItem) return res.status(404).send('Not found');
    res.json(menuItem);
});


// Basic route for testing the server
app.get('/', (req, res) => {
    res.send('Restaurant Management Backend API is running!');
});

// Menu Item Routes
app.get('/api/menu', menuController.getAllMenuItems);
app.post('/api/menu', menuController.createMenuItem);
app.put('/api/menu/:id', menuController.updateMenuItem);
app.delete('/api/menu/:id', menuController.deleteMenuItem);

// Inventory Routes
app.get('/api/inventory', inventoryController.getAllIngredients);
app.post('/api/inventory', inventoryController.createIngredient);
app.put('/api/inventory/:id', inventoryController.updateIngredient);
app.delete('/api/inventory/:id', inventoryController.deleteIngredient);

// Expense Routes
app.get('/api/expenses', expenseController.getAllExpenses);
app.post('/api/expenses', expenseController.createExpense);
app.put('/api/expenses/:id', expenseController.updateExpense);
app.delete('/api/expenses/:id', expenseController.deleteExpense);

// Kitchen Order Routes
app.post('/api/kitchen-orders', kitchenOrderController.createKitchenOrder);
app.get('/api/kitchen-orders', kitchenOrderController.getAllKitchenOrders);
app.put('/api/kitchen-orders/:id/ready', kitchenOrderController.markOrderReady); // Specific action route
app.put('/api/kitchen-orders/:id/cancel', kitchenOrderController.cancelKitchenOrder); // Specific action route

// Sales Routes (Sales are primarily generated by kitchen orders, so read-only for frontend)
app.get('/api/sales', salesController.getAllSales);

// Report Routes
app.get('/api/reports/financial', reportController.generateFinancialReport);


// --- Global Error Handling Middleware ---
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong on the server!', error: err.message });
});

// --- Start the Server ---
const PORT = process.env.PORT || 5000; // Use port from .env or default to 5000
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Access API at http://localhost:${PORT}/api`);
});
