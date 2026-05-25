const express = require('express');
const router = express.Router();
const optionalAuth = require('../middleware/optionalAuth');
const {
  getFilters,
  getDynamicFilters,
  getResources,
  getById,
  viewResource,
  downloadResource
} = require('../controllers/portalFreeResourcesController');

router.use(optionalAuth);

router.get('/filters', getFilters);
router.get('/dynamic-filters', getDynamicFilters);
router.get('/resources', getResources);

router.get('/:id/view', viewResource);
router.get('/:id/download', downloadResource);
router.get('/:id', getById);

module.exports = router;
