const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    name: { type: String, required: true },
    image: { type: String },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    reference: {
      type: String,
      unique: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // null = guest order
    },
    customerName: { type: String, default: 'Guest' },
    customerEmail: { type: String, default: '' },
    customerPhone: { type: String, default: '' },
    items: [orderItemSchema],
    totalAmount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'Processing', 'Paid', 'Dispatched', 'Delivered', 'Cancelled'],
      default: 'Pending',
    },
    deliveryAddress: {
      type: String,
      default: '',
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  },
);

// Auto-generate order reference before saving (e.g. ORD-00042)
orderSchema.pre('save', async function (next) {
  if (this.reference) return next();

  const count = await mongoose.model('Order').countDocuments();
  this.reference = `ORD-${String(count + 1).padStart(5, '0')}`;
  next();
});

module.exports = mongoose.model('Order', orderSchema);
