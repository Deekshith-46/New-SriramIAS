const User = require('../models/User');
const Employee = require('../models/Employee');
const Center = require('../models/Center');
const Category = require('../models/Category');
const { validate, validations } = require('../middleware/validation');

// @desc    Create Center Admin
// @route   POST /api/admin/create-center-admin
// @access  Super Admin
exports.createCenterAdmin = [
  validate(validations.createCenterAdmin),
  async (req, res) => {
    try {
      const { name, email, password, location } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ email });

      if (existingUser) {
        return res.status(400).json({ 
          message: 'User already exists with this email' 
        });
      }

      // Create center admin user
      const user = await User.create({
        name,
        email,
        password,
        role: 'center_admin',
        location,
        isActive: true
      });

      // Create or update center record
      let center = await Center.findOne({ location });

      if (center) {
        center.adminId = user._id;
        await center.save();
      } else {
        await Center.create({
          location,
          adminId: user._id
        });
      }

      res.status(201).json({
        success: true,
        message: 'Center admin created successfully',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          location: user.location
        }
      });
    } catch (error) {
      console.error(error);
      if (error.code === 11000) {
        return res.status(400).json({ 
          message: 'User already exists with this email' 
        });
      }
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
];

// @desc    Create Employee
// @route   POST /api/admin/create-employee
// @access  Center Admin
exports.createEmployee = [
  validate(validations.createEmployee),
  async (req, res) => {
    try {
      const { name, email, password, permissions, center } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ email });

      if (existingUser) {
        return res.status(400).json({ 
          message: 'User already exists with this email' 
        });
      }

      // Use center admin's location if not provided
      const employeeLocation = center || req.user.location;

      // Create employee user
      const user = await User.create({
        name,
        email,
        password,
        role: 'employee',
        location: employeeLocation,
        isActive: true
      });

      // Create employee profile
      const employee = await Employee.create({
        userId: user._id,
        permissions: permissions || [],
        center: employeeLocation
      });

      res.status(201).json({
        success: true,
        message: 'Employee created successfully',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          location: user.location,
          permissions: employee.permissions
        }
      });
    } catch (error) {
      console.error(error);
      if (error.code === 11000) {
        return res.status(400).json({ 
          message: 'User already exists with this email' 
        });
      }
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
];

// @desc    Get All Users (Filtered by Role and Location)
// @route   GET /api/admin/users
// @access  Super Admin, Center Admin
exports.getUsers = async (req, res) => {
  try {
    const { role, location, page = 1, limit = 10 } = req.query;

    // Build filter
    const filter = {};

    // Filter by role if provided
    if (role) {
      filter.role = role;
    }

    // Filter by location based on user role
    if (req.user.role === 'center_admin') {
      // Center admins can only see users in their location
      filter.location = req.user.location;
    } else if (location && req.user.role === 'super_admin') {
      // Super admins can filter by location
      filter.location = location;
    }

    // Pagination
    const skip = (page - 1) * limit;

    const users = await User.find(filter)
      .select('-password')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      count: users.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      users
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update User Status (Activate/Deactivate)
// @route   PUT /api/admin/user/:id/status
// @access  Super Admin, Center Admin
exports.updateUserStatus = [
  validate(validations.updateUserStatus),
  async (req, res) => {
    try {
      const { isActive } = req.body;
      const userId = req.params.id;

      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Center admins can only update users in their location
      if (req.user.role === 'center_admin' && user.location !== req.user.location) {
        return res.status(403).json({ 
          message: 'You can only manage users in your location' 
        });
      }

      user.isActive = isActive;
      await user.save();

      res.json({
        success: true,
        message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          isActive: user.isActive
        }
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
];

// @desc    Get Centers
// @route   GET /api/admin/centers
// @access  Super Admin
exports.getCenters = async (req, res) => {
  try {
    const centers = await Center.find().populate('centerAdmin', 'name email').sort({ createdAt: -1 });

    res.json({
      success: true,
      centers
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Create Center
// @route   POST /api/admin/centers
// @access  Super Admin
exports.createCenter = async (req, res) => {
  try {
    const { name } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ 
        message: 'Center name is required' 
      });
    }

    // Check if center already exists
    const existingCenter = await Center.findOne({ name });
    if (existingCenter) {
      return res.status(400).json({ 
        message: 'Center already exists with this name' 
      });
    }

    // Create center
    const center = await Center.create({
      name
    });

    res.status(201).json({
      success: true,
      message: 'Center created successfully',
      center
    });
  } catch (error) {
    console.error(error);
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'Center already exists with this name' 
      });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update Center
// @route   PUT /api/admin/centers/:id
// @access  Super Admin
exports.updateCenter = async (req, res) => {
  try {
    const { name } = req.body;
    const centerId = req.params.id;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ 
        message: 'Center name is required' 
      });
    }

    // Check if center exists
    const center = await Center.findById(centerId);
    if (!center) {
      return res.status(404).json({ 
        message: 'Center not found' 
      });
    }

    // Check if name already exists (but not the current center)
    const existingCenter = await Center.findOne({ name, _id: { $ne: centerId } });
    if (existingCenter) {
      return res.status(400).json({ 
        message: 'Another center already exists with this name' 
      });
    }

    // Update center
    center.name = name;
    await center.save();

    res.json({
      success: true,
      message: 'Center updated successfully',
      center
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Delete Center
// @route   DELETE /api/admin/centers/:id
// @access  Super Admin
exports.deleteCenter = async (req, res) => {
  try {
    const centerId = req.params.id;

    // Check if center exists
    const center = await Center.findById(centerId);
    if (!center) {
      return res.status(404).json({ 
        message: 'Center not found' 
      });
    }

    // Check if center has courses
    const Course = require('../models/Course');
    const courseCount = await Course.countDocuments({ center: centerId });
    if (courseCount > 0) {
      return res.status(400).json({ 
        message: `Cannot delete center. It has ${courseCount} course(s) associated with it. Delete the courses first.` 
      });
    }

    // Delete center
    await Center.findByIdAndDelete(centerId);

    res.json({
      success: true,
      message: 'Center deleted successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get Categories
// @route   GET /api/admin/categories
// @access  Super Admin, Center Admin
exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      categories
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Create Category
// @route   POST /api/admin/categories
// @access  Super Admin
exports.createCategory = async (req, res) => {
  try {
    const { name } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ 
        message: 'Category name is required' 
      });
    }

    // Check if category already exists
    const existingCategory = await Category.findOne({ name });
    if (existingCategory) {
      return res.status(400).json({ 
        message: 'Category already exists with this name' 
      });
    }

    // Create category
    const category = await Category.create({
      name
    });

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      category
    });
  } catch (error) {
    console.error(error);
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'Category already exists with this name' 
      });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update Category
// @route   PUT /api/admin/categories/:id
// @access  Super Admin
exports.updateCategory = async (req, res) => {
  try {
    const { name } = req.body;
    const categoryId = req.params.id;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ 
        message: 'Category name is required' 
      });
    }

    // Check if category exists
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ 
        message: 'Category not found' 
      });
    }

    // Check if name already exists (but not the current category)
    const existingCategory = await Category.findOne({ name, _id: { $ne: categoryId } });
    if (existingCategory) {
      return res.status(400).json({ 
        message: 'Another category already exists with this name' 
      });
    }

    // Update category
    category.name = name;
    await category.save();

    res.json({
      success: true,
      message: 'Category updated successfully',
      category
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Delete Category
// @route   DELETE /api/admin/categories/:id
// @access  Super Admin
exports.deleteCategory = async (req, res) => {
  try {
    const categoryId = req.params.id;

    // Check if category exists
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ 
        message: 'Category not found' 
      });
    }

    // Check if category has courses
    const Course = require('../models/Course');
    const courseCount = await Course.countDocuments({ category: categoryId });
    if (courseCount > 0) {
      return res.status(400).json({ 
        message: `Cannot delete category. It has ${courseCount} course(s) associated with it. Delete the courses first.` 
      });
    }

    // Delete category
    await Category.findByIdAndDelete(categoryId);

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
