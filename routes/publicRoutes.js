const express = require('express');
const router = express.Router();
const Center = require('../models/Center');
const Category = require('../models/Category');

// ==========================================
// PUBLIC ROUTES (No authentication needed)
// ==========================================

// Get all centers
router.get('/centers', async (req, res) => {
  try {
    const centers = await Center.find({})
      .sort({ name: 1 })
      .select('name');
    
    res.json({
      success: true,
      count: centers.length,
      centers
    });
  } catch (error) {
    console.error('Get Centers Error:', error);
    res.status(500).json({
      message: 'Error fetching centers',
      error: error.message
    });
  }
});

// Get all categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await Category.find({})
      .sort({ name: 1 })
      .select('name categoryType');
    
    res.json({
      success: true,
      count: categories.length,
      categories
    });
  } catch (error) {
    console.error('Get Categories Error:', error);
    res.status(500).json({
      message: 'Error fetching categories',
      error: error.message
    });
  }
});

module.exports = router;
