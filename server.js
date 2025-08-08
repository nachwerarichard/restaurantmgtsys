// server.js - Full Node.js Express application with MongoDB (Mongoose), Sessions, RBAC, and Audit Logging

// Load environment variables from .env file
require('dotenv').config();

const express = require('express'); // Import Express framework
const mongoose = require('mongoose'); // Import Mongoose for MongoDB interaction
const cors = require('cors'); // Import CORS middleware for cross-origin requests
const session = require('express-session'); // Import express-session for server-side sessions
const MongoStore = require('connect-mongo'); // Import connect-mongo to store sessions in MongoDB
const bcrypt = require('bcrypt'); // Import bcrypt for password hashing

// Initialize Express app
const app = express();

// Middleware
app.use(express.json()); // Enable parsing of JSON request bodies
app.use(cors({
    origin: 'http://localhost:3000', // Allow requests from your frontend
    credentials: true // Crucial for sending cookies
}));

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
    costPerUnit: { type: Number, required: true, min: 0 },
    spoilage: { type: Number, required: true, min: 0, default: 0 }, // Current stock
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
    date: {
        type: Date,
        default: Date.now,
        required: true
    },
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
    date: {
        type: Date,
        default: Date.now,
        required: true
    },
    items: [{ // Array of items in the order
        menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
        quantity: { type: Number, required: true, min: 1 }
    }],
    totalAmount: { type: Number, required: true, min: 0 },
    status: { type: String, required: true, enum: ['New', 'Preparing', 'Ready', 'Cancelled'], default: 'New' }
}, { timestamps: true });
const KitchenOrder = mongoose.model('KitchenOrder', kitchenOrderSchema);

// User Schema
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true }, // Stored as a hash
    role: { type: String, required: true, enum: ['admin', 'waitress'], default: 'waitress' }
}, { timestamps: true });
// Hash the password before saving the user
userSchema.pre('save', async function(next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
});
const User = mongoose.model('User', userSchema);

// AuditLog Schema
const auditLogSchema = new mongoose.Schema({
    timestamp: { type: Date, default: Date.now, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Reference to the user who performed the action
    username: { type: String, required: true },
    action: { type: String, required: true }, // e.g., 'created_ingredient', 'updated_menu_item'
    details: { type: Object } // Store relevant data about the action
});
const AuditLog = mongoose.model('AuditLog', auditLogSchema);

// --- Session Middleware Configuration (NEW) ---
app.use(session({
    secret: process.env.SESSION_SECRET || 'a_secret_key', // A secret for signing the session ID cookie
    resave: false, // Prevents session from being saved on every request
    saveUninitialized: false, // Prevents storing new sessions that have not been modified
    store: MongoStore.create({
        mongoUrl: MONGODB_URI,
        collectionName: 'sessions', // Name of the collection to store sessions
        ttl: 14 * 24 * 60 * 60 // 14 days
    }),
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 14, // 14 days
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
        httpOnly: true // Prevents client-side JavaScript from accessing the cookie
    }
}));


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

// --- Middleware for Authentication and Authorization (UPDATED) ---

const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.user) {
        next();
    } else {
        res.status(401).json({ message: 'Authentication required. Please log in.' });
    }
};

const authorizeRole = (roles = []) => {
    if (typeof roles === 'string') {
        roles = [roles];
    }
    return (req, res, next) => {
        if (!req.session.user || !req.session.user.role) {
            return res.status(401).json({ message: 'User role not found.' });
        }
        if (roles.length && !roles.includes(req.session.user.role)) {
            return res.status(403).json({ message: 'You do not have permission to access this resource.' });
        }
        next();
    };
};

// --- Helper function to create an audit log (UPDATED) ---
const createAuditLog = async (user, action, details) => {
    try {
        const log = new AuditLog({
            user: user.userId,
            username: user.username,
            action: action,
            details: details
        });
        await log.save();
    } catch (error) {
        console.error('Failed to create audit log:', error);
    }
};

// --- Controllers (Logic for API Endpoints) ---

// --- Menu Item Controllers ---
const menuController = {
    getAllMenuItems: async (req, res) => {
        try {
            const menuItems = await MenuItem.find().populate('recipe.ingredient');
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
            const populatedMenuItem = await MenuItem.findById(savedMenuItem._id).populate('recipe.ingredient');
            await createAuditLog(req.session.user, 'created_menu_item', { menuItemId: savedMenuItem._id, name: savedMenuItem.name });
            res.status(201).json(populatedMenuItem);
        } catch (error) {
            if (error.code === 11000) {
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
            await createAuditLog(req.session.user, 'updated_menu_item', { menuItemId: id, newName: name });
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
            await createAuditLog(req.session.user, 'deleted_menu_item', { menuItemId: id, name: deletedMenuItem.name });
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
        const { name, quantity, unit, costPerUnit, spoilage } = req.body;
        const newIngredient = new Ingredient({ name, quantity, unit, costPerUnit, spoilage });

        try {
            const savedIngredient = await newIngredient.save();
            await createAuditLog(req.session.user, 'created_ingredient', { ingredientId: savedIngredient._id, name: savedIngredient.name });
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
        const { name, quantity, unit, costPerUnit, spoilage } = req.body;

        try {
            const updatedIngredient = await Ingredient.findByIdAndUpdate(
                id,
                { name, quantity, unit, costPerUnit, spoilage },
                { new: true, runValidators: true }
            );

            if (!updatedIngredient) {
                return res.status(404).json({ message: 'Ingredient not found' });
            }
            await createAuditLog(req.session.user, 'updated_ingredient', { ingredientId: id, newName: name });
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
            await createAuditLog(req.session.user, 'deleted_ingredient', { ingredientId: id, name: deletedIngredient.name });
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
            const expenses = await Expense.find(query).sort({ date: -1 });
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
            await createAuditLog(req.session.user, 'created_expense', { expenseId: savedExpense._id, description: savedExpense.description });
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
            await createAuditLog(req.session.user, 'updated_expense', { expenseId: id, newDescription: description });
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
            await createAuditLog(req.session.user, 'deleted_expense', { expenseId: id, description: deletedExpense.description });
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
            const populatedOrder = await KitchenOrder.findById(savedOrder._id).populate('items.menuItem');
            await createAuditLog(req.session.user, 'created_kitchen_order', { orderId: savedOrder._id });
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
                .populate('items.menuItem')
                .sort({ date: -1, createdAt: -1 });
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
                    path: 'recipe.ingredient'
                }
            });

            if (!order) {
                return res.status(404).json({ message: 'Order not found' });
            }
            if (order.status === 'Ready' || order.status === 'Cancelled') {
                return res.status(400).json({ message: `Order is already ${order.status}. Cannot mark ready.` });
            }

            const insufficientStockMessages = [];
            for (const orderItem of order.items) {
                const menuItem = orderItem.menuItem;
                if (!menuItem) continue;

                if (menuItem.recipe && menuItem.recipe.length > 0) {
                    for (const recipeItem of menuItem.recipe) {
                        const ingredient = recipeItem.ingredient;
                        if (!ingredient) continue;

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
            }

            if (insufficientStockMessages.length > 0) {
                return res.status(400).json({
                    message: 'Cannot mark order ready due to insufficient inventory.',
                    details: insufficientStockMessages
                });
            }

            const salesToRecord = [];
            const inventoryUpdates = [];
            for (const orderItem of order.items) {
                const menuItem = orderItem.menuItem;
                let itemCostOfGoods = 0;

                if (menuItem.recipe && menuItem.recipe.length > 0) {
                    for (const recipeItem of menuItem.recipe) {
                        const ingredient = recipeItem.ingredient;
                        const requiredQuantity = recipeItem.quantityUsed * orderItem.quantity;
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
            }

            const session = await mongoose.startSession();
            session.startTransaction();

            try {
                for (const update of inventoryUpdates) {
                    await Ingredient.findByIdAndUpdate(
                        update.id,
                        { $inc: { quantity: -update.deductQuantity } },
                        { session }
                    );
                }
                await Sale.insertMany(salesToRecord, { session });
                order.status = 'Ready';
                await order.save({ session });
                await createAuditLog(req.session.user, 'marked_order_ready', { orderId: id });
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
            await createAuditLog(req.session.user, 'cancelled_kitchen_order', { orderId: id });
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

// --- Authentication Controllers (NEW) ---
const authController = {
    // This is a setup route to create a user, you should remove or secure it after initial setup
    createUser: async (req, res) => {
        const { username, password, role } = req.body;
        try {
            const newUser = new User({ username, password, role });
            await newUser.save();
            res.status(201).json({ message: 'User created successfully.', user: { username: newUser.username, role: newUser.role } });
        } catch (error) {
            if (error.code === 11000) {
                return res.status(409).json({ message: 'User with this username already exists.' });
            }
            res.status(400).json({ message: error.message });
        }
    },
    // The main login route (UPDATED)
    login: async (req, res) => {
        const { username, password } = req.body;
        try {
            const user = await User.findOne({ username });
            if (!user) {
                return res.status(401).json({ message: 'Invalid username or password.' });
            }

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(401).json({ message: 'Invalid username or password.' });
            }

            // Store user info in the session
            req.session.user = { userId: user._id, username: user.username, role: user.role };
            res.status(200).json({ message: 'Login successful!', user: { username: user.username, role: user.role } });
        } catch (error) {
            res.status(500).json({ message: 'Server error during login.', error: error.message });
        }
    },
    logout: (req, res) => {
        req.session.destroy(err => {
            if (err) {
                return res.status(500).json({ message: 'Failed to log out.' });
            }
            res.clearCookie('connect.sid'); // Clear the session cookie
            res.status(200).json({ message: 'Logged out successfully.' });
        });
    }
};

// --- API Routes ---

// Basic route for testing the server
app.get('/', (req, res) => {
    res.send('Restaurant Management Backend API is running!');
});

// Authentication Routes
app.post('/api/auth/register', authController.createUser); // You should remove this after creating initial users
app.post('/api/auth/login', authController.login);
app.post('/api/auth/logout', isAuthenticated, authController.logout);

// Audit Log Route (NEW - Admin only)
app.get('/api/audits', isAuthenticated, authorizeRole('admin'), async (req, res) => {
    try {
        const logs = await AuditLog.find().sort({ timestamp: -1 });
        res.status(200).json(logs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


// --- Protected Routes (UPDATED with Session Middleware) ---
// All routes below this point now require an active session and specific roles

// Menu Item Routes (Admin only)
app.get('/api/menu', isAuthenticated, menuController.getAllMenuItems);
app.post('/api/menu', isAuthenticated, authorizeRole('admin'), menuController.createMenuItem);
app.put('/api/menu/:id', isAuthenticated, authorizeRole('admin'), menuController.updateMenuItem);
app.delete('/api/menu/:id', isAuthenticated, authorizeRole('admin'), menuController.deleteMenuItem);

// Inventory Routes (Admin only)
app.get('/api/inventory', isAuthenticated, authorizeRole('admin'), inventoryController.getAllIngredients);
app.post('/api/inventory', isAuthenticated, authorizeRole('admin'), inventoryController.createIngredient);
app.put('/api/inventory/:id', isAuthenticated, authorizeRole('admin'), inventoryController.updateIngredient);
app.delete('/api/inventory/:id', isAuthenticated, authorizeRole('admin'), inventoryController.deleteIngredient);

// Expense Routes (Admin only)
app.get('/api/expenses', isAuthenticated, authorizeRole('admin'), expenseController.getAllExpenses);
app.post('/api/expenses', isAuthenticated, authorizeRole('admin'), expenseController.createExpense);
app.put('/api/expenses/:id', isAuthenticated, authorizeRole('admin'), expenseController.updateExpense);
app.delete('/api/expenses/:id', isAuthenticated, authorizeRole('admin'), expenseController.deleteExpense);

// Kitchen Order Routes (Accessible by both admin and waitress)
app.post('/api/kitchen-orders', isAuthenticated, authorizeRole(['admin', 'waitress']), kitchenOrderController.createKitchenOrder);
app.get('/api/kitchen-orders', isAuthenticated, authorizeRole(['admin', 'waitress']), kitchenOrderController.getAllKitchenOrders);
app.put('/api/kitchen-orders/:id/ready', isAuthenticated, authorizeRole(['admin', 'waitress']), kitchenOrderController.markOrderReady);
app.put('/api/kitchen-orders/:id/cancel', isAuthenticated, authorizeRole(['admin', 'waitress']), kitchenOrderController.cancelKitchenOrder);

// Sales Routes (Admin only)
app.get('/api/sales', isAuthenticated, authorizeRole('admin'), salesController.getAllSales);

// Report Routes (Admin only)
app.get('/api/reports/financial', isAuthenticated, authorizeRole('admin'), reportController.generateFinancialReport);


// --- Global Error Handling Middleware ---
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong on the server!', error: err.message });
});

// --- Start the Server ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Access API at http://localhost:${PORT}/api`);
});
