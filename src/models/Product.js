const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    // suppressReservedKeysWarning is set because 'isNew' is used intentionally
    // as a product flag (not the Mongoose document state)
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: ['lace', 'jacquard', 'caps', 'cashmere', 'cofflins', 'wool'],
      lowercase: true,
    },
    brand: {
      type: String,
      required: [true, 'Brand is required'],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    oldPrice: {
      type: Number,
      default: null,
    },
    image: {
      type: String,
      required: [true, 'Product image is required'],
    },
    isNew: {
      type: Boolean,
      default: false,
    },
    isSale: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    suppressReservedKeysWarning: true,
  },
);

module.exports = mongoose.model('Product', productSchema);
