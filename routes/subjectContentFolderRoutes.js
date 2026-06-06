const express = require('express');
const router = express.Router();
const {
  listFolders,
  getFolderById,
  getFolderContentSummary,
  updateFolder,
  deleteFolder
} = require('../controllers/subjectContentFolderController');

router.get('/', listFolders);
router.get('/:id/content-summary', getFolderContentSummary);
router.get('/:id', getFolderById);
router.put('/:id', updateFolder);
router.delete('/:id', deleteFolder);

module.exports = router;
