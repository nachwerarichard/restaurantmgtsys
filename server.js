require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();
app.use(express.json());

// CORS config - allow your frontend origin
app.use(cors({
  origin: 'https://stirring-pony-fe2347.netlify.app', // Ensure this matches your frontend URL
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// --- !!! WARNING: SERIOUS SECURITY VULNERABILITY !!! ---
// Hardcoding users for demonstration purposes only.
// DO NOT USE THIS IN PRODUCTION OR FOR ANY REAL APPLICATION.
const HARDCODED_USERS = {
    'Nachwera Richard': { password: '123', role: 'Nachwera Richard' },
    'Nelson': { password: '123', role: 'Nelson' },
    'Florence': { password: '123', role: 'Florence' },
    'Martha': { password: '456', role: 'Martha' },
    'Joshua': { password: '456', role: 'Joshua' }
};
// --- !!! END OF WARNING !!! ---


// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('MongoDB connected');
}).catch(err => console.error('MongoDB connection error:', err));

// --- NEW: Audit Log Schema ---
const AuditLog = mongoose.model('AuditLog', new mongoose.Schema({
  action: { type: String, required: true }, // e.g., 'Login', 'Logout', 'Sale Created', 'Inventory Updated'
  user: { type: String, required: true }, // Username of the person performing the action
  timestamp: { type: Date, default: Date.now },
  details: { type: mongoose.Schema.Types.Mixed } // Store relevant details about the action
}));

// --- NEW: Helper function to create audit log entries ---
async function logAction(action, user, details = {}) {
  try {
    await AuditLog.create({ action, user, details });
  } catch (error) {
    console.error('Error logging audit action:', error);
  }
}

// --- MODIFIED: Authentication Middleware (Uses hardcoded users) ---
async function auth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No authorization header' });

  const token = authHeader.split(' ')[1]; // Expecting "Basic <base64encoded_username:password>"
  if (!token) return res.status(401).json({ error: 'Malformed authorization header' });

  try {
    const credentials = Buffer.from(token, 'base64').toString('ascii');
    const [username, password] = credentials.split(':');

    // --- !!! SERIOUS SECURITY RISK: PLAIN-TEXT PASSWORD COMPARISON !!! ---
    const user = HARDCODED_USERS[username];

    if (!user || user.password !== password) { // Directly comparing plain-text passwords
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Attach user object (including role) to the request
    req.user = { username: username, role: user.role, id: username };
    next();
  } catch (err) {
    console.error('Authentication error:', err);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

// --- NEW: Authorization Middleware ---
function authorize(roles = []) {
  if (typeof roles === 'string') {
    roles = [roles];
  }

  return (req, res, next) => {
    // req.user is populated by the 'auth' middleware
    if (!req.user || (roles.length > 0 && !roles.includes(req.user.role))) {
      return res.status(403).json({ error: 'Forbidden: You do not have the required permissions.' });
    }
    next();
  };
}

// Schemas (Existing ones)
const CashJournal = mongoose.model('CashJournal', new mongoose.Schema({
    cashAtHand: Number,
    cashBanked: Number,
    bankReceiptId: String,
    responsiblePerson: String,
    date: { type: Date, default: Date.now }
}));

// --- MODIFIED: Inventory Schema to use explicit 'date' field ---
const Inventory = mongoose.model('Inventory', new mongoose.Schema({
  item: String,
  opening: Number,
  purchases: Number,
  sales: Number,
  spoilage: Number,
  closing: Number,
  date: { type: Date, default: Date.now } // Using explicit date field
})); 

const Sale = mongoose.model('Sale', new mongoose.Schema({
  item: String,
  number: Number,
  bp: Number,
  sp: Number,
  profit: Number, 
  percentageprofit: Number,
  date: Date
}));

const Expense = mongoose.model('Expense', new mongoose.Schema({
  description: String,
  amount: Number,
  receiptId: String,
  date: Date,
  source: String,
  recordedBy: String,
}));


// Nodemailer setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

// Low-stock notifier (Existing)
async function notifyLowStock(item, current) {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: `Low stock alert: ${item}`,
      text: `Stock for ${item} is now ${current}, below threshold! Please reorder.`
    });
    console.log(`Low stock email sent for ${item}. Current stock: ${current}`);
  } catch (err) {
    console.error('Error sending low stock email:', err);
  }
}


// --- MODIFIED: Login Endpoint (Uses hardcoded users) ---
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    // --- !!! SERIOUS SECURITY RISK: PLAIN-TEXT PASSWORD COMPARISON !!! ---
    const user = HARDCODED_USERS[username];

    if (!user || user.password !== password) { // Directly comparing plain-text passwords
        console.warn(`Login failed for username: ${username}. Invalid credentials.`);
        await logAction('Login Attempt Failed', username, { reason: 'Invalid credentials provided.' });
        return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Login successful
    console.log(`Login successful for username: ${username}, role: ${user.role}`);
    await logAction('Login Successful', username);

    // Respond with user info, including their role
    res.status(200).json({ username: user.username, role: user.role });
});

// --- NEW: Logout Endpoint ---
app.post('/logout', auth, async (req, res) => {
    // Note: req.user is populated by the auth middleware before this route is hit
    await logAction('Logout', req.user.username);
    res.status(200).json({ message: 'Logged out successfully' });
});


// --- MODIFIED: Inventory Endpoints ---
app.post('/inventory', auth, authorize(['Nachwera Richard','Nelson','Florence','Martha', 'Joshua']), async (req, res) => { 
  try {
    const { item, opening, purchases, sales, spoilage } = req.body;
    const total = opening + purchases - sales - spoilage;
    const doc = await Inventory.create({ item, opening, purchases, sales, spoilage, closing: total, date: new Date() }); // Add date to creation
    if (total < Number(process.env.LOW_STOCK_THRESHOLD)) {
      notifyLowStock(item, total);
    }
    await logAction('Inventory Created', req.user.username, { item: doc.item, closing: doc.closing });
    res.status(201).json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/inventory', auth, authorize(['Nachwera Richard', 'Florence', 'Nelson', 'Joshua', 'Martha']), async (req, res) => {
    try {
        const { item, low, date, page = 1, limit = 5 } = req.query;
        const filter = {};
        
        // Add item and low stock filters
        if (item) filter.item = new RegExp(item, 'i');
        if (low) filter.closing = { $lt: Number(low) };

        // --- NEW LOGIC: Use a single date to get the most recent record for each item ---
        let docs = [];
        let total = 0;
        
        if (date) {
            const selectedDate = new Date(date + 'T23:59:59.999Z');
            if (isNaN(selectedDate.getTime())) {
                return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
            }

            // Find the most recent record for each unique item, on or before the selected date
            const latestRecords = await Inventory.aggregate([
                {
                    // Step 1: Filter to only include records on or before the selected date
                    $match: {
                        date: { $lte: selectedDate },
                        ...filter // Also apply item and low stock filters
                    }
                },
                {
                    // Step 2: Sort the records by item and then by date in descending order
                    // This places the most recent record for each item at the top
                    $sort: { item: 1, date: -1 }
                },
                {
                    // Step 3: Group by item and take the first document in each group
                    // This gives us the single latest record for each item
                    $group: {
                        _id: '$item',
                        doc: { $first: '$$ROOT' }
                    }
                },
                {
                    // Step 4: Project the document back to the original format
                    $replaceRoot: { newRoot: '$doc' }
                }
            ]);

            // Now, we handle pagination on the aggregated results
            total = latestRecords.length;
            const skip = (parseInt(page) - 1) * parseInt(limit);
            docs = latestRecords.slice(skip, skip + Number(limit));

        } else {
            // Original logic for when no date is provided
            const skip = (parseInt(page) - 1) * parseInt(limit);
            total = await Inventory.countDocuments(filter);
            docs = await Inventory.find(filter).skip(skip).limit(Number(limit));
        }
        // --- END NEW LOGIC ---

        // --- UPDATED LOGIC: Find and log ALL records without a date field ---
        const recordsWithoutDate = await Inventory.find({ date: { $exists: false } });
        if (recordsWithoutDate.length > 0) {
            console.log('Found the following records without a date field:');
            console.log(recordsWithoutDate);
        }
        // --- END UPDATED LOGIC ---

        res.json({
            data: docs,
            total,
            page: Number(page),
            pages: Math.ceil(total / limit)
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


app.put('/inventory/:id', auth, authorize(['Nachwera Richard','Nelson','Florence']), async (req, res) => { // Joshua CANNOT edit inventory
  try {
    const existingDoc = await Inventory.findById(req.params.id);
    if (!existingDoc) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    const updatedValues = {
      item: req.body.item !== undefined ? req.body.item : existingDoc.item,
      opening: req.body.opening !== undefined ? req.body.opening : existingDoc.opening,
      purchases: req.body.purchases !== undefined ? req.body.purchases : existingDoc.purchases,
      sales: req.body.sales !== undefined ? req.body.sales : existingDoc.sales,
      spoilage: req.body.spoilage !== undefined ? req.body.spoilage : existingDoc.spoilage,
    };
    const newClosing = updatedValues.opening + updatedValues.purchases - updatedValues.sales - updatedValues.spoilage;

    const doc = await Inventory.findByIdAndUpdate(
      req.params.id,
      { ...updatedValues, closing: newClosing },
      { new: true }
    );

    if (doc.closing < Number(process.env.LOW_STOCK_THRESHOLD)) {
      notifyLowStock(doc.item, doc.closing);
    }
    await logAction('Inventory Updated', req.user.username, { itemId: doc._id, item: doc.item, newClosing: doc.closing });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/inventory/:id', auth, authorize(['Nachwera Richard','Nelson','Florence']), async (req, res) => {
  try {
    const deletedDoc = await Inventory.findByIdAndDelete(req.params.id);
    if (!deletedDoc) {
        return res.status(404).json({ error: 'Inventory item not found' });
    }
    await logAction('Inventory Deleted', req.user.username, { itemId: deletedDoc._id, item: deletedDoc.item });
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- MODIFIED: Sales endpoints ---
app.post('/sales', auth, authorize(['Nachwera Richard', 'Martha', 'Joshua', 'Nelson', 'Florence']), async (req, res) => {
  try {
    const { item, number, bp, sp } = req.body;
    const totalBuyingPrice = bp * number;
    const totalSellingPrice = sp * number;
    const profit = totalSellingPrice - totalBuyingPrice;
    let percentageProfit = 0;
    if (totalBuyingPrice !== 0) {
      percentageProfit = (profit / totalBuyingPrice) * 100;
    }

    const sale = await Sale.create({
      ...req.body,
      profit: profit,
      percentageprofit: percentageProfit,
      date: new Date()
    });

    if (item && typeof number === 'number' && number > 0) {
      try {
        // --- NEW LOGIC TO FIND AND UPDATE THE LATEST INVENTORY ENTRY ---
        const latestInventoryItem = await Inventory.findOne({ item: item }).sort({ date: -1 });

        if (latestInventoryItem) {
          // Calculate the new closing stock
          const newClosing = latestInventoryItem.closing - number;

          // Create a new inventory entry with the updated closing stock,
          // rather than updating the old one directly
          const newInventoryEntry = await Inventory.create({
            item: item,
            opening: latestInventoryItem.closing, // The old closing becomes the new opening
            purchases: 0,
            sales: number,
            spoilage: 0,
            closing: newClosing,
            date: new Date()
          });

          console.log(`Inventory updated for "${item}". New closing stock: ${newInventoryEntry.closing}.`);
          if (newClosing < Number(process.env.LOW_STOCK_THRESHOLD)) {
            notifyLowStock(item, newClosing);
          }
        } else {
          console.warn(`Warning: Sold item "${item}" not found in Inventory. Inventory not updated.`);
        }
        // --- END NEW LOGIC ---
      } catch (inventoryError) {
        console.error(`Error updating inventory for item "${item}":`, inventoryError);
      }
    } else {
      console.warn("Warning: Sale request missing valid 'item' or 'number' for inventory deduction. Inventory not updated.");
    }
    await logAction('Sale Created', req.user.username, { saleId: sale._id, item: sale.item, number: sale.number, sp: sale.sp });
    res.status(201).json(sale);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/sales', auth, authorize(['Nachwera Richard', 'Martha','Joshua','Nelson','Florence']), async (req, res) => {
  try {
    const { date, page = 1, limit = 5 } = req.query;

    let query = {};
    // --- MODIFIED: Robust Date Filter Logic ---
    if (date) {
      const startDate = new Date(date + 'T00:00:00.000Z');
      const endDate = new Date(date + 'T23:59:59.999Z');
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
      }
      query.date = { $gte: startDate, $lte: endDate };
    }
    // --- END: Robust Date Filter Logic ---

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Sale.countDocuments(query);
    const sales = await Sale.find(query).sort({ date: -1 }).skip(skip).limit(Number(limit));

    res.json({
      data: sales,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.put('/sales/:id', auth, authorize(['Nachwera Richard','Nelson','Florence']), async (req, res) => { // Martha and Joshua CANNOT edit sales
  try {
    const updated = await Sale.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ error: 'Sale not found' });
    await logAction('Sale Updated', req.user.username, { saleId: updated._id, item: updated.item, newNumber: updated.number });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/sales/:id', auth, authorize(['Nachwera Richard','Nelson','Florence']), async (req, res) => {
  try {
    const deleted = await Sale.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Sale not found' });
    await logAction('Sale Deleted', req.user.username, { saleId: deleted._id, item: deleted.item });
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- MODIFIED: Expenses endpoints ---
app.post('/expenses', auth, authorize(['Nachwera Richard', 'Martha','Joshua','Nelson','Florence']), async (req, res) => {
  try {
    const { description, amount, receiptId, source } = req.body; 
    const exp = await Expense.create({
      description,
      amount,
      receiptId,
      source,
      recordedBy: req.user.username, 
      date: new Date()
    });
    await logAction('Expense Created', req.user.username, { expenseId: exp._id, description: exp.description, amount: exp.amount });
    res.status(201).json(exp);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/expenses', auth, authorize(['Nachwera Richard', 'Martha','Joshua','Nelson','Florence']), async (req, res) => { // Joshua also added for viewing expenses
  try {
    const { date, page = 1, limit = 5 } = req.query;

    let query = {};
    // --- MODIFIED: Robust Date Filter Logic ---
    if (date) {
      const startDate = new Date(date + 'T00:00:00.000Z');
      const endDate = new Date(date + 'T23:59:59.999Z');
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
      }
      query.date = { $gte: startDate, $lte: endDate };
    }
    // --- END: Robust Date Filter Logic ---

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Expense.countDocuments(query);
    const expenses = await Expense.find(query).sort({ date: -1 }).skip(skip).limit(Number(limit));

    res.json({
      data: expenses,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.put('/expenses/:id', auth, authorize(['Nachwera Richard','Nelson','Florence']), async (req, res) => { // Martha and Joshua CANNOT edit expenses
  try {
    const updated = await Expense.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ error: 'Expense not found' });
    await logAction('Expense Updated', req.user.username, { expenseId: updated._id, description: updated.description, newAmount: updated.amount });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- MODIFIED: Cash Management Endpoints ---
app.post('/cash-journal', auth, authorize(['Nachwera Richard', 'Martha','Nelson','Florence']), async (req, res) => {
    try {
        const { cashAtHand, cashBanked, bankReceiptId, date } = req.body;
        const newEntry = await CashJournal.create({
            cashAtHand,
            cashBanked,
            bankReceiptId,
            responsiblePerson: req.user.username, 
            date: date ? new Date(date) : new Date()
        });
        await logAction('Cash Entry Created', req.user.username, { entryId: newEntry._id, cashAtHand: newEntry.cashAtHand, cashBanked: newEntry.cashBanked });
        res.status(201).json(newEntry);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/cash-journal', auth, authorize(['Nachwera Richard', 'Martha','Nelson','Florence']), async (req, res) => { 
    try {
        const { date, responsiblePerson } = req.query;
        const filter = {};
        // --- MODIFIED: Robust Date Filter Logic ---
        if (date) {
            const startDate = new Date(date + 'T00:00:00.000Z');
            const endDate = new Date(date + 'T23:59:59.999Z');
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
            }
            filter.date = { $gte: startDate, $lte: endDate };
        }
        // --- END: Robust Date Filter Logic ---
        if (responsiblePerson) {
            filter.responsiblePerson = new RegExp(responsiblePerson, 'i');
        }
        const records = await CashJournal.find(filter).sort({ date: -1 });
        res.json(records);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/cash-journal/:id', auth, authorize(['Nachwera Richard','Nelson','Florence']), async (req, res) => { 
    try {
        const { cashAtHand, cashBanked, bankReceiptId, date } = req.body; 
        const updatedEntry = await CashJournal.findByIdAndUpdate(
            req.params.id,
            { cashAtHand, cashBanked, bankReceiptId, responsiblePerson: req.user.username, date: date ? new Date(date) : undefined }, 
            { new: true }
        );
        if (!updatedEntry) {
            return res.status(404).json({ error: 'Cash journal entry not found' });
        }
        await logAction('Cash Entry Updated', req.user.username, { entryId: updatedEntry._id, newCashAtHand: updatedEntry.cashAtHand });
        res.json(updatedEntry);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- NEW: Audit Log Endpoints (Nachwera Richard, Nelson, Florence Only) ---
app.get('/audit-logs', auth, authorize(['Nachwera Richard','Nelson','Florence']), async (req, res) => {
    try {
        const { page = 1, limit = 20, search } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        let query = {};

        if (search) {
            const searchRegex = new RegExp(search, 'i');
            query = {
                $or: [
                    { user: searchRegex },
                    { action: searchRegex },
                    { details: searchRegex },
                ]
            };
        }

        const total = await AuditLog.countDocuments(query);
        const logs = await AuditLog.find(query)
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(Number(limit));

        res.json({
            data: logs,
            total,
            page: Number(page),
            pages: Math.ceil(total / limit)
        });
    } catch (err) {
        console.error('Error fetching audit logs on server:', err);
        res.status(500).json({ error: err.message });
    }
});


// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
