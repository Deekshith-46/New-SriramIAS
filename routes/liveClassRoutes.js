const express = require('express');
const router = express.Router();
const {
   createLiveClass,
   getAllLiveClasses,
   getLiveClassById,
   updateLiveClass,
   cancelClass,
   getTodayClasses,
   getUpcomingClasses,
   joinClass,
   teacherJoin,
   startClass,
   updateClassStatus,
   getStats
} = require('../controllers/liveClassController');
const { protect } = require('../middleware/authMiddleware');
const { allowRoles } = require('../middleware/roleMiddleware');
const upload = require('../middleware/upload');

// ========================================
// STUDENT ROUTES (No role restriction)
// ========================================

// Get today's live classes
router.get('/today', protect, getTodayClasses);

// Get upcoming live classes
router.get('/upcoming', protect, getUpcomingClasses);

// Join live class (student) - MUST be before admin router.use()
router.get('/:id/join', protect, joinClass);

// ========================================
// ADMIN/TEACHER ROUTES
// ========================================

// All admin routes require authentication + admin role
router.use(protect, allowRoles('super_admin', 'center_admin'));

// Create live class (supports multipart/form-data with thumbnail)
router.post('/', upload.single('thumbnail'), createLiveClass);

// Get all live classes
router.get('/', getAllLiveClasses);

// Get statistics
router.get('/stats', getStats);

// SPECIFIC routes MUST come before GENERIC /:id routes
// Teacher join
router.get('/:id/teacher-join', teacherJoin);

// Start live class
router.put('/:id/start', startClass);

// Cancel live class
router.put('/:id/cancel', cancelClass);

// Update class status
router.put('/:id/status', updateClassStatus);

// GENERIC route - must be last
router.get('/:id', getLiveClassById);

// Update live class
router.put('/:id', updateLiveClass);

module.exports = router;
