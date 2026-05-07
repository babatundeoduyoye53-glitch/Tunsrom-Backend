const express = require('express');
const bcrypt = require('bcrypt');
const Settings = require('../models/Settings');
const { adminProtect } = require('../middleware/adminMiddleware');

const router = express.Router();

// Helper — get or create the single settings document
async function getSettings() {
  let settings = await Settings.findById('store');
  if (!settings) {
    settings = await Settings.create({ _id: 'store' });
  }
  return settings;
}

// GET /api/settings  (admin only)
router.get('/', adminProtect, async (req, res) => {
  try {
    const settings = await getSettings();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PATCH /api/settings/store-info  (admin only)
router.patch('/store-info', adminProtect, async (req, res) => {
  try {
    const { storeName, tagline, email, phone, address, logoUrl } = req.body;

    const settings = await Settings.findByIdAndUpdate(
      'store',
      { storeName, tagline, email, phone, address, logoUrl },
      { new: true, upsert: true, runValidators: true },
    );

    res.json({ message: 'Store info updated.', settings });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PATCH /api/settings/whatsapp  (admin only)
router.patch('/whatsapp', adminProtect, async (req, res) => {
  try {
    const { whatsappNumber, whatsappOrderTemplate } = req.body;

    if (!whatsappNumber || !whatsappNumber.trim()) {
      return res.status(400).json({ message: 'WhatsApp number is required.' });
    }

    const settings = await Settings.findByIdAndUpdate(
      'store',
      { whatsappNumber: whatsappNumber.trim(), whatsappOrderTemplate },
      { new: true, upsert: true },
    );

    res.json({ message: 'WhatsApp config updated.', settings });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PATCH /api/settings/delivery  (admin only)
router.patch('/delivery', adminProtect, async (req, res) => {
  try {
    const { deliveryZones } = req.body;

    const settings = await Settings.findByIdAndUpdate(
      'store',
      { deliveryZones },
      { new: true, upsert: true },
    );

    res.json({ message: 'Delivery zones updated.', settings });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PATCH /api/settings/social  (admin only)
router.patch('/social', adminProtect, async (req, res) => {
  try {
    const { instagram, facebook, tiktok } = req.body;

    const settings = await Settings.findByIdAndUpdate(
      'store',
      { instagram, facebook, tiktok },
      { new: true, upsert: true },
    );

    res.json({ message: 'Social links updated.', settings });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PATCH /api/settings/admin-password  (admin only)
router.patch('/admin-password', adminProtect, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: 'All password fields are required.' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters.' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'New passwords do not match.' });
    }

    // Verify current password — supports plain-text env var and bcrypt hash
    const storedPassword = process.env.ADMIN_PASSWORD;
    let passwordMatch = false;

    if (storedPassword.startsWith('$2b$') || storedPassword.startsWith('$2a$')) {
      passwordMatch = await bcrypt.compare(currentPassword, storedPassword);
    } else {
      passwordMatch = currentPassword === storedPassword;
    }

    if (!passwordMatch) {
      return res.status(401).json({ message: 'Current password is incorrect.' });
    }

    // Hash the new password so the admin can store it in their Render env vars
    const hashed = await bcrypt.hash(newPassword, 12);

    res.json({
      message:
        'Password change verified. Set ADMIN_PASSWORD to the value below in your Render dashboard env vars.',
      hashedPassword: hashed,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/settings/public  — public endpoint (no auth) for frontend to read store config
router.get('/public', async (req, res) => {
  try {
    const settings = await getSettings();
    // Only expose safe fields to the public
    res.json({
      storeName: settings.storeName,
      tagline: settings.tagline,
      email: settings.email,
      phone: settings.phone,
      address: settings.address,
      whatsappNumber: settings.whatsappNumber,
      instagram: settings.instagram,
      facebook: settings.facebook,
      tiktok: settings.tiktok,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
