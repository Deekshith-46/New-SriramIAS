const express = require('express');
const router = express.Router();
const optionalAuth = require('../middleware/optionalAuth');
const {
  getFilters,
  getResources,
  getById,
  viewResource,
  downloadResource
} = require('../controllers/portalCurrentAffairsController');

router.use(optionalAuth);

router.get('/filters', getFilters);
router.get('/resources', getResources);
router.get('/:id/view', viewResource);
router.get('/:id/download', downloadResource);
router.get('/:id', getById);

module.exports = router;
