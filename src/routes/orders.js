const express = require('express');
const rateLimit = require('express-rate-limit');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { protect } = require('../middleware/authMiddleware');
const { adminProtect } = require('../middleware/adminMiddleware');

const router = express.Router();

// Rate limit — max 10 orders per 15 min per IP (prevents order spam)
const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many orders submitted. Please wait a few minutes and try again.' },
});

// Input length limits
const MAX_STRING = 500;
const MAX_ITEMS = 20;

// POST /api/orders  — place an order (guest or authenticated)
router.post('/', orderLimiter, async (req, res) => {
  try {
    const { items, customerName, customerEmail, customerPhone, deliveryAddress, notes } = req.body;

    // Basic structure validation
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Order must contain at least one item.' });
    }
    if (items.length > MAX_ITEMS) {
      return res.status(400).json({ message: `Order cannot exceed ${MAX_ITEMS} items.` });
    }

    // Validate string field lengths
    if (customerName && customerName.length > MAX_STRING) {
      return res.status(400).json({ message: 'Customer name is too long.' });
    }
    if (deliveryAddress && deliveryAddress.length > MAX_STRING) {
      return res.status(400).json({ message: 'Delivery address is too long.' });
    }
    if (notes && notes.length > MAX_STRING) {
      return res.status(400).json({ message: 'Notes are too long.' });
    }

    // ── Verify each item against the real DB price ──────────────────
    // This prevents price manipulation from the client side.
    const verifiedItems = [];
    let serverTotal = 0;

    for (const item of items) {
      if (!item.product || !item.quantity || item.quantity < 1) {
        return res.status(400).json({ message: 'Each item must have a valid product ID and quantity.' });
      }

      const quantity = Math.floor(Number(item.quantity));
      if (!Number.isFinite(quantity) || quantity < 1 || quantity > 100) {
        return res.status(400).json({ message: 'Item quantity must be between 1 and 100.' });
      }

      // Look up the real product — use server-side price, not client-sent price
      const product = await Product.findById(item.product).select('name image price category');
      if (!product) {
        return res.status(400).json({ message: `Product not found: ${item.product}` });
      }

      verifiedItems.push({
        product: product._id,
        name: product.name,
        image: product.image,
        price: product.price,   // ← always use DB price, never trust client
        quantity,
      });

      serverTotal += product.price * quantity;
    }

    // If client sent a totalAmount, verify it matches (within ₦1 rounding tolerance)
    if (req.body.totalAmount !== undefined) {
      const clientTotal = Number(req.body.totalAmount);
      if (Math.abs(clientTotal - serverTotal) > 1) {
        return res.status(400).json({ message: 'Order total does not match product prices. Please refresh and try again.' });
      }
    }

    // Attach customer ID if a valid token is present
    let customerId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
        customerId = decoded.id || null;
      } catch {
        // Guest order — invalid/missing token is fine
      }
    }

    const order = await Order.create({
      customer: customerId,
      customerName: customerName ? String(customerName).trim().slice(0, MAX_STRING) : 'Guest',
      customerEmail: customerEmail ? String(customerEmail).trim().slice(0, 254) : '',
      customerPhone: customerPhone ? String(customerPhone).trim().slice(0, 20) : '',
      items: verifiedItems,
      totalAmount: serverTotal,   // ← always use server-calculated total
      deliveryAddress: deliveryAddress ? String(deliveryAddress).trim().slice(0, MAX_STRING) : '',
      notes: notes ? String(notes).trim().slice(0, MAX_STRING) : '',
    });

    res.status(201).json(order);
  } catch (error) {
    // Don't leak internal error details in production
    const message = process.env.NODE_ENV === 'production' ? 'Failed to place order.' : error.message;
    res.status(400).json({ message });
  }
});

// GET /api/orders/my  — logged-in customer's own orders
router.get('/my', protect, async (req, res) => {
  try {
    const orders = await Order.find({ customer: req.user._id })
      .sort({ createdAt: -1 })
      .populate('items.product', 'name image category');

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'Failed to fetch orders.' : error.message });
  }
});

// GET /api/orders/track/:reference  — public order tracking by reference
router.get('/track/:reference', async (req, res) => {
  try {
    // Sanitise reference — only allow alphanumeric and dash
    const ref = req.params.reference.replace(/[^A-Z0-9-]/gi, '').toUpperCase();

    const order = await Order.findOne({ reference: ref })
      .select('reference status totalAmount createdAt updatedAt items customerName')
      .populate('items.product', 'name image');

    if (!order) {
      return res.status(404).json({ message: 'Order not found. Please check your reference number.' });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'Failed to track order.' : error.message });
  }
});

// GET /api/orders  — all orders (admin only)
router.get('/', adminProtect, async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter = {};
    const validStatuses = ['Pending', 'Processing', 'Paid', 'Dispatched', 'Delivered', 'Cancelled'];
    if (req.query.status && validStatuses.includes(req.query.status)) {
      filter.status = req.query.status;
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('customer', 'name email'),
      Order.countDocuments(filter),
    ]);

    res.json({ orders, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'Failed to fetch orders.' : error.message });
  }
});

// GET /api/orders/:id  — single order detail (admin only)
router.get('/:id', adminProtect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer', 'name email phone')
      .populate('items.product', 'name image category');

    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: process.env.NODE_ENV === 'production' ? 'Failed to fetch order.' : error.message });
  }
});

// PATCH /api/orders/:id/status  — update order status (admin only)
router.patch('/:id/status', adminProtect, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['Pending', 'Processing', 'Paid', 'Dispatched', 'Delivered', 'Cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true },
    );

    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    res.json(order);
  } catch (error) {
    res.status(400).json({ message: process.env.NODE_ENV === 'production' ? 'Failed to update order.' : error.message });
  }
});

module.exports = router;
