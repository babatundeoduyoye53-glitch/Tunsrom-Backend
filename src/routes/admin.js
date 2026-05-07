const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const { adminProtect } = require('../middleware/adminMiddleware');

const router = express.Router();

// POST /api/admin/auth/login
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check email first
    if (normalizedEmail !== process.env.ADMIN_EMAIL.trim().toLowerCase()) {
      return res.status(401).json({ message: 'Invalid admin email or password.' });
    }

    // Compare password — supports both plain-text env var and bcrypt hash
    const storedPassword = process.env.ADMIN_PASSWORD;
    let passwordMatch = false;

    if (storedPassword.startsWith('$2b$') || storedPassword.startsWith('$2a$')) {
      // Stored as a bcrypt hash
      passwordMatch = await bcrypt.compare(password, storedPassword);
    } else {
      // Plain-text comparison (initial setup / migration path)
      passwordMatch = password === storedPassword;
    }

    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid admin email or password.' });
    }

    const token = jwt.sign(
      { role: 'admin', email: normalizedEmail },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN },
    );

    res.json({ token });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/admin/stats  (protected)
router.get('/stats', adminProtect, async (req, res) => {
  try {
    const [totalProducts, totalCustomers, totalOrders, revenueAgg, paidCount, pendingCount] =
      await Promise.all([
        Product.countDocuments(),
        User.countDocuments({ role: 'customer' }),
        Order.countDocuments(),
        Order.aggregate([
          { $match: { status: { $in: ['Paid', 'Delivered'] } } },
          { $group: { _id: null, total: { $sum: '$totalAmount' } } },
        ]),
        Order.countDocuments({ status: { $in: ['Paid', 'Delivered'] } }),
        Order.countDocuments({ status: { $in: ['Pending', 'Processing'] } }),
      ]);

    res.json({
      totalProducts,
      totalCustomers,
      totalOrders,
      totalRevenue: revenueAgg[0]?.total ?? 0,
      paidOrders: paidCount,
      pendingOrders: pendingCount,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/admin/stats/revenue  — daily revenue for the last 7 days (protected)
router.get('/stats/revenue', adminProtect, async (req, res) => {
  try {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();

    // Start of 6 days ago (inclusive) → end of today
    const startDate = new Date(now);
    startDate.setDate(now.getDate() - 6);
    startDate.setHours(0, 0, 0, 0);

    // Single aggregation — group by calendar day
    const raw = await Order.aggregate([
      {
        $match: {
          status: { $in: ['Paid', 'Delivered'] },
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$totalAmount' },
        },
      },
    ]);

    // Build a lookup map from the aggregation result
    const revenueMap = {};
    for (const entry of raw) {
      revenueMap[entry._id] = entry.revenue;
    }

    // Build the last 7 days in order, filling zeros for missing days
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      const key = date.toISOString().slice(0, 10); // YYYY-MM-DD
      result.push({ day: days[date.getDay()], revenue: revenueMap[key] ?? 0 });
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
