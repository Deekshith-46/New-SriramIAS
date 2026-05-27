const express = require('express');
const router = express.Router();
const {
  createBatchEnrollment,
  getEnrollmentsByBatch,
  getBatchEnrollmentById,
  updateBatchEnrollment,
  updateBatchEnrollmentStatus,
  deleteBatchEnrollment,
  getMoveStudentForm,
  moveStudentToBatch,
  getBatchTransfers,
  getBatchAuditHistory,
  getStudentEnrollmentHistory
} = require('../controllers/batchEnrollmentController');

router.get('/by-batch/:batchId', getEnrollmentsByBatch);
router.get('/batch/:batchId/transfers', getBatchTransfers);
router.get('/batch/:batchId/audit', getBatchAuditHistory);
router.get('/student/:studentId/history', getStudentEnrollmentHistory);

router.patch('/status/:id', updateBatchEnrollmentStatus);
router.get('/:id/move-form', getMoveStudentForm);
router.post('/:id/move', moveStudentToBatch);

router.post('/', createBatchEnrollment);
router.get('/:id', getBatchEnrollmentById);
router.put('/:id', updateBatchEnrollment);
router.delete('/:id', deleteBatchEnrollment);

module.exports = router;
