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
    const adminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();

    if (!adminEmail) {
      return res.status(500).json({ message: 'Admin credentials not configured on server.' });
    }

    if (normalizedEmail !== adminEmail) {
      return res.status(401).json({ message: 'Invalid admin email or password.' });
    }

    const storedPassword = process.env.ADMIN_PASSWORD || '';
    if (!storedPassword) {
      return res.status(500).json({ message: 'Admin password not configured on server.' });
    }

    let passwordMatch = false;
    const isBcrypt = storedPassword.startsWith('$2b$') || storedPassword.startsWith('$2a$');
    if (isBcrypt) {
      passwordMatch = await bcrypt.compare(password, storedPassword);
    } else {
      passwordMatch = password === storedPassword;
    }

    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid admin email or password.' });
    }

    const token = jwt.sign(
      { role: 'admin', email: normalizedEmail },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
    );

    res.json({ token });
  } catch (error) {
    console.error('Admin login error:', error.message);
    res.status(500).json({ message: 'Login failed. Please try again.' });
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

// GET /api/admin/stats/revenue
router.get('/stats/revenue', adminProtect, async (req, res) => {
  try {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(now.getDate() - 6);
    startDate.setHours(0, 0, 0, 0);

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

    const revenueMap = {};
    for (const entry of raw) {
      revenueMap[entry._id] = entry.revenue;
    }

    const result = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      const key = date.toISOString().slice(0, 10);
      result.push({ day: days[date.getDay()], revenue: revenueMap[key] ?? 0 });
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
