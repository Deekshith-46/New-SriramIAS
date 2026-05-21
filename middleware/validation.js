const Joi = require('joi');
const { isGmailAddress, normalizeEmail } = require('../utils/studentEmail');

const studentGmailEmail = Joi.string()
  .email()
  .custom((value, helpers) => {
    const normalized = normalizeEmail(value);
    if (!isGmailAddress(normalized)) {
      return helpers.error('any.invalid');
    }
    return normalized;
  })
  .messages({
    'any.invalid': 'Student email must be a Gmail address (e.g. name@gmail.com)'
  });

// Validation schemas
const validations = {
  // Super Admin Login
  superAdminLogin: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required()
  }),

  // Regular Login (Center Admin & Employee)
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required()
  }),

  // Send OTP (Gmail enforced for student login in controller when role is student)
  sendOtp: Joi.object({
    mobile: Joi.string()
      .pattern(/^[6-9]\d{9}$/)
      .messages({ 'string.pattern.base': 'Invalid Indian mobile number' }),
    email: Joi.string().email(),
  }).or('mobile', 'email').messages({
    'object.missing': 'Either mobile or email is required'
  }),

  // Verify OTP
  verifyOtp: Joi.object({
    mobile: Joi.string().pattern(/^[6-9]\d{9}$/),
    email: Joi.string().email(),
    userId: Joi.string(),
    otp: Joi.string().length(6).pattern(/^\d{6}$/).required()
      .messages({ 
        'string.length': 'OTP must be 6 digits',
        'string.pattern.base': 'OTP must contain only numbers'
      })
  }).or('mobile', 'email', 'userId').messages({
    'object.missing': 'Either mobile, email, or userId is required'
  }),

  // Student Signup (email must be @gmail.com when provided)
  studentSignup: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    mobile: Joi.string().pattern(/^[6-9]\d{9}$/)
      .messages({ 'string.pattern.base': 'Invalid Indian mobile number' }),
    email: studentGmailEmail
  }).or('mobile', 'email').messages({
    'object.missing': 'Either mobile or email is required'
  }),

  // Verify Student Signup OTP
  verifyStudentSignup: Joi.object({
    userId: Joi.string().required()
      .messages({ 'any.required': 'User ID is required' }),
    otp: Joi.string().length(6).pattern(/^\d{6}$/).required()
      .messages({ 
        'string.length': 'OTP must be 6 digits',
        'string.pattern.base': 'OTP must contain only numbers'
      })
  }),

  // Parent Login Request
  parentLoginRequest: Joi.object({
    mobile: Joi.string().pattern(/^[6-9]\d{9}$/)
      .messages({ 'string.pattern.base': 'Invalid parent mobile number' }),
    email: Joi.string().email()
  }).or('mobile', 'email').messages({
    'object.missing': 'Either mobile or email is required'
  }),

  // Create Center Admin
  createCenterAdmin: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required()
      .messages({ 'string.min': 'Password must be at least 8 characters' }),
    location: Joi.string().valid('Hyderabad', 'New Delhi', 'Pune').required()
  }),

  // Create Employee
  createEmployee: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required()
      .messages({ 'string.min': 'Password must be at least 8 characters' }),
    permissions: Joi.array().items(Joi.string()),
    center: Joi.string().valid('Hyderabad', 'New Delhi', 'Pune')
  }),

  // Update User Status
  updateUserStatus: Joi.object({
    isActive: Joi.boolean().required()
  }),

  // Update Profile
  updateProfile: Joi.object({
    name: Joi.string().min(2).max(100),
    email: Joi.string().email(),
    mobile: Joi.string().pattern(/^[6-9]\d{9}$/)
      .messages({ 'string.pattern.base': 'Invalid Indian mobile number' }),
    parentName: Joi.string().min(2).max(100),
    parentMobile: Joi.string().pattern(/^[6-9]\d{9}$/)
      .messages({ 'string.pattern.base': 'Invalid Indian mobile number' }),
    parentEmail: Joi.string().email()
  }).min(1),

  // Change Password
  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(8).required()
      .messages({ 'string.min': 'New password must be at least 8 characters' })
  }),

  // Update Parent Details (Student)
  updateParentDetails: Joi.object({
    parentName: Joi.string().min(2).max(100).required()
      .messages({
        'string.min': 'Parent name must be at least 2 characters',
        'any.required': 'Parent name is required'
      }),
    parentMobile: Joi.string().pattern(/^[6-9]\d{9}$/).required()
      .messages({
        'string.pattern.base': 'Invalid Indian mobile number',
        'any.required': 'Parent mobile is required'
      }),
    parentEmail: Joi.string().email().required()
      .messages({
        'string.email': 'Invalid email address',
        'any.required': 'Parent email is required'
      })
  }),

  // Center Data Management
  createCenter: Joi.object({
    centerId: Joi.string().required()
      .messages({
        'any.required': 'Center ID is required'
      }),
    title: Joi.string().min(2).max(100).required().trim()
      .messages({
        'string.min': 'Title must be at least 2 characters',
        'string.max': 'Title cannot exceed 100 characters',
        'any.required': 'Title is required'
      }),
    phone: Joi.string().pattern(/^[6-9]\d{9}$/).required()
      .messages({
        'string.pattern.base': 'Invalid Indian mobile number'
      }),
    email: Joi.string().email().required()
      .messages({
        'string.email': 'Invalid email address',
        'any.required': 'Email is required'
      })
  }),

  updateCenter: Joi.object({
    title: Joi.string().min(2).max(100).trim(),
    phone: Joi.string().pattern(/^[6-9]\d{9}$/),
    email: Joi.string().email()
  }).min(1),

  createSuccessStory: Joi.object({
    name: Joi.string().min(2).max(100).required().trim()
      .messages({
        'string.min': 'Name must be at least 2 characters',
        'string.max': 'Name cannot exceed 100 characters',
        'any.required': 'Name is required'
      }),
    rank: Joi.string().min(1).max(50).required().trim()
      .messages({
        'string.min': 'Rank is required',
        'string.max': 'Rank cannot exceed 50 characters',
        'any.required': 'Rank is required'
      })
  }),

  updateSuccessStory: Joi.object({
    name: Joi.string().min(2).max(100).trim(),
    rank: Joi.string().min(1).max(50).trim()
  }).min(1),

  createFaculty: Joi.object({
    name: Joi.string().min(2).max(100).required().trim()
      .messages({
        'string.min': 'Name must be at least 2 characters',
        'string.max': 'Name cannot exceed 100 characters',
        'any.required': 'Name is required'
      }),
    title: Joi.string().min(2).max(100).required().trim()
      .messages({
        'string.min': 'Title must be at least 2 characters',
        'string.max': 'Title cannot exceed 100 characters',
        'any.required': 'Title is required'
      }),
    description: Joi.string().min(10).max(2000).required().trim()
      .messages({
        'string.min': 'Description must be at least 10 characters',
        'string.max': 'Description cannot exceed 2000 characters',
        'any.required': 'Description is required'
      })
  }),

  updateFaculty: Joi.object({
    name: Joi.string().min(2).max(100).trim(),
    title: Joi.string().min(2).max(100).trim(),
    description: Joi.string().min(10).max(2000).trim()
  }).min(1)
};

// Validation middleware
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // Return all errors
      stripUnknown: true // Remove unknown fields
    });

    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: details
      });
    }

    // Replace req.body with validated/sanitized data
    req.body = value;
    next();
  };
};

module.exports = {
  validations,
  validate
};
