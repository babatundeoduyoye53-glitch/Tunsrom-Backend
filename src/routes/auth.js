const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Simple email format check
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function signToken(id) {
  return jwt.sign({ id, role: 'customer' }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, confirmPassword, phone } = req.body;

    // ── Input validation ──────────────────────────────────────────────
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Full name is required.' });
    }
    if (name.trim().length > 100) {
      return res.status(400).json({ message: 'Name is too long.' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ message: 'Email is required.' });
    }
    if (!isValidEmail(email.trim())) {
      return res.status(400).json({ message: 'Please enter a valid email address.' });
    }
    if (!password || password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    }
    if (password.length > 128) {
      return res.status(400).json({ message: 'Password is too long.' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match.' });
    }
    if (phone && phone.trim().length > 20) {
      return res.status(400).json({ message: 'Phone number is too long.' });
    }

    // ── Duplicate check ───────────────────────────────────────────────
    const existing = await User.findOne({ email: email.trim().toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    // ── Create user ───────────────────────────────────────────────────
    const user = await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone ? phone.trim() : '',
      password,
    });

    const token = signToken(user._id);

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (error) {
    const isDev = process.env.NODE_ENV !== 'production';
    res.status(500).json({ message: isDev ? error.message : 'Registration failed. Please try again.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }
    if (!isValidEmail(email.trim())) {
      return res.status(400).json({ message: 'Please enter a valid email address.' });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+password');

    // Use a generic message — don't reveal whether email exists
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = signToken(user._id);

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (error) {
    const isDev = process.env.NODE_ENV !== 'production';
    res.status(500).json({ message: isDev ? error.message : 'Login failed. Please try again.' });
  }
});

// GET /api/auth/me  (protected)
router.get('/me', protect, (req, res) => {
  res.json({
    id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    phone: req.user.phone,
  });
});

module.exports = router;
