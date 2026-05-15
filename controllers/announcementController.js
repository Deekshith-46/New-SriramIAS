const Announcement = require('../models/Announcement');
const AnnouncementRead = require('../models/AnnouncementRead');
const Enrollment = require('../models/Enrollment');
const uploadToCloudinary = require('../utils/uploadToCloudinary');

// @desc    Create announcement (Admin)
// @route   POST /api/announcements
// @access  Private/Admin
// @type    multipart/form-data (supports thumbnail & pdf upload)
exports.createAnnouncement = async (req, res) => {
   try {
      const {
         title,
         description,
         announcementType,
         courseId,
         categoryId,
         centerId,
         publishedAt
      } = req.body;

      // Validate required fields
      if (!title || !description || !courseId) {
         return res.status(400).json({
            success: false,
            message: 'Missing required fields: title, description, and courseId are required'
         });
      }

      // Center admin security validation
      if (req.user.role === 'center_admin') {
         if (!req.user.centerId || (centerId && req.user.centerId.toString() !== centerId)) {
            return res.status(403).json({
               success: false,
               message: 'You can only create announcements for your own center'
            });
         }
      }

      // Upload thumbnail to Cloudinary if provided
      let thumbnail = null;
      if (req.files && req.files.thumbnail) {
         thumbnail = await uploadToCloudinary(req.files.thumbnail[0], 'announcements/thumbnails', 'image');
      }

      // Upload PDF to Cloudinary if provided
      let pdf = null;
      if (req.files && req.files.pdf) {
         const pdfFile = req.files.pdf[0];
         pdf = await uploadToCloudinary(pdfFile, 'announcements/pdfs', 'raw');
         pdf.originalName = pdfFile.originalname;
      }

      // Save in MongoDB
      const announcement = await Announcement.create({
         title,
         description,
         announcementType: announcementType || 'general',
         courseId,
         categoryId: categoryId || null,
         centerId: centerId || null,
         publishedAt: publishedAt || Date.now(),
         thumbnail,
         pdf,
         createdBy: req.user._id
      });

      res.status(201).json({
         success: true,
         message: 'Announcement created successfully',
         data: announcement
      });

   } catch (error) {
      console.error('Create Announcement Error:', error);
      res.status(500).json({
         success: false,
         message: 'Failed to create announcement',
         error: error.message
      });
   }
};

// @desc    Get all announcements (Admin)
// @route   GET /api/announcements
// @access  Private/Admin
exports.getAllAnnouncements = async (req, res) => {
   try {
      const { courseId, centerId, categoryId, announcementType, isActive, page = 1, limit = 20 } = req.query;

      // Protect against large limits
      const safeLimit = Math.min(parseInt(limit) || 20, 100);
      const safePage = Math.max(parseInt(page) || 1, 1);

      const filter = {};
      if (courseId) filter.courseId = courseId;
      if (centerId) filter.centerId = centerId;
      if (categoryId) filter.categoryId = categoryId;
      if (announcementType) filter.announcementType = announcementType;
      if (isActive !== undefined) filter.isActive = isActive === 'true';

      // Center admin can only see their center's announcements
      if (req.user.role === 'center_admin' && req.user.centerId) {
         filter.centerId = req.user.centerId;
      }

      const skip = (safePage - 1) * safeLimit;

      const announcements = await Announcement.find(filter)
         .populate('courseId', 'title slug')
         .populate('centerId', 'name')
         .populate('categoryId', 'name')
         .populate('createdBy', 'name email')
         .sort({ publishedAt: -1 })
         .skip(skip)
         .limit(safeLimit);

      const total = await Announcement.countDocuments(filter);

      res.json({
         success: true,
         count: announcements.length,
         total,
         pages: Math.ceil(total / safeLimit),
         currentPage: safePage,
         data: announcements
      });

   } catch (error) {
      console.error('Get All Announcements Error:', error);
      res.status(500).json({
         success: false,
         message: 'Failed to fetch announcements',
         error: error.message
      });
   }
};

// @desc    Get single announcement (Admin)
// @route   GET /api/announcements/:id
// @access  Private/Admin
exports.getAnnouncementById = async (req, res) => {
   try {
      const announcement = await Announcement.findById(req.params.id)
         .populate('courseId', 'title slug')
         .populate('centerId', 'name')
         .populate('categoryId', 'name')
         .populate('createdBy', 'name email');

      if (!announcement) {
         return res.status(404).json({
            success: false,
            message: 'Announcement not found'
         });
      }

      res.json({
         success: true,
         data: announcement
      });

   } catch (error) {
      console.error('Get Announcement Error:', error);
      res.status(500).json({
         success: false,
         message: 'Failed to fetch announcement',
         error: error.message
      });
   }
};

// @desc    Update announcement (Admin)
// @route   PUT /api/announcements/:id
// @access  Private/Admin
// @type    multipart/form-data
exports.updateAnnouncement = async (req, res) => {
   try {
      const {
         title,
         description,
         announcementType,
         courseId,
         categoryId,
         centerId,
         publishedAt
      } = req.body;

      const announcement = await Announcement.findById(req.params.id);

      if (!announcement) {
         return res.status(404).json({
            success: false,
            message: 'Announcement not found'
         });
      }

      // Center admin security validation
      if (req.user.role === 'center_admin') {
         if (!req.user.centerId || req.user.centerId.toString() !== announcement.centerId?.toString()) {
            return res.status(403).json({
               success: false,
               message: 'You can only update announcements for your own center'
            });
         }
      }

      // Upload new thumbnail if provided
      let thumbnail = announcement.thumbnail;
      if (req.files && req.files.thumbnail) {
         thumbnail = await uploadToCloudinary(req.files.thumbnail[0], 'announcements/thumbnails', 'image');
      }

      // Upload new PDF if provided
      let pdf = announcement.pdf;
      if (req.files && req.files.pdf) {
         const pdfFile = req.files.pdf[0];
         pdf = await uploadToCloudinary(pdfFile, 'announcements/pdfs', 'raw');
         pdf.originalName = pdfFile.originalname;
      }

      // Update fields
      announcement.title = title || announcement.title;
      announcement.description = description || announcement.description;
      announcement.announcementType = announcementType || announcement.announcementType;
      announcement.courseId = courseId || announcement.courseId;
      announcement.categoryId = categoryId !== undefined ? categoryId : announcement.categoryId;
      announcement.centerId = centerId !== undefined ? centerId : announcement.centerId;
      announcement.publishedAt = publishedAt ? new Date(publishedAt) : announcement.publishedAt;
      announcement.thumbnail = thumbnail;
      announcement.pdf = pdf;

      await announcement.save();

      res.json({
         success: true,
         message: 'Announcement updated successfully',
         data: announcement
      });

   } catch (error) {
      console.error('Update Announcement Error:', error);
      res.status(500).json({
         success: false,
         message: 'Failed to update announcement',
         error: error.message
      });
   }
};

// @desc    Delete announcement permanently (Admin)
// @route   DELETE /api/announcements/:id
// @access  Private/Admin
exports.deleteAnnouncement = async (req, res) => {
   try {
      const announcement = await Announcement.findById(req.params.id);

      if (!announcement) {
         return res.status(404).json({
            success: false,
            message: 'Announcement not found'
         });
      }

      // Center admin security validation
      if (req.user.role === 'center_admin') {
         if (!req.user.centerId || req.user.centerId.toString() !== announcement.centerId?.toString()) {
            return res.status(403).json({
               success: false,
               message: 'You can only delete announcements for your own center'
            });
         }
      }

      // Hard delete - remove from database completely
      await Announcement.findByIdAndDelete(req.params.id);

      // Also delete associated read records
      await AnnouncementRead.deleteMany({
         announcementId: req.params.id
      });

      res.json({
         success: true,
         message: 'Announcement deleted permanently',
         data: {
            _id: announcement._id,
            title: announcement.title
         }
      });

   } catch (error) {
      console.error('Delete Announcement Error:', error);
      res.status(500).json({
         success: false,
         message: 'Failed to delete announcement',
         error: error.message
      });
   }
};

// @desc    Get announcements for enrolled students
// @route   GET /api/announcements/student
// @access  Private
exports.getStudentAnnouncements = async (req, res) => {
   try {
      const { page = 1, limit = 20 } = req.query;

      // Protect against large limits
      const safeLimit = Math.min(parseInt(limit) || 20, 100);
      const safePage = Math.max(parseInt(page) || 1, 1);
      const skip = (safePage - 1) * safeLimit;

      // Get student's enrollments
      const enrollments = await Enrollment.find({
         userId: req.user._id,
         status: { $in: ['active', 'pending'] }
      }).select('courseId');

      if (!enrollments.length) {
         return res.json({
            success: true,
            message: 'No enrollments found',
            data: [],
            total: 0
         });
      }

      const courseIds = enrollments.map(e => e.courseId);

      // Fetch announcements for enrolled courses
      const announcements = await Announcement.find({
         courseId: { $in: courseIds },
         isActive: true
      })
         .populate('courseId', 'title slug')
         .populate('centerId', 'name')
         .sort({ publishedAt: -1 })
         .skip(skip)
         .limit(safeLimit);

      const total = await Announcement.countDocuments({
         courseId: { $in: courseIds },
         isActive: true
      });

      // Get read status for each announcement
      const announcementIds = announcements.map(a => a._id);
      const readRecords = await AnnouncementRead.find({
         userId: req.user._id,
         announcementId: { $in: announcementIds }
      }).select('announcementId');

      const readAnnouncementIds = new Set(readRecords.map(r => r.announcementId.toString()));

      // Add isRead flag to each announcement
      const announcementsWithReadStatus = announcements.map(announcement => {
         const announcementObj = announcement.toObject();
         announcementObj.isRead = readAnnouncementIds.has(announcement._id.toString());
         return announcementObj;
      });

      res.json({
         success: true,
         count: announcementsWithReadStatus.length,
         total,
         pages: Math.ceil(total / safeLimit),
         currentPage: safePage,
         data: announcementsWithReadStatus
      });

   } catch (error) {
      console.error('Get Student Announcements Error:', error);
      res.status(500).json({
         success: false,
         message: 'Failed to fetch announcements',
         error: error.message
      });
   }
};

// @desc    Mark announcement as read (Student)
// @route   POST /api/announcements/:id/read
// @access  Private
exports.markAsRead = async (req, res) => {
   try {
      const announcement = await Announcement.findById(req.params.id);

      if (!announcement) {
         return res.status(404).json({
            success: false,
            message: 'Announcement not found'
         });
      }

      if (!announcement.isActive) {
         return res.status(400).json({
            success: false,
            message: 'This announcement is no longer available'
         });
      }

      // Create or update read record (upsert)
      const readRecord = await AnnouncementRead.findOneAndUpdate(
         {
            announcementId: announcement._id,
            userId: req.user._id
         },
         {
            readAt: Date.now()
         },
         {
            upsert: true,
            new: true
         }
      );

      res.json({
         success: true,
         message: 'Announcement marked as read',
         data: readRecord
      });

   } catch (error) {
      console.error('Mark as Read Error:', error);
      res.status(500).json({
         success: false,
         message: 'Failed to mark announcement as read',
         error: error.message
      });
   }
};

// @desc    Get unread announcement count (Student)
// @route   GET /api/announcements/student/unread-count
// @access  Private
exports.getUnreadCount = async (req, res) => {
   try {
      // Get student's enrollments
      const enrollments = await Enrollment.find({
         userId: req.user._id,
         status: { $in: ['active', 'pending'] }
      }).select('courseId');

      if (!enrollments.length) {
         return res.json({
            success: true,
            data: { unreadCount: 0 }
         });
      }

      const courseIds = enrollments.map(e => e.courseId);

      // Get total active announcements
      const totalAnnouncements = await Announcement.countDocuments({
         courseId: { $in: courseIds },
         isActive: true
      });

      // Get read announcements
      const readAnnouncements = await AnnouncementRead.countDocuments({
         userId: req.user._id
      });

      const unreadCount = totalAnnouncements - readAnnouncements;

      res.json({
         success: true,
         data: {
            unreadCount: Math.max(0, unreadCount)
         }
      });

   } catch (error) {
      console.error('Get Unread Count Error:', error);
      res.status(500).json({
         success: false,
         message: 'Failed to fetch unread count',
         error: error.message
      });
   }
};
