const mongoose = require('mongoose');

/**
 * Single-document settings model.
 * We always upsert the document with _id = 'store' so there's only ever one.
 */
const settingsSchema = new mongoose.Schema(
  {
    _id: { type: String, default: 'store' },

    // Store Info
    storeName: { type: String, default: 'Tunsrom Fabrics' },
    tagline: { type: String, default: 'Premium fabrics for every occasion' },
    email: { type: String, default: 'tunsrom.fabrics@gmail.com' },
    phone: { type: String, default: '+234 8034619489' },
    address: { type: String, default: '' },
    logoUrl: { type: String, default: '' },

    // WhatsApp Config
    whatsappNumber: { type: String, default: '2348034619489' },
    whatsappOrderTemplate: {
      type: String,
      default: "Hi, I'd like to order:\n{items}\n\nTotal: {total}",
    },

    // Delivery
    deliveryZones: {
      type: [
        {
          zone: String,
          fee: Number,
          estimatedDays: String,
        },
      ],
      default: [
        { zone: 'Lagos', fee: 2000, estimatedDays: '1-2 days' },
        { zone: 'Abuja', fee: 3500, estimatedDays: '2-3 days' },
        { zone: 'Interstate', fee: 5000, estimatedDays: '3-5 days' },
      ],
    },

    // Social links
    instagram: { type: String, default: '' },
    facebook: { type: String, default: '' },
    tiktok: { type: String, default: '' },
  },
  {
    _id: false, // we manage _id manually
    timestamps: true,
  },
);

module.exports = mongoose.model('Settings', settingsSchema);
