const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); // Import cors for cross-origin requests

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Body parser for JSON requests

// MongoDB Connection
const MONGODB_URI = 'mongodb+srv://dianabwire:dianabwire@cluster0.w6s219w.mongodb.net/restaurant_db?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI)
    .then(() => console.log('MongoDB connected successfully'))
    .catch(err => console.error('MongoDB connection error:', err));

// --- Mongoose Schemas and Models ---

// Ingredient Schema and Model
const ingredientSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, unique: true },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true, trim: true },
    costPerUnit: { type: Number, required: true, min: 0 }
}, { timestamps: true });
const Ingredient = mongoose.model('Ingredient', ingredientSchema);

// MenuItem Schema and Model
const menuItemSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, unique: true },
    price: { type: Number, required: true, min: 0 },
    category: { type: String, required: true, trim: true },
    recipe: [{
        ingredient: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient', required: true },
        quantityUsed: { type: Number, required: true, min: 0 }
    }]
}, { timestamps: true });
const MenuItem = mongoose.model('MenuItem', menuItemSchema);

// KitchenOrder Schema and Model
const kitchenOrderSchema = new mongoose.Schema({
    items: [{
        menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
        quantity: { type: Number, required: true, min: 1 }
    }],
    totalAmount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['New', 'Preparing', 'Ready', 'Cancelled'], default: 'New' },
    date: { type: Date, default: Date.now }
}, { timestamps: true });
const KitchenOrder = mongoose.model('KitchenOrder', kitchenOrderSchema);

// SalesTransaction Schema and Model
const salesTransactionSchema = new mongoose.Schema({
    itemSold: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    amount: { type: Number, required: true, min: 0 },
    costOfGoods: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, required: true, default: 'Cash' },
    date: { type: Date, default: Date.now, required: true }

}, { timestamps: true });
const SalesTransaction = mongoose.model('SalesTransaction', salesTransactionSchema);

// Expense Schema and Model
const expenseSchema = new mongoose.Schema({
    date: { type: Date, required: true },
    category: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 }
}, { timestamps: true });
const Expense = mongoose.model('Expense', expenseSchema);

// --- API Routes ---

// --- Menu Item Routes ---
// GET all menu items
app.get('/api/menu', async (req, res) => {
    try {
        const menuItems = await MenuItem.find({})
            .populate({
                path: 'recipe.ingredient',
                select: 'name unit'
            });
        res.status(200).json(menuItems);
    } catch (error) {
        console.error('Error fetching menu items:', error);
        res.status(500).json({ message: 'Server error fetching menu items.' });
    }
});

// GET a single menu item by ID
app.get('/api/menu/:id', async (req, res) => {
    try {
        const menuItem = await MenuItem.findById(req.params.id)
            .populate({
                path: 'recipe.ingredient',
                select: 'name unit'
            });
        if (!menuItem) {
            return res.status(404).json({ message: 'Menu item not found.' });
        }
        res.status(200).json(menuItem);
    } catch (error) {
        console.error('Error fetching single menu item:', error);
        res.status(500).json({ message: 'Server error fetching menu item.' });
    }
});

// POST a new menu item
app.post('/api/menu', async (req, res) => {
    const { name, price, category, recipe } = req.body;
    try {
        const newMenuItem = new MenuItem({ name, price, category, recipe });
        await newMenuItem.save();
        res.status(201).json(newMenuItem);
    } catch (error) {
        console.error('Error adding menu item:', error);
        res.status(400).json({ message: error.message });
    }
});

// PUT (update) a menu item by ID
app.put('/api/menu/:id', async (req, res) => {
    const { name, price, category, recipe } = req.body;
    try {
        const updatedMenuItem = await MenuItem.findByIdAndUpdate(
            req.params.id,
            { name, price, category, recipe },
            { new: true, runValidators: true }
        );
        if (!updatedMenuItem) {
            return res.status(404).json({ message: 'Menu item not found.' });
        }
        res.status(200).json(updatedMenuItem);
    } catch (error) {
        console.error('Error updating menu item:', error);
        res.status(400).json({ message: error.message });
    }
});

// DELETE a menu item by ID
app.delete('/api/menu/:id', async (req, res) => {
    try {
        const deletedMenuItem = await MenuItem.findByIdAndDelete(req.params.id);
        if (!deletedMenuItem) {
            return res.status(404).json({ message: 'Menu item not found.' });
        }
        res.status(200).json({ message: 'Menu item deleted successfully.' });
    } catch (error) {
        console.error('Error deleting menu item:', error);
        res.status(500).json({ message: 'Server error deleting menu item.' });
    }
});

// --- Kitchen Order Routes ---
// GET all kitchen orders
app.get('/api/kitchen-orders', async (req, res) => {
    const { startDate, endDate } = req.query;
    let query = {};

    if (startDate && endDate) {
        query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    } else if (startDate) {
        query.date = { $gte: new Date(startDate) };
    } else if (endDate) {
        query.date = { $lte: new Date(endDate) };
    }

    try {
        const orders = await KitchenOrder.find(query)
            .populate({
                path: 'items.menuItem',
                populate: {
                    path: 'recipe.ingredient',
                    select: 'name unit'
                }
            })
            .sort({ createdAt: -1 });
        res.status(200).json(orders);
    } catch (error) {
        console.error('Error fetching kitchen orders:', error);
        res.status(500).json({ message: 'Server error fetching kitchen orders.' });
    }
});

// POST a new kitchen order
app.post('/api/kitchen-orders', async (req, res) => {
    const { items, totalAmount } = req.body;
    try {
        const newOrder = new KitchenOrder({ items, totalAmount, date: new Date() });
        await newOrder.save();
        res.status(201).json(newOrder);
    } catch (error) {
        console.error('Error placing order:', error);
        res.status(400).json({ message: error.message });
    }
});

// PUT (update) order status to 'Ready' and handle inventory/sales
app.put('/api/kitchen-orders/:id/ready', async (req, res) => {
    const { id } = req.params;
    const session = await mongoose.startSession(); // Start a Mongoose session for transaction

    try {
        session.startTransaction(); // Begin the transaction

        const order = await KitchenOrder.findById(id).session(session).populate({
            path: 'items.menuItem',
            populate: {
                path: 'recipe.ingredient' // Crucial: Populate full ingredient details for deduction
            }
        });

        if (!order) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: 'Order not found.' });
        }

        if (order.status === 'Ready') {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: 'Order is already marked as ready.' });
        }

        if (order.status === 'Cancelled') {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: 'Cannot mark a cancelled order as ready.' });
        }

        let totalCostOfGoods = 0;
        let salesTransactions = [];
        let inventoryUpdates = new Map(); // Map to store ingredientId -> { currentQuantity, deductionNeeded }

        // 1. Check and aggregate inventory needs
        for (const orderItem of order.items) {
            const menuItem = orderItem.menuItem;
            if (!menuItem) {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({ message: `Menu item not found for order item ID: ${orderItem._id}` });
            }

            for (const recipeItem of menuItem.recipe) {
                const ingredientId = recipeItem.ingredient._id.toString();
                const quantityToDeduct = recipeItem.quantityUsed * orderItem.quantity;

                if (!inventoryUpdates.has(ingredientId)) {
                    // Fetch the current ingredient from DB within the session
                    const ingredient = await Ingredient.findById(ingredientId).session(session);
                    if (!ingredient) {
                        await session.abortTransaction();
                        session.endSession();
                        return res.status(400).json({ message: `Ingredient not found: ${recipeItem.ingredient.name}` });
                    }
                    inventoryUpdates.set(ingredientId, {
                        currentQuantity: ingredient.quantity,
                        deductionNeeded: quantityToDeduct,
                        costPerUnit: ingredient.costPerUnit,
                        name: ingredient.name
                    });
                } else {
                    const existing = inventoryUpdates.get(ingredientId);
                    existing.deductionNeeded += quantityToDeduct;
                    inventoryUpdates.set(ingredientId, existing);
                }
            }

            // Calculate cost of goods for this menu item
            let itemCost = 0;
            if (menuItem.recipe && menuItem.recipe.length > 0) {
                itemCost = menuItem.recipe.reduce((sum, rItem) => {
                    const ingCost = rItem.ingredient ? rItem.ingredient.costPerUnit : 0; // Use populated costPerUnit
                    return sum + (rItem.quantityUsed * ingCost);
                }, 0);
            }
            totalCostOfGoods += itemCost * orderItem.quantity;

            // Prepare sales transaction for this item
            salesTransactions.push({
                itemSold: menuItem.name,
                quantity: orderItem.quantity,
                amount: menuItem.price * orderItem.quantity,
                costOfGoods: itemCost * orderItem.quantity,
                paymentMethod: 'Cash', // Assuming cash for now, can be expanded
                date: new Date()
            });
        }

        // 2. Perform availability check and update inventory
        for (const [ingredientId, data] of inventoryUpdates.entries()) {
            if (data.currentQuantity < data.deductionNeeded) {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({ message: `Insufficient inventory for ${data.name}. Needed: ${data.deductionNeeded.toFixed(2)}, Available: ${data.currentQuantity.toFixed(2)}` });
            }
            await Ingredient.findByIdAndUpdate(
                ingredientId,
                { $inc: { quantity: -data.deductionNeeded } }, // Deduct quantity
                { session } // Crucial: perform update within the session
            );
        }

        // 3. Create sales transactions
        await SalesTransaction.insertMany(salesTransactions, { session });

        // 4. Update order status
        order.status = 'Ready';
        await order.save({ session });

        await session.commitTransaction(); // Commit all changes if everything succeeds
        session.endSession();

        res.status(200).json({ message: 'Order marked as ready, inventory updated, and sales recorded successfully.' });

    } catch (error) {
        await session.abortTransaction(); // Rollback if any error occurs
        session.endSession();
        console.error('Error marking order ready or processing transaction:', error);
        res.status(500).json({ message: `Failed to process order. Transaction aborted. ${error.message}` });
    }
});

// PUT (update) order status to 'Cancelled'
app.put('/api/kitchen-orders/:id/cancel', async (req, res) => {
    try {
        const order = await KitchenOrder.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ message: 'Order not found.' });
        }
        if (order.status === 'Ready') {
            return res.status(400).json({ message: 'Cannot cancel an order that is already ready.' });
        }
        order.status = 'Cancelled';
        await order.save();
        res.status(200).json({ message: 'Order cancelled successfully.' });
    } catch (error) {
        console.error('Error cancelling order:', error);
        res.status(500).json({ message: 'Server error cancelling order.' });
    }
});

// DELETE a kitchen order (optional, usually not done for historical reasons)
app.delete('/api/kitchen-orders/:id', async (req, res) => {
    try {
        const deletedOrder = await KitchenOrder.findByIdAndDelete(req.params.id);
        if (!deletedOrder) {
            return res.status(404).json({ message: 'Order not found.' });
        }
        res.status(200).json({ message: 'Order deleted successfully.' });
    } catch (error) {
        console.error('Error deleting order:', error);
        res.status(500).json({ message: 'Server error deleting order.' });
    }
});

// --- Inventory Routes ---
// GET all inventory items
app.get('/api/inventory', async (req, res) => {
    try {
        const ingredients = await Ingredient.find({});
        res.status(200).json(ingredients);
    } catch (error) {
        console.error('Error fetching ingredients:', error);
        res.status(500).json({ message: 'Server error fetching ingredients.' });
    }
});

// POST a new inventory item
app.post('/api/inventory', async (req, res) => {
    const { name, quantity, unit, costPerUnit } = req.body;
    try {
        const newIngredient = new Ingredient({ name, quantity, unit, costPerUnit });
        await newIngredient.save();
        res.status(201).json(newIngredient);
    } catch (error) {
        console.error('Error adding ingredient:', error);
        res.status(400).json({ message: error.message });
    }
});

// PUT (update) an inventory item by ID
app.put('/api/inventory/:id', async (req, res) => {
    const { name, quantity, unit, costPerUnit } = req.body;
    try {
        const updatedIngredient = await Ingredient.findByIdAndUpdate(
            req.params.id,
            { name, quantity, unit, costPerUnit },
            { new: true, runValidators: true }
        );
        if (!updatedIngredient) {
            return res.status(404).json({ message: 'Ingredient not found.' });
        }
        res.status(200).json(updatedIngredient);
    } catch (error) {
        console.error('Error updating ingredient:', error);
        res.status(400).json({ message: error.message });
    }
});

// DELETE an inventory item by ID
app.delete('/api/inventory/:id', async (req, res) => {
    try {
        const deletedIngredient = await Ingredient.findByIdAndDelete(req.params.id);
        if (!deletedIngredient) {
            return res.status(404).json({ message: 'Ingredient not found.' });
        }
        res.status(200).json({ message: 'Ingredient deleted successfully.' });
    } catch (error) {
        console.error('Error deleting ingredient:', error);
        res.status(500).json({ message: 'Server error deleting ingredient.' });
    }
});

// --- Expense Routes ---
// GET all expenses
app.get('/api/expenses', async (req, res) => {
    const { startDate, endDate } = req.query;
    let query = {};

    if (startDate && endDate) {
        query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    } else if (startDate) {
        query.date = { $gte: new Date(startDate) };
    } else if (endDate) {
        query.date = { $lte: new Date(endDate) };
    }

    try {
        const expenses = await Expense.find(query).sort({ date: -1 }); // Sort by date, newest first
        res.status(200).json(expenses);
    } catch (error) {
        console.error('Error fetching expenses:', error);
        res.status(500).json({ message: 'Server error fetching expenses.' });
    }
});

// POST a new expense
app.post('/api/expenses', async (req, res) => {
    const { date, category, description, amount } = req.body;
    try {
        const newExpense = new Expense({ date, category, description, amount });
        await newExpense.save();
        res.status(201).json(newExpense);
    } catch (error) {
        console.error('Error adding expense:', error);
        res.status(400).json({ message: error.message });
    }
});

// PUT (update) an expense by ID
app.put('/api/expenses/:id', async (req, res) => {
    const { date, category, description, amount } = req.body;
    try {
        const updatedExpense = await Expense.findByIdAndUpdate(
            req.params.id,
            { date, category, description, amount },
            { new: true, runValidators: true }
        );
        if (!updatedExpense) {
            return res.status(404).json({ message: 'Expense not found.' });
        }
        res.status(200).json(updatedExpense);
    } catch (error) {
        console.error('Error updating expense:', error);
        res.status(400).json({ message: error.message });
    }
});

// DELETE an expense by ID
app.delete('/api/expenses/:id', async (req, res) => {
    try {
        const deletedExpense = await Expense.findByIdAndDelete(req.params.id);
        if (!deletedExpense) {
            return res.status(404).json({ message: 'Expense not found.' });
        }
        res.status(200).json({ message: 'Expense deleted successfully.' });
    } catch (error) {
        console.error('Error deleting expense:', error);
        res.status(500).json({ message: 'Server error deleting expense.' });
    }
});

// --- Sales Routes ---
// GET all sales transactions
app.get('/api/sales', async (req, res) => {
    const { startDate, endDate } = req.query;
    let query = {};

    if (startDate && endDate) {
        query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    } else if (startDate) {
        query.date = { $gte: new Date(startDate) };
    } else if (endDate) {
        query.date = { $lte: new Date(endDate) };
    }

    try {
        const sales = await SalesTransaction.find(query).sort({ date: -1 }); // Sort by date, newest first
        res.status(200).json(sales);
    } catch (error) {
        console.error('Error fetching sales transactions:', error);
        res.status(500).json({ message: 'Server error fetching sales transactions.' });
    }
});

// --- Reports Route ---
app.get('/api/reports/financial', async (req, res) => {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
        return res.status(400).json({ message: 'Start date and end date are required for financial reports.' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Include the entire end day

    try {
        // Calculate total sales
        const totalSalesResult = await SalesTransaction.aggregate([
            { $match: { date: { $gte: start, $lte: end } } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const totalSales = totalSalesResult.length > 0 ? totalSalesResult[0].total : 0;

        // Fetch sales details for the period
        const salesDetails = await SalesTransaction.find({ date: { $gte: start, $lte: end } }).sort({ date: 1 });

        // Calculate total expenses
        const totalExpensesResult = await Expense.aggregate([
            { $match: { date: { $gte: start, $lte: end } } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const totalExpenses = totalExpensesResult.length > 0 ? totalExpensesResult[0].total : 0;

        // Fetch expense details for the period
        const expenseDetails = await Expense.find({ date: { $gte: start, $lte: end } }).sort({ date: 1 });

        const netProfit = totalSales - totalExpenses;

        res.status(200).json({
            totalSales,
            totalExpenses,
            netProfit,
            salesDetails,
            expenseDetails
        });

    } catch (error) {
        console.error('Error generating financial report:', error);
        res.status(500).json({ message: 'Server error generating financial report.' });
    }
});


// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
