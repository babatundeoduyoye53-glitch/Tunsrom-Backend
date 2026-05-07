/**
 * Seed script — populates the database with the 16 products from the frontend.
 * Run once with: node src/seed.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./models/Product');

const products = [
  {
    name: 'Premium French Lace',
    category: 'lace',
    brand: 'Atelier Reserve',
    price: 45000,
    oldPrice: 60000,
    isNew: true,
    isSale: true,
    image: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400&h=500&fit=crop&q=80',
  },
  {
    name: 'Royal Cord Lace',
    category: 'lace',
    brand: 'Celebration Edit',
    price: 52000,
    oldPrice: null,
    isNew: true,
    isSale: false,
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=500&fit=crop&q=80',
  },
  {
    name: 'Champagne Guipure Lace',
    category: 'lace',
    brand: 'Signature Loom',
    price: 38000,
    oldPrice: 45000,
    isNew: false,
    isSale: true,
    image: 'https://images.unsplash.com/photo-1617791160536-598cf32026fb?w=400&h=500&fit=crop&q=80',
  },
  {
    name: 'Pearl Embroidered Lace',
    category: 'lace',
    brand: 'Bridal House',
    price: 48000,
    oldPrice: null,
    isNew: false,
    isSale: false,
    image: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=400&h=500&fit=crop&q=80',
  },
  {
    name: 'Luxury Jacquard Fabric',
    category: 'jacquard',
    brand: 'Heritage Weave',
    price: 75000,
    oldPrice: 90000,
    isNew: true,
    isSale: true,
    image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=500&fit=crop&q=80',
  },
  {
    name: 'Silk Bloom Jacquard',
    category: 'jacquard',
    brand: 'Occasion Series',
    price: 85000,
    oldPrice: null,
    isNew: true,
    isSale: false,
    image: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=400&h=500&fit=crop&q=80',
  },
  {
    name: 'Damask Jacquard Weave',
    category: 'jacquard',
    brand: 'Statement Edit',
    price: 65000,
    oldPrice: 78000,
    isNew: false,
    isSale: true,
    image: 'https://images.unsplash.com/photo-1590735213920-68192a487bc2?w=400&h=500&fit=crop&q=80',
  },
  {
    name: 'Midnight Floral Jacquard',
    category: 'jacquard',
    brand: 'Prestige House',
    price: 92000,
    oldPrice: null,
    isNew: false,
    isSale: false,
    image: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=400&h=500&fit=crop&q=80',
  },
  {
    name: 'Merino Wool Blend',
    category: 'wool',
    brand: 'Cold Season Edit',
    price: 120000,
    oldPrice: 150000,
    isNew: true,
    isSale: true,
    image: 'https://images.unsplash.com/photo-1580301762395-21ce84d00bc6?w=400&h=500&fit=crop&q=80',
  },
  {
    name: 'Cashmere Touch Wool',
    category: 'wool',
    brand: 'Soft Structure',
    price: 180000,
    oldPrice: null,
    isNew: true,
    isSale: false,
    image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400&h=500&fit=crop&q=80',
  },
  {
    name: 'Alpaca Luxe Wool',
    category: 'wool',
    brand: 'Layering Studio',
    price: 95000,
    oldPrice: 110000,
    isNew: false,
    isSale: true,
    image: 'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=400&h=500&fit=crop&q=80',
  },
  {
    name: 'Classic Wool Suiting',
    category: 'wool',
    brand: 'Tailor Select',
    price: 78000,
    oldPrice: null,
    isNew: false,
    isSale: false,
    image: 'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=400&h=500&fit=crop&q=80',
  },
  {
    name: 'Velvet Trim Cap',
    category: 'caps',
    brand: 'Finishing Touch',
    price: 15000,
    oldPrice: 20000,
    isNew: true,
    isSale: true,
    image: 'https://images.unsplash.com/photo-1521369909029-2afed882baee?w=400&h=500&fit=crop&q=80',
  },
  {
    name: 'Structured Ankara Cap',
    category: 'caps',
    brand: 'Market Favorite',
    price: 12000,
    oldPrice: null,
    isNew: true,
    isSale: false,
    image: 'https://images.unsplash.com/photo-1529958030586-3aae4ca485ff?w=400&h=500&fit=crop&q=80',
  },
  {
    name: 'Festival Sun Hat',
    category: 'caps',
    brand: 'Outdoor Edit',
    price: 18000,
    oldPrice: 22000,
    isNew: false,
    isSale: true,
    image: 'https://images.unsplash.com/photo-1514327605112-b887c0e61c0a?w=400&h=500&fit=crop&q=80',
  },
  {
    name: 'Signature Fedora Cap',
    category: 'caps',
    brand: 'Luxury Finish',
    price: 25000,
    oldPrice: null,
    isNew: false,
    isSale: false,
    image: 'https://images.unsplash.com/photo-1533827432537-70133748f5c8?w=400&h=500&fit=crop&q=80',
  },
];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  await Product.deleteMany({});
  console.log('Cleared existing products');

  await Product.insertMany(products);
  console.log(`Seeded ${products.length} products`);

  await mongoose.disconnect();
  console.log('Done. Database disconnected.');
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
