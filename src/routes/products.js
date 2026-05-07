const express = require('express');
const multer = require('multer');
const Product = require('../models/Product');
const { adminProtect } = require('../middleware/adminMiddleware');
const cloudinary = require('../config/cloudinary');

const router = express.Router();

// Use memory storage — we stream the buffer directly to Cloudinary
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter(req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed.'));
    }
  },
});

/**
 * Upload a buffer to Cloudinary and return the secure URL.
 */
function uploadToCloudinary(buffer, folder = 'tunsrom-products') {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      },
    );
    stream.end(buffer);
  });
}

// GET /api/products  — list all, optional ?category=lace&search=french
router.get('/', async (req, res) => {
  try {
    const filter = {};

    if (req.query.category && req.query.category !== 'all') {
      filter.category = req.query.category.toLowerCase();
    }

    if (req.query.search) {
      const regex = new RegExp(req.query.search, 'i');
      filter.$or = [{ name: regex }, { brand: regex }, { category: regex }];
    }

    const products = await Product.find(filter).sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/products  (admin only)
router.post('/', adminProtect, upload.single('image'), async (req, res) => {
  try {
    const { name, category, brand, price, oldPrice, isNew, isSale } = req.body;

    // Image can be a URL (from frontend) or an uploaded file
    let image = req.body.image || '';
    if (req.file) {
      image = await uploadToCloudinary(req.file.buffer);
    }

    if (!image) {
      return res.status(400).json({ message: 'Product image is required.' });
    }

    const product = await Product.create({
      name,
      category,
      brand,
      price: Number(price),
      oldPrice: oldPrice ? Number(oldPrice) : null,
      image,
      isNew: isNew === 'true' || isNew === true,
      isSale: isSale === 'true' || isSale === true,
    });

    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PUT /api/products/:id  (admin only)
router.put('/:id', adminProtect, upload.single('image'), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    const { name, category, brand, price, oldPrice, isNew, isSale } = req.body;

    if (name !== undefined) product.name = name;
    if (category !== undefined) product.category = category;
    if (brand !== undefined) product.brand = brand;
    if (price !== undefined) product.price = Number(price);
    if (oldPrice !== undefined) product.oldPrice = oldPrice ? Number(oldPrice) : null;
    if (isNew !== undefined) product.isNew = isNew === 'true' || isNew === true;
    if (isSale !== undefined) product.isSale = isSale === 'true' || isSale === true;

    if (req.file) {
      product.image = await uploadToCloudinary(req.file.buffer);
    } else if (req.body.image) {
      product.image = req.body.image;
    }

    await product.save();
    res.json(product);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE /api/products/:id  (admin only)
router.delete('/:id', adminProtect, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }
    res.json({ message: 'Product deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
