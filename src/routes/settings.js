const express = require('express');
const bcrypt = require('bcrypt');
const Settings = require('../models/Settings');
const { adminProtect } = require('../middleware/adminMiddleware');

const router = express.Router();

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

// PATCH /api/settings/store-info
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

// PATCH /api/settings/whatsapp
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

// PATCH /api/settings/delivery
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

// PATCH /api/settings/social
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

// PATCH /api/settings/admin-password
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

    const storedPassword = process.env.ADMIN_PASSWORD || '';
    let passwordMatch = false;
    const isBcrypt = storedPassword.startsWith('$2b$') || storedPassword.startsWith('$2a$');
    if (isBcrypt) {
      passwordMatch = await bcrypt.compare(currentPassword, storedPassword);
    } else {
      passwordMatch = currentPassword === storedPassword;
    }

    if (!passwordMatch) {
      return res.status(401).json({ message: 'Current password is incorrect.' });
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    res.json({
      message: 'Password verified. Set ADMIN_PASSWORD to the value below in your Render env vars.',
      hashedPassword: hashed,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/settings/public  — no auth required
router.get('/public', async (req, res) => {
  try {
    const settings = await getSettings();
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
