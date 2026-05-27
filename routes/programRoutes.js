const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { requireSuperAdmin } = require('../middleware/requireSuperAdmin');
const {
  createProgram,
  getPrograms,
  getProgramById,
  getProgramsByCenter,
  updateProgram,
  updateProgramStatus,
  deleteProgram
} = require('../controllers/programController');

router.use(protect, requireSuperAdmin);

router.get('/by-center/:centerId', getProgramsByCenter);
router.patch('/status/:id', updateProgramStatus);

router.post('/', createProgram);
router.get('/', getPrograms);
router.get('/:id', getProgramById);
router.put('/:id', updateProgram);
router.delete('/:id', deleteProgram);

module.exports = router;
