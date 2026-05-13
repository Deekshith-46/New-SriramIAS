const Enquiry = require('../models/Enquiry');
const Course = require('../models/Course');

// @desc    Create new enquiry (Public - No auth required)
// @route   POST /api/enquiries
// @access  Public
exports.createEnquiry = async (req, res) => {
  try {
    const {
      name,
      phone,
      email,
      center,
      centerName,
      course,
      courseTitle,
      category,
      categoryName,
      targetYear,
      expectation
    } = req.body;

    // Validate required fields
    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Name and phone are required'
      });
    }

    // Validate phone number (Indian format)
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 10-digit phone number'
      });
    }

    // Resolve course from ID or title
    let courseId = course;
    if (!courseId && courseTitle) {
      const courseDoc = await Course.findOne({ title: new RegExp(courseTitle, 'i') });
      if (courseDoc) {
        courseId = courseDoc._id;
      } else {
        return res.status(404).json({
          success: false,
          message: `Course not found: ${courseTitle}`
        });
      }
    }

    // Validate course exists
    const courseDoc = await Course.findById(courseId);
    if (!courseDoc) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // ✅ VALIDATE center (if provided) - must match course's center
    let centerId = courseDoc.center; // Always use course's center as source of truth
    if (center) {
      // If frontend sends center ID, validate it matches
      if (center !== courseDoc.center.toString()) {
        return res.status(400).json({
          success: false,
          message: 'Center does not match selected course'
        });
      }
    } else if (centerName) {
      // If frontend sends center name, validate it matches
      const Center = require('../models/Center');
      const centerDoc = await Center.findOne({ name: new RegExp(centerName, 'i') });
      if (centerDoc && centerDoc._id.toString() !== courseDoc.center.toString()) {
        return res.status(400).json({
          success: false,
          message: 'Center does not match selected course'
        });
      }
    }

    // ✅ VALIDATE category (if provided) - must match course's category
    let categoryId = courseDoc.category; // Always use course's category as source of truth
    if (category) {
      // If frontend sends category ID, validate it matches
      if (category !== courseDoc.category.toString()) {
        return res.status(400).json({
          success: false,
          message: 'Category does not match selected course'
        });
      }
    } else if (categoryName) {
      // If frontend sends category name, validate it matches
      const Category = require('../models/Category');
      const categoryDoc = await Category.findOne({ name: new RegExp(categoryName, 'i') });
      if (categoryDoc && categoryDoc._id.toString() !== courseDoc.category.toString()) {
        return res.status(400).json({
          success: false,
          message: 'Category does not match selected course'
        });
      }
    }

    // Spam prevention: Check if same phone submitted enquiry in last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentEnquiry = await Enquiry.findOne({
      phone,
      createdAt: { $gte: fiveMinutesAgo }
    });

    if (recentEnquiry) {
      return res.status(429).json({
        success: false,
        message: 'You have already submitted an enquiry recently. Please wait a few minutes before submitting again.',
        waitTime: '5 minutes'
      });
    }

    // Detect source type based on fields provided
    let source = 'main';
    if (targetYear || expectation) {
      source = 'demo';
    } else if (categoryName && !targetYear && !expectation) {
      source = 'course';
    }

    // Create enquiry
    const enquiry = await Enquiry.create({
      name,
      phone,
      email,
      center: centerId,
      course: courseId,
      category: categoryId,
      targetYear,
      expectation,
      source
    });

    // Populate response
    const populatedEnquiry = await Enquiry.findById(enquiry._id)
      .populate('course', 'title')
      .populate('center', 'name')
      .populate('category', 'name');

    res.status(201).json({
      success: true,
      message: 'Enquiry submitted successfully! Our team will contact you shortly.',
      enquiry: populatedEnquiry
    });

  } catch (error) {
    console.error('Create Enquiry Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting enquiry',
      error: error.message
    });
  }
};

// @desc    Get all enquiries (Super Admin only - via /api/admin/enquiries)
// @route   GET /api/admin/enquiries
// @access  Private (Super Admin)
exports.getEnquiries = async (req, res) => {
  try {
    const { status, center, course, source, page = 1, limit = 20 } = req.query;

    // Build filter
    const filter = {};

    // Filter by status
    if (status) {
      filter.status = status;
    }

    // Filter by center (optional for super admin)
    if (center) {
      filter.center = center;
    }

    // Filter by course
    if (course) {
      filter.course = course;
    }

    // Filter by source (main, course, demo)
    if (source) {
      filter.source = source;
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const enquiries = await Enquiry.find(filter)
      .populate('course', 'title')
      .populate('center', 'name')
      .populate('category', 'name')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Enquiry.countDocuments(filter);

    res.json({
      success: true,
      count: enquiries.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      enquiries
    });

  } catch (error) {
    console.error('Get Enquiries Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching enquiries',
      error: error.message
    });
  }
};

// @desc    Get enquiries for center (Center Admin & Employee)
// @route   GET /api/center/enquiries
// @access  Private (Center Admin, Employee)
exports.getCenterEnquiries = async (req, res) => {
  try {
    const user = req.user;
    const { status, course, source, page = 1, limit = 20 } = req.query;

    // Get center ID from user (handle both ObjectId and populated object)
    const centerId = user.center?._id || user.center;

    if (!centerId) {
      return res.status(400).json({
        success: false,
        message: 'Center not assigned to your account. Please contact admin.'
      });
    }

    // Build filter - FORCE their center only
    const filter = {
      center: centerId
    };

    // Filter by status
    if (status) {
      filter.status = status;
    }

    // Filter by course
    if (course) {
      filter.course = course;
    }

    // Filter by source (main, course, demo)
    if (source) {
      filter.source = source;
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const enquiries = await Enquiry.find(filter)
      .populate('course', 'title')
      .populate('center', 'name')
      .populate('category', 'name')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Enquiry.countDocuments(filter);

    res.json({
      success: true,
      count: enquiries.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      enquiries
    });

  } catch (error) {
    console.error('Get Center Enquiries Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching enquiries',
      error: error.message
    });
  }
};

// @desc    Get single enquiry
// @route   GET /api/admin/enquiries/:id
// @access  Private (Admin)
exports.getEnquiryById = async (req, res) => {
  try {
    const enquiry = await Enquiry.findById(req.params.id)
      .populate('course', 'title')
      .populate('center', 'name')
      .populate('category', 'name')
      .populate('assignedTo', 'name email');

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: 'Enquiry not found'
      });
    }

    res.json({
      success: true,
      enquiry
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching enquiry',
      error: error.message
    });
  }
};

// @desc    Update enquiry status
// @route   PUT /api/admin/enquiries/:id
// @access  Private (Admin)
exports.updateEnquiry = async (req, res) => {
  try {
    const { status, notes, assignedTo } = req.body;

    const enquiry = await Enquiry.findById(req.params.id);

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: 'Enquiry not found'
      });
    }

    // Build updates
    const updates = {};
    if (status) updates.status = status;
    if (notes) updates.notes = notes;
    if (assignedTo) updates.assignedTo = assignedTo;

    const updatedEnquiry = await Enquiry.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    )
      .populate('course', 'title')
      .populate('center', 'name')
      .populate('category', 'name')
      .populate('assignedTo', 'name email');

    res.json({
      success: true,
      message: 'Enquiry updated successfully',
      enquiry: updatedEnquiry
    });

  } catch (error) {
    console.error('Update Enquiry Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating enquiry',
      error: error.message
    });
  }
};

// @desc    Get enquiry statistics
// @route   GET /api/admin/enquiries/stats
// @access  Private (Super Admin, Center Admin, Employee)
exports.getEnquiryStats = async (req, res) => {
  try {
    const user = req.user;

    // Build filter based on role
    const filter = {};
    
    if (user.role === 'super_admin') {
      // Super Admin sees all stats
      // Can optionally filter by center if provided in query
      if (req.query.center) {
        filter.center = req.query.center;
      }
    } else if (user.role === 'center_admin' || user.role === 'employee') {
      // Center Admin & Employee see only their center's stats
      const centerId = user.center?._id || user.center;
      if (!centerId) {
        return res.status(400).json({
          success: false,
          message: 'Center not assigned to your account'
        });
      }
      filter.center = centerId;
    } else {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Get counts by status
    const stats = await Enquiry.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Format stats
    const statsObj = {
      total: 0,
      new: 0,
      contacted: 0,
      converted: 0,
      closed: 0
    };

    stats.forEach(stat => {
      statsObj[stat._id] = stat.count;
      statsObj.total += stat.count;
    });

    // Get recent enquiries (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentCount = await Enquiry.countDocuments({
      ...filter,
      createdAt: { $gte: sevenDaysAgo }
    });

    res.json({
      success: true,
      stats: {
        ...statsObj,
        recent: recentCount
      }
    });

  } catch (error) {
    console.error('Get Enquiry Stats Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
};
