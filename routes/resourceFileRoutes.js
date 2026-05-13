const express = require('express');
const router = express.Router();
const { uploadResource } = require('../middleware/uploadResource');
const { protect, authorize } = require('../middleware/authMiddleware');
const { paginate } = require('../middleware/resourceMiddleware');

const {
  createResource,
  getResources,
  getResourceById,
  updateResource,
  deleteResource
} = require('../controllers/resourceController');

// ==================== RESOURCE ROUTES ====================
    
// Public routes
router.get('/', paginate, getResources);
router.get('/:id', getResourceById);

// Protected routes (Admin only)
router.post('/',
  protect,
  authorize('super_admin', 'center_admin'),
  uploadResource.fields([
    { name: 'file', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 }
  ]),
  createResource
);

router.put('/:id',
  protect,
  authorize('super_admin', 'center_admin'),
  uploadResource.fields([
    { name: 'file', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 }
  ]),
  updateResource
);

router.delete('/:id',
  protect,
  authorize('super_admin', 'center_admin'),
  deleteResource
);

module.exports = router;
