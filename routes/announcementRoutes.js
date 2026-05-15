const express = require('express');
const router = express.Router();
const {
   createAnnouncement,
   getAllAnnouncements,
   getAnnouncementById,
   updateAnnouncement,
   deleteAnnouncement,
   getStudentAnnouncements,
   markAsRead,
   getUnreadCount
} = require('../controllers/announcementController');
const { protect } = require('../middleware/authMiddleware');
const { allowRoles } = require('../middleware/roleMiddleware');
const upload = require('../middleware/upload');

// ========================================
// STUDENT ROUTES (No role restriction)
// ========================================

// Get announcements for enrolled students
router.get('/student', protect, getStudentAnnouncements);

// Get unread announcement count
router.get('/student/unread-count', protect, getUnreadCount);

// Mark announcement as read
router.post('/:id/read', protect, markAsRead);

// ========================================
// ADMIN/TEACHER ROUTES
// ========================================

// All admin routes require authentication + admin role
router.use(protect, allowRoles('super_admin', 'center_admin'));

// Create announcement (supports multipart/form-data with thumbnail & pdf)
router.post('/', upload.fields([{ name: 'thumbnail', maxCount: 1 }, { name: 'pdf', maxCount: 1 }]), createAnnouncement);

// Get all announcements
router.get('/', getAllAnnouncements);

// Get single announcement
router.get('/:id', getAnnouncementById);

// Update announcement (supports multipart/form-data)
router.put('/:id', upload.fields([{ name: 'thumbnail', maxCount: 1 }, { name: 'pdf', maxCount: 1 }]), updateAnnouncement);

// Delete announcement permanently
router.delete('/:id', deleteAnnouncement);

module.exports = router;
