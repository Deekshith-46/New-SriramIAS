const LiveClass = require('../models/LiveClass');
const Enrollment = require('../models/Enrollment');
const hmsClient = require('../config/hms');
const uploadToCloudinary = require('../utils/uploadToCloudinary');

// @desc    Create live class (Admin)
// @route   POST /api/live-classes
// @access  Private/Admin
// @type    multipart/form-data (supports thumbnail upload)
exports.createLiveClass = async (req, res) => {
   try {
      const {
         title,
         topic,
         lectureTitle,
         subject,
         startDateTime,
         endDateTime,
         courseId,
         centerId,
         categoryId,
         teacherName,
         description
      } = req.body;

      // Validate required fields
      if (!title || !topic || !startDateTime || !endDateTime || !courseId || !centerId || !categoryId || !teacherName) {
         return res.status(400).json({
            success: false,
            message: 'Missing required fields'
         });
      }

      // Center admin security validation
      if (req.user.role === 'center_admin') {
         if (!req.user.centerId || req.user.centerId.toString() !== centerId) {
            return res.status(403).json({
               success: false,
               message: 'You can only create classes for your own center'
            });
         }
      }

      // Auto-calculate duration
      const start = new Date(startDateTime);
      const end = new Date(endDateTime);
      const durationInMinutes = Math.round((end - start) / (1000 * 60));

      if (durationInMinutes <= 0) {
         return res.status(400).json({
            success: false,
            message: 'End time must be after start time'
         });
      }

      // Validate startDateTime is in the future
      if (start < new Date()) {
         return res.status(400).json({
            success: false,
            message: 'Class start time must be in the future'
         });
      }

      // Upload thumbnail to Cloudinary if provided
      let thumbnail = null;
      if (req.file) {
         thumbnail = await uploadToCloudinary(req.file, 'live-classes/thumbnails', 'image');
      }

      // Create room in 100ms (use timestamp to avoid duplicates)
      const room = await hmsClient.createRoom({
         name: `${title} - ${Date.now()}`,
         description: topic,
         template_id: process.env.HMS_TEMPLATE_ID
      });

      console.log('✅ 100ms Room Created:', room);

      // Save in MongoDB
      const liveClass = await LiveClass.create({
         title,
         topic,
         lectureTitle,
         subject,
         startDateTime: start,
         endDateTime: end,
         durationInMinutes,
         courseId,
         centerId,
         categoryId,
         roomId: room.id,
         roomName: room.name,
         teacherName,
         description: description || '',
         thumbnail: thumbnail,
         createdBy: req.user._id
      });

      res.status(201).json({
         success: true,
         message: 'Live class created successfully',
         data: liveClass
      });

   } catch (error) {
      console.error('Create Live Class Error:', error);
      res.status(500).json({
         success: false,
         message: 'Failed to create live class',
         error: error.message
      });
   }
};

// @desc    Get all live classes (Admin)
// @route   GET /api/live-classes
// @access  Private/Admin
exports.getAllLiveClasses = async (req, res) => {
   try {
      const { status, courseId, centerId, categoryId, page = 1, limit = 20 } = req.query;

      // Protect against large limits
      const safeLimit = Math.min(parseInt(limit) || 20, 100);
      const safePage = Math.max(parseInt(page) || 1, 1);

      // Filter out cancelled classes by default
      const filter = {};
      if (status) {
         filter.status = status;
      } else {
         filter.status = { $ne: 'cancelled' };
      }

      if (courseId) filter.courseId = courseId;
      if (centerId) filter.centerId = centerId;
      if (categoryId) filter.categoryId = categoryId;

      const skip = (safePage - 1) * safeLimit;

      const classes = await LiveClass.find(filter)
         .populate('courseId', 'title slug bannerImage')
         .populate('centerId', 'name')
         .populate('categoryId', 'name')
         .populate('createdBy', 'name email')
         .sort({ startDateTime: 1 })
         .skip(skip)
         .limit(safeLimit);

      const total = await LiveClass.countDocuments(filter);

      res.json({
         success: true,
         count: classes.length,
         total,
         pages: Math.ceil(total / safeLimit),
         currentPage: safePage,
         data: classes
      });

   } catch (error) {
      console.error('Get All Live Classes Error:', error);
      res.status(500).json({
         success: false,
         message: 'Failed to fetch live classes',
         error: error.message
      });
   }
};

// @desc    Get single live class (Admin)
// @route   GET /api/live-classes/:id
// @access  Private/Admin
exports.getLiveClassById = async (req, res) => {
   try {
      const liveClass = await LiveClass.findById(req.params.id)
         .populate('courseId', 'title slug bannerImage')
         .populate('centerId', 'name')
         .populate('categoryId', 'name')
         .populate('createdBy', 'name email');

      if (!liveClass) {
         return res.status(404).json({
            success: false,
            message: 'Live class not found'
         });
      }

      res.json({
         success: true,
         data: liveClass
      });

   } catch (error) {
      console.error('Get Live Class Error:', error);
      res.status(500).json({
         success: false,
         message: 'Failed to fetch live class',
         error: error.message
      });
   }
};

// @desc    Update live class (Admin)
// @route   PUT /api/live-classes/:id
// @access  Private/Admin
exports.updateLiveClass = async (req, res) => {
   try {
      const {
         title,
         topic,
         lectureTitle,
         subject,
         startDateTime,
         endDateTime,
         teacherName,
         description
      } = req.body;

      const liveClass = await LiveClass.findById(req.params.id);

      if (!liveClass) {
         return res.status(404).json({
            success: false,
            message: 'Live class not found'
         });
      }

      // Block editing for live/completed classes
      if (liveClass.status === 'live' || liveClass.status === 'completed') {
         return res.status(400).json({
            success: false,
            message: `Cannot edit a ${liveClass.status} class. Only scheduled classes can be edited.`
         });
      }

      // Safer duration calculation
      const updatedStart = startDateTime ? new Date(startDateTime) : liveClass.startDateTime;
      const updatedEnd = endDateTime ? new Date(endDateTime) : liveClass.endDateTime;
      const durationInMinutes = Math.round((updatedEnd - updatedStart) / (1000 * 60));

      if (durationInMinutes <= 0) {
         return res.status(400).json({
            success: false,
            message: 'End time must be after start time'
         });
      }

      // Update fields
      liveClass.title = title || liveClass.title;
      liveClass.topic = topic || liveClass.topic;
      liveClass.lectureTitle = lectureTitle || liveClass.lectureTitle;
      liveClass.subject = subject || liveClass.subject;
      liveClass.startDateTime = startDateTime ? new Date(startDateTime) : liveClass.startDateTime;
      liveClass.endDateTime = endDateTime ? new Date(endDateTime) : liveClass.endDateTime;
      liveClass.durationInMinutes = durationInMinutes;
      liveClass.teacherName = teacherName || liveClass.teacherName;
      liveClass.description = description !== undefined ? description : liveClass.description;

      await liveClass.save();

      res.json({
         success: true,
         message: 'Live class updated successfully',
         data: liveClass
      });

   } catch (error) {
      console.error('Update Live Class Error:', error);
      res.status(500).json({
         success: false,
         message: 'Failed to update live class',
         error: error.message
      });
   }
};

// @desc    Join live class (Student)
// @route   GET /api/live-classes/:id/join
// @access  Private
exports.joinClass = async (req, res) => {
   try {
      const liveClass = await LiveClass.findById(req.params.id);

      if (!liveClass) {
         return res.status(404).json({
            success: false,
            message: 'Live class not found'
         });
      }

      // Check if class is active
      if (!liveClass.isActive) {
         return res.status(400).json({
            success: false,
            message: 'This class is no longer available'
         });
      }

      // Check if class is cancelled
      if (liveClass.status === 'cancelled') {
         return res.status(400).json({
            success: false,
            message: 'This class has been cancelled'
         });
      }

      // Check if class is completed
      if (liveClass.status === 'completed') {
         return res.status(400).json({
            success: false,
            message: 'This class has already ended'
         });
      }

      // Time validation - allow join 15 mins before start until end
      const now = new Date();
      const joinWindowStart = new Date(liveClass.startDateTime.getTime() - (15 * 60 * 1000));
      const joinWindowEnd = new Date(liveClass.endDateTime.getTime());

      if (now < joinWindowStart) {
         const minutesUntilStart = Math.round((liveClass.startDateTime - now) / (1000 * 60));
         return res.status(400).json({
            success: false,
            message: `Class starts in ${minutesUntilStart} minutes. You can join 15 minutes before start time.`,
            canJoinAt: joinWindowStart
         });
      }

      if (now > joinWindowEnd) {
         return res.status(400).json({
            success: false,
            message: 'This class has already ended'
         });
      }

      // Verify enrollment
      const enrollment = await Enrollment.findOne({
         userId: req.user._id,
         courseId: liveClass.courseId,
         status: { $in: ['active', 'pending'] }
      });

      if (!enrollment) {
         return res.status(403).json({
            success: false,
            message: 'Access denied. You are not enrolled in this course.'
         });
      }

      // Generate 100ms auth token for student role (with 1-hour expiration)
      const authToken = await hmsClient.generateToken(
         liveClass.roomId,
         req.user._id.toString(),
         'student'
      );

      res.json({
         success: true,
         message: 'Join token generated successfully',
         data: {
            token: authToken,
            roomId: liveClass.roomId,
            roomName: liveClass.roomName,
            classTitle: liveClass.title,
            teacherName: liveClass.teacherName,
            startDateTime: liveClass.startDateTime,
            endDateTime: liveClass.endDateTime
         }
      });

   } catch (error) {
      console.error('Join Class Error:', error);
      res.status(500).json({
         success: false,
         message: 'Failed to join class',
         error: error.message
      });
   }
};

// @desc    Get today's live classes (Student)
// @route   GET /api/live-classes/today
// @access  Private
exports.getTodayClasses = async (req, res) => {
   try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      // Get student's enrollments
      const enrollments = await Enrollment.find({
         userId: req.user._id,
         status: { $in: ['active', 'pending'] }
      }).select('courseId');

      if (!enrollments.length) {
         return res.json({
            success: true,
            message: 'No enrollments found',
            data: []
         });
      }

      const courseIds = enrollments.map(e => e.courseId);

      const classes = await LiveClass.find({
         courseId: { $in: courseIds },
         startDateTime: { $gte: startOfDay, $lt: endOfDay },
         status: { $in: ['scheduled', 'live'] },
         isActive: true
      })
         .populate('courseId', 'title bannerImage')
         .populate('centerId', 'name')
         .sort({ startDateTime: 1 });

      res.json({
         success: true,
         count: classes.length,
         data: classes
      });

   } catch (error) {
      console.error('Get Today Classes Error:', error);
      res.status(500).json({
         success: false,
         message: 'Failed to fetch today\'s classes',
         error: error.message
      });
   }
};

// @desc    Get upcoming live classes (Student)
// @route   GET /api/live-classes/upcoming
// @access  Private
exports.getUpcomingClasses = async (req, res) => {
   try {
      const now = new Date();
      const { page = 1, limit = 10 } = req.query;
      
      // Protect against large limits
      const safeLimit = Math.min(parseInt(limit) || 10, 100);
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
            data: []
         });
      }

      const courseIds = enrollments.map(e => e.courseId);

      const classes = await LiveClass.find({
         courseId: { $in: courseIds },
         startDateTime: { $gte: now },
         status: 'scheduled',
         isActive: true
      })
         .populate('courseId', 'title bannerImage')
         .populate('centerId', 'name')
         .sort({ startDateTime: 1 })
         .skip(skip)
         .limit(safeLimit);

      const total = await LiveClass.countDocuments({
         courseId: { $in: courseIds },
         startDateTime: { $gte: now },
         status: 'scheduled',
         isActive: true
      });

      res.json({
         success: true,
         count: classes.length,
         total,
         pages: Math.ceil(total / safeLimit),
         currentPage: safePage,
         data: classes
      });

   } catch (error) {
      console.error('Get Upcoming Classes Error:', error);
      res.status(500).json({
         success: false,
         message: 'Failed to fetch upcoming classes',
         error: error.message
      });
   }
};

// @desc    Start live class (Teacher/Admin) - Auto generates teacher token
// @route   PUT /api/live-classes/:id/start
// @access  Private/Admin
exports.startClass = async (req, res) => {
   try {
      const liveClass = await LiveClass.findById(req.params.id);

      if (!liveClass) {
         return res.status(404).json({
            success: false,
            message: 'Live class not found'
         });
      }

      if (liveClass.status !== 'scheduled') {
         return res.status(400).json({
            success: false,
            message: `Class cannot be started. Current status: ${liveClass.status}`
         });
      }

      // Validate time - allow start only 15 mins before scheduled
      const now = new Date();
      const allowedStart = new Date(liveClass.startDateTime.getTime() - (15 * 60 * 1000));

      if (now < allowedStart) {
         const minutesUntilStart = Math.round((liveClass.startDateTime - now) / (1000 * 60));
         return res.status(400).json({
            success: false,
            message: `Class can only be started 15 minutes before scheduled time. ${minutesUntilStart} minutes remaining.`
         });
      }

      // Update status to live
      liveClass.status = 'live';
      await liveClass.save();

      // Auto-generate teacher token
      const teacherToken = await hmsClient.generateToken(
         liveClass.roomId,
         req.user._id.toString(),
         'teacher'
      );

      res.json({
         success: true,
         message: 'Live class started successfully',
         token: teacherToken,
         roomId: liveClass.roomId,
         roomName: liveClass.roomName,
         data: liveClass
      });

   } catch (error) {
      console.error('Start Class Error:', error);
      res.status(500).json({
         success: false,
         message: 'Failed to start class',
         error: error.message
      });
   }
};

// @desc    Cancel live class (Admin)
// @route   PUT /api/live-classes/:id/cancel
// @access  Private/Admin
exports.cancelClass = async (req, res) => {
   try {
      const liveClass = await LiveClass.findById(req.params.id);

      if (!liveClass) {
         return res.status(404).json({
            success: false,
            message: 'Live class not found'
         });
      }

      // Cannot cancel live classes
      if (liveClass.status === 'live') {
         return res.status(400).json({
            success: false,
            message: 'Cannot cancel a live class. Please end the session first.'
         });
      }

      liveClass.status = 'cancelled';
      await liveClass.save();

      res.json({
         success: true,
         message: 'Live class cancelled successfully',
         data: liveClass
      });

   } catch (error) {
      console.error('Cancel Class Error:', error);
      res.status(500).json({
         success: false,
         message: 'Failed to cancel class',
         error: error.message
      });
   }
};

// @desc    Teacher join live class
// @route   GET /api/live-classes/:id/teacher-join
// @access  Private/Admin
exports.teacherJoin = async (req, res) => {
   try {
      const liveClass = await LiveClass.findById(req.params.id);

      if (!liveClass) {
         return res.status(404).json({
            success: false,
            message: 'Live class not found'
         });
      }

      if (!liveClass.isActive) {
         return res.status(400).json({
            success: false,
            message: 'This class is no longer available'
         });
      }

      if (liveClass.status === 'cancelled') {
         return res.status(400).json({
            success: false,
            message: 'This class has been cancelled'
         });
      }

      // Teacher join security validation
      if (req.user.role === 'center_admin') {
         if (!req.user.centerId || req.user.centerId.toString() !== liveClass.centerId.toString()) {
            return res.status(403).json({
               success: false,
               message: 'You can only join classes for your own center'
            });
         }
      }

      // Generate 100ms auth token for teacher role (with 1-hour expiration)
      const authToken = await hmsClient.generateToken(
         liveClass.roomId,
         req.user._id.toString(),
         'teacher'
      );

      res.json({
         success: true,
         message: 'Teacher join token generated successfully',
         data: {
            token: authToken,
            roomId: liveClass.roomId,
            roomName: liveClass.roomName,
            classTitle: liveClass.title,
            teacherName: liveClass.teacherName,
            startDateTime: liveClass.startDateTime,
            endDateTime: liveClass.endDateTime
         }
      });

   } catch (error) {
      console.error('Teacher Join Error:', error);
      res.status(500).json({
         success: false,
         message: 'Failed to generate teacher join token',
         error: error.message
      });
   }
};

// @desc    Update class status (Admin)
// @route   PUT /api/live-classes/:id/status
// @access  Private/Admin
exports.updateClassStatus = async (req, res) => {
   try {
      const { status } = req.body;

      const liveClass = await LiveClass.findById(req.params.id);

      if (!liveClass) {
         return res.status(404).json({
            success: false,
            message: 'Live class not found'
         });
      }

      // State transition validation
      const validTransitions = {
         'scheduled': ['live', 'cancelled'],
         'live': ['completed'],
         'completed': [],
         'cancelled': []
      };

      const allowedStatuses = validTransitions[liveClass.status] || [];

      if (!allowedStatuses.includes(status)) {
         return res.status(400).json({
            success: false,
            message: `Invalid status transition from ${liveClass.status} to ${status}. Allowed: ${allowedStatuses.join(', ') || 'none'}`
         });
      }

      liveClass.status = status;
      await liveClass.save();

      res.json({
         success: true,
         message: 'Class status updated successfully',
         data: liveClass
      });

   } catch (error) {
      console.error('Update Class Status Error:', error);
      res.status(500).json({
         success: false,
         message: 'Failed to update class status',
         error: error.message
      });
   }
};

// @desc    Get live class statistics (Admin)
// @route   GET /api/live-classes/stats
// @access  Private/Admin
exports.getStats = async (req, res) => {
   try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      const stats = await LiveClass.aggregate([
         {
            $group: {
               _id: '$status',
               count: { $sum: 1 }
            }
         }
      ]);

      const todayClasses = await LiveClass.countDocuments({
         startDateTime: { $gte: startOfDay, $lt: endOfDay }
      });

      res.json({
         success: true,
         data: {
            byStatus: stats,
            todayClasses
         }
      });

   } catch (error) {
      console.error('Get Stats Error:', error);
      res.status(500).json({
         success: false,
         message: 'Failed to fetch statistics',
         error: error.message
      });
   }
};
