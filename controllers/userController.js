const User = require('../models/User');
const Student = require('../models/Student');
const Parent = require('../models/Parent');
const BatchEnrollment = require('../models/BatchEnrollment');
const Enrollment = require('../models/Enrollment');
const { validate, validations } = require('../middleware/validation');
const { ACTIVE_STUDENT, resolveParentInfoForStudent } = require('../utils/studentService');
const {
  NOT_DELETED,
  ENROLLMENT_POPULATE,
  formatEnrollment
} = require('../utils/enrollmentErpHelpers');

// @desc    Get User Profile
// @route   GET /api/user/profile
// @access  Private
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let profileData = {};

    // Fetch additional data based on role
    if (user.role === 'student') {
      const student = await Student.findOne({ userId: user._id });
      if (student) {
        profileData.student = student;
      }
    } else if (user.role === 'parent') {
      const parent = await Parent.findOne({ userId: user._id }).populate('studentId');
      if (parent) {
        profileData.parent = parent;
      }
    }

    res.json({
      success: true,
      user: {
        ...user.toObject(),
        ...profileData
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get Complete Student Details
// @route   GET /api/user/student-details
// @access  Private (Student only)
exports.getStudentDetails = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Only students can access this endpoint
    if (user.role !== 'student') {
      return res.status(403).json({ 
        message: 'Only students can access this endpoint' 
      });
    }

    const userWithCenter = await User.findById(user._id)
      .populate('center', 'centerName centerCode name');

    // Get complete student profile
    const student = await Student.findOne({ userId: user._id, ...ACTIVE_STUDENT });

    if (!student) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    const parentInfo = await resolveParentInfoForStudent(student);

    const [batchEnrollments, courseEnrollments] = await Promise.all([
      BatchEnrollment.find({ student: student._id, ...NOT_DELETED })
        .populate(ENROLLMENT_POPULATE)
        .sort({ enrollmentDate: -1 })
        .lean(),
      Enrollment.find({ userId: user._id })
        .populate('courseId', 'courseId courseName title description')
        .populate('centerId', 'centerName centerCode')
        .select('-__v')
        .lean()
    ]);

    const batchEnrollmentRows = batchEnrollments.map((row) => formatEnrollment(row));

    res.json({
      success: true,
      student: {
        // User account details
        user: {
          id: userWithCenter._id,
          name: userWithCenter.name,
          email: userWithCenter.email,
          mobile: userWithCenter.mobile,
          role: userWithCenter.role,
          isActive: userWithCenter.isActive,
          center: userWithCenter.center
            ? {
                _id: userWithCenter.center._id,
                centerName:
                  userWithCenter.center.centerName || userWithCenter.center.name,
                centerCode: userWithCenter.center.centerCode
              }
            : null,
          createdAt: userWithCenter.createdAt,
          updatedAt: userWithCenter.updatedAt
        },
        // Student profile details
        profile: {
          id: student._id,
          parentName: student.parentName || null,
          parentMobile: student.parentMobile || null,
          parentEmail: student.parentEmail || null,
          parentMobileVerified: student.parentMobileVerified,
          parentEmailVerified: student.parentEmailVerified,
          createdAt: student.createdAt,
          updatedAt: student.updatedAt
        },
        // Parent account info (if added)
        parent: parentInfo
          ? {
              userId: parentInfo.userId || null,
              name: parentInfo.name || parentInfo.parentName,
              email: parentInfo.email || parentInfo.parentEmail,
              mobile: parentInfo.mobile || parentInfo.parentMobile,
              isActive: parentInfo.isActive ?? null,
              linkedAt: parentInfo.linkedAt || null
            }
          : null,
        // ERP batch enrollments (BATxxx)
        batchEnrollments: batchEnrollmentRows,
        totalBatchEnrollments: batchEnrollmentRows.length,
        // Online course enrollments (portal purchases)
        courseEnrollments: courseEnrollments || [],
        totalCourseEnrollments: courseEnrollments?.length || 0,
        // Backward-compatible alias — batch enrollments for student app
        enrollments: batchEnrollmentRows,
        totalEnrollments: batchEnrollmentRows.length
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update User Profile
// @route   PUT /api/user/profile
// @access  Private
exports.updateProfile = [
  validate(validations.updateProfile),
  async (req, res) => {
    try {
      const { name, email, mobile, parentName, parentMobile, parentEmail } = req.body;

      const user = await User.findById(req.user._id);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Update basic user fields
      if (name) user.name = name;
      if (email) user.email = email;
      if (mobile) user.mobile = mobile;

      await user.save();

      // Update student parent profile if this is a student
      let studentProfile;
      if (user.role === 'student') {
        studentProfile = await Student.findOne({ userId: user._id });

        if (!studentProfile) {
          return res.status(404).json({ message: 'Student profile not found' });
        }

        if (parentName !== undefined) studentProfile.parentName = parentName;
        if (parentMobile !== undefined) {
          studentProfile.parentMobile = parentMobile;
          studentProfile.parentMobileVerified = false;
        }
        if (parentEmail !== undefined) {
          studentProfile.parentEmail = parentEmail;
          studentProfile.parentEmailVerified = false;
        }

        await studentProfile.save();
      }

      res.json({
        success: true,
        message: 'Profile updated successfully',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          mobile: user.mobile,
          student: studentProfile || undefined
        }
      });
    } catch (error) {
      console.error(error);
      if (error.code === 11000) {
        return res.status(400).json({ 
          message: 'Email or mobile already in use by another account' 
        });
      }
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
];

// @desc    Student Update Parent Details (Profile Update)
// @route   PUT /api/user/update-parent-details
// @access  Private (Student only)
exports.updateParentDetails = [
  validate(validations.updateParentDetails),
  async (req, res) => {
    try {
      const { parentName, parentMobile, parentEmail } = req.body;

      const user = await User.findById(req.user._id);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Only students can update parent details
      if (user.role !== 'student') {
        return res.status(403).json({ 
          message: 'Only students can update parent details' 
        });
      }

      // Find student profile
      let studentProfile = await Student.findOne({ userId: user._id });

      if (!studentProfile) {
        return res.status(404).json({ message: 'Student profile not found' });
      }

      // Update parent details
      studentProfile.parentName = parentName;
      studentProfile.parentMobile = parentMobile;
      studentProfile.parentEmail = parentEmail;
      studentProfile.parentMobileVerified = false;
      studentProfile.parentEmailVerified = false;

      await studentProfile.save();

      // Create or update parent user account
      let parentUser = await User.findOne({
        $or: [
          { email: parentEmail.toLowerCase().trim() },
          { mobile: parentMobile.trim() }
        ],
        role: 'parent'
      });

      if (!parentUser) {
        // Create new parent user
        parentUser = await User.create({
          name: parentName,
          email: parentEmail,
          mobile: parentMobile,
          role: 'parent',
          isActive: true
        });

        // Link parent to student
        await Parent.create({
          userId: parentUser._id,
          studentId: studentProfile._id
        });

        console.log('✅ Parent account created and linked to student:', user.name);
      } else {
        // Update existing parent user
        parentUser.name = parentName;
        await parentUser.save();

        // Update or create parent link
        let parentLink = await Parent.findOne({ userId: parentUser._id });
        
        if (!parentLink) {
          await Parent.create({
            userId: parentUser._id,
            studentId: studentProfile._id
          });
        } else {
          parentLink.studentId = studentProfile._id;
          await parentLink.save();
        }

        console.log('✅ Parent account updated and linked to student:', user.name);
      }

      res.json({
        success: true,
        message: 'Parent details updated successfully. Parent can now login using their mobile or email.',
        parent: {
          id: parentUser._id,
          name: parentUser.name,
          email: parentUser.email,
          mobile: parentUser.mobile
        }
      });
    } catch (error) {
      console.error(error);
      if (error.code === 11000) {
        return res.status(400).json({ 
          message: 'Parent email or mobile already in use by another account' 
        });
      }
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
];

// @desc    Change Password
// @route   PUT /api/user/change-password
// @access  Private
exports.changePassword = [
  validate(validations.changePassword),
  async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;

      const user = await User.findById(req.user._id).select('+password');

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Check if user has password (OTP users may not have one)
      if (!user.password) {
        return res.status(400).json({ 
          message: 'Cannot change password. This account uses OTP login.' 
        });
      }

      // Verify current password
      const isMatch = await user.matchPassword(currentPassword);

      if (!isMatch) {
        return res.status(401).json({ message: 'Current password is incorrect' });
      }

      // Update password
      user.password = newPassword;
      await user.save();

      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
];
