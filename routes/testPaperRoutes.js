const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { allowRoles } = require('../middleware/roleMiddleware');
const {
  createPaper,
  getPaperFilters,
  getAllPapers,
  getPaper,
  updatePaper,
  deletePaper
} = require('../controllers/testPaperController');

// Public routes
router.get('/filters', getPaperFilters);
router.get('/', getAllPapers);
router.get('/:id', getPaper);

// Protected routes (Admin only)
router.post(
  '/',
  protect,
  allowRoles('super_admin', 'center_admin'),
  createPaper
);

router.put(
  '/:id',
  protect,
  allowRoles('super_admin', 'center_admin'),
  updatePaper
);

router.delete(
  '/:id',
  protect,
  allowRoles('super_admin', 'center_admin'),
  deletePaper
);

module.exports = router;
