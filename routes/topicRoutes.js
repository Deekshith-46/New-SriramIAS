const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { requireSuperAdmin } = require('../middleware/requireSuperAdmin');
const {
  createTopic,
  getTopics,
  getTopicsBySubject,
  getTopicById,
  updateTopic,
  updateTopicStatus,
  deleteTopic
} = require('../controllers/topicController');

router.use(protect, requireSuperAdmin);

router.get('/by-subject/:subjectId', getTopicsBySubject);
router.patch('/status/:id', updateTopicStatus);

router.post('/', createTopic);
router.get('/', getTopics);
router.get('/:id', getTopicById);
router.put('/:id', updateTopic);
router.delete('/:id', deleteTopic);

module.exports = router;
