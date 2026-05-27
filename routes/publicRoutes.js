const express = require('express');
const router = express.Router();
const Center = require('../models/Center');
const Category = require('../models/Category');

// ==========================================
// PUBLIC ROUTES (No authentication needed)
// ==========================================

// Active centers for student signup dropdown (public, minimal fields)
router.get('/centers/signup', async (req, res) => {
  try {
    const centers = await Center.find({
      isDeleted: false,
      status: 'ACTIVE'
    })
      .sort({ centerName: 1 })
      .select('centerName name');

    res.json({
      success: true,
      count: centers.length,
      data: centers.map((c) => ({
        _id: c._id,
        centerName: c.centerName || c.name
      }))
    });
  } catch (error) {
    console.error('Get signup centers error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching centers',
      error: error.message
    });
  }
});

// Get all centers (includes city/state for display pages)
router.get('/centers', async (req, res) => {
  try {
    const centers = await Center.find({
      isDeleted: false,
      status: 'ACTIVE'
    })
      .sort({ centerName: 1 })
      .select('centerName centerCode city state name');

    res.json({
      success: true,
      count: centers.length,
      centers: centers.map((c) => ({
        _id: c._id,
        name: c.centerName || c.name,
        centerName: c.centerName || c.name,
        centerCode: c.centerCode,
        city: c.city,
        state: c.state
      }))
    });
  } catch (error) {
    console.error('Get Centers Error:', error);
    res.status(500).json({
      message: 'Error fetching centers',
      error: error.message
    });
  }
});

const listLegacyCategories = async (req, res) => {
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
};

// Legacy global categories (course/coupon dropdowns until Course ERP migration)
router.get('/legacy-categories', listLegacyCategories);

module.exports = router;
