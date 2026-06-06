const express = require('express');
const router = express.Router();
const subjectPdfUpload = require('../middleware/subjectPdfUpload');
const {
  createSubjectPdf,
  getSubjectPdfs,
  getSubjectPdfById,
  getSubjectPdfCreateForm,
  getSubjectPdfDashboardSummary,
  updateSubjectPdf,
  updateSubjectPdfVisibility,
  downloadSubjectPdf,
  deleteSubjectPdf
} = require('../controllers/subjectPdfController');

router.get('/create-form', getSubjectPdfCreateForm);
router.get('/dashboard-summary', getSubjectPdfDashboardSummary);

const maybePdfUpload = (req, res, next) => {
  const contentType = String(req.headers['content-type'] || '');
  if (contentType.includes('multipart/form-data')) {
    return subjectPdfUpload(req, res, next);
  }
  return next();
};

router.post('/', subjectPdfUpload, createSubjectPdf);
router.get('/', getSubjectPdfs);
router.get('/:id', getSubjectPdfById);
router.post('/:id/download', downloadSubjectPdf);
router.patch('/:id/visibility', updateSubjectPdfVisibility);
router.put('/:id', maybePdfUpload, updateSubjectPdf);
router.delete('/:id', deleteSubjectPdf);

module.exports = router;
