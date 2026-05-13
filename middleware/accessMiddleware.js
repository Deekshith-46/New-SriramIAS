const Enrollment = require('../models/Enrollment');

// Middleware to check course access for enrolled students
const checkCourseAccess = async (req, res, next) => {
  try {
    const enrollmentId = req.params.enrollmentId || req.params.id;
    const userId = req.user._id;

    if (!enrollmentId) {
      return res.status(400).json({
        success: false,
        message: 'Enrollment ID required'
      });
    }

    const enrollment = await Enrollment.findOne({
      _id: enrollmentId,
      userId: userId,
      isDeleted: false
    });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    // Check if access has expired
    if (enrollment.accessEndDate && new Date(enrollment.accessEndDate) < new Date()) {
      // Update enrollment status if not already expired
      if (enrollment.accessStatus !== 'EXPIRED') {
        enrollment.accessStatus = 'EXPIRED';
        enrollment.enrollmentStatus = enrollment.enrollmentStatus === 'ACTIVE' ? 'COMPLETED' : enrollment.enrollmentStatus;
        enrollment.courseCompletionStatus = 'COMPLETED';
        enrollment.expiredAt = enrollment.accessEndDate;
        await enrollment.save();
      }

      return res.status(403).json({
        success: false,
        message: 'Course access expired',
        expiredAt: enrollment.accessEndDate
      });
    }

    // Check if enrollment is active
    if (enrollment.enrollmentStatus === 'CANCELLED') {
      return res.status(403).json({
        success: false,
        message: 'Enrollment has been cancelled'
      });
    }

    if (enrollment.enrollmentStatus === 'PENDING') {
      return res.status(403).json({
        success: false,
        message: 'Enrollment is pending payment'
      });
    }

    // Attach enrollment to request for further use
    req.enrollment = enrollment;
    next();

  } catch (error) {
    console.error('checkCourseAccess middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Middleware to check if user is enrolled in a course
const checkEnrollment = async (req, res, next) => {
  try {
    const courseId = req.params.courseId || req.body.courseId;
    const userId = req.user._id;

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: 'Course ID required'
      });
    }

    const enrollment = await Enrollment.findOne({
      courseId: courseId,
      userId: userId,
      isDeleted: false,
      enrollmentStatus: { $in: ['ACTIVE', 'COMPLETED'] }
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: 'You are not enrolled in this course'
      });
    }

    // Check access expiry
    if (enrollment.accessEndDate && new Date(enrollment.accessEndDate) < new Date()) {
      if (enrollment.accessStatus !== 'EXPIRED') {
        enrollment.accessStatus = 'EXPIRED';
        enrollment.enrollmentStatus = enrollment.enrollmentStatus === 'ACTIVE' ? 'COMPLETED' : enrollment.enrollmentStatus;
        enrollment.courseCompletionStatus = 'COMPLETED';
        enrollment.expiredAt = enrollment.accessEndDate;
        await enrollment.save();
      }

      return res.status(403).json({
        success: false,
        message: 'Course access expired',
        expiredAt: enrollment.accessEndDate
      });
    }

    req.enrollment = enrollment;
    next();

  } catch (error) {
    console.error('checkEnrollment middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  checkCourseAccess,
  checkEnrollment
};