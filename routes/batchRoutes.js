const express = require('express');
const router = express.Router();
const batchUpload = require('../middleware/batchUpload');
const {
  createBatch,
  getBatches,
  getBatchesDropdown,
  getBatchById,
  getBatchQuickView,
  updateBatch,
  updateBatchStatus,
  duplicateBatch,
  deleteBatch
} = require('../controllers/batchController');

router.get('/dropdown', getBatchesDropdown);
router.patch('/status/:id', updateBatchStatus);

router.post('/', batchUpload, createBatch);
router.get('/', getBatches);
// Duplicate supports multipart too (optional bannerImage file + text fields)
router.post('/:id/duplicate', batchUpload, duplicateBatch);
router.get('/:id/quick-view', getBatchQuickView);
router.get('/:id', getBatchById);
router.put('/:id', batchUpload, updateBatch);
router.delete('/:id', deleteBatch);

module.exports = router;
