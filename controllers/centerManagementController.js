const Center = require('../models/Center');
const Course = require('../models/Course');
const {
  formatCenterForAdmin,
  normalizeAssignedAdmins,
  buildCenterListQuery,
  findActiveCenterById,
  ACTIVE_CENTER_FILTER
} = require('../utils/centerHelpers');

const pickUpdatableFields = (body) => {
  const allowed = [
    'centerName',
    'centerCode',
    'address',
    'city',
    'state',
    'contactNumber',
    'email',
    'status',
    'assignedAdmins'
  ];
  const payload = {};
  for (const key of allowed) {
    if (body[key] !== undefined) payload[key] = body[key];
  }
  return payload;
};

exports.createCenter = async (req, res) => {
  try {
    const {
      centerName,
      centerCode,
      address,
      city,
      state,
      contactNumber,
      email,
      status,
      assignedAdmins
    } = req.body;

    if (!centerName?.trim()) {
      return res.status(400).json({ success: false, message: 'Center name is required' });
    }
    if (!centerCode?.trim()) {
      return res.status(400).json({ success: false, message: 'Center code is required' });
    }
    if (!city?.trim() || !state?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'City and state are required'
      });
    }

    const code = String(centerCode).toUpperCase().trim();
    const existing = await Center.findOne({ centerCode: code, isDeleted: false });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Center code already exists'
      });
    }

    const center = await Center.create({
      centerName: centerName.trim(),
      centerCode: code,
      address: address?.trim() || '',
      city: city.trim(),
      state: state.trim(),
      contactNumber: contactNumber?.trim() || '',
      email: email?.trim() || '',
      status: status === 'DISABLED' ? 'DISABLED' : 'ACTIVE',
      assignedAdmins: normalizeAssignedAdmins(assignedAdmins) ?? [],
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      message: 'Center created successfully',
      data: formatCenterForAdmin(center)
    });
  } catch (error) {
    console.error('Create center error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Center code already exists'
      });
    }
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getCenters = async (req, res) => {
  try {
    const {
      search = '',
      status,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = buildCenterListQuery({ search, status });
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const sort = {};
    const allowedSort = ['createdAt', 'centerName', 'centerCode', 'city', 'status'];
    sort[allowedSort.includes(sortBy) ? sortBy : 'createdAt'] =
      sortOrder === 'asc' ? 1 : -1;

    const [centers, total] = await Promise.all([
      Center.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Center.countDocuments(query)
    ]);

    res.json({
      success: true,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 0,
      count: centers.length,
      data: centers.map(formatCenterForAdmin)
    });
  } catch (error) {
    console.error('Get centers error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getCenterById = async (req, res) => {
  try {
    const center = await Center.findOne({ _id: req.params.id, ...ACTIVE_CENTER_FILTER }).populate(
      'createdBy',
      'name email'
    );

    if (!center) {
      return res.status(404).json({ success: false, message: 'Center not found' });
    }

    res.json({
      success: true,
      data: formatCenterForAdmin(center)
    });
  } catch (error) {
    console.error('Get center by id error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateCenter = async (req, res) => {
  try {
    const center = await findActiveCenterById(req.params.id);
    if (!center) {
      return res.status(404).json({ success: false, message: 'Center not found' });
    }

    const updates = pickUpdatableFields(req.body);

    if (updates.centerCode !== undefined) {
      const code = String(updates.centerCode).toUpperCase().trim();
      const duplicate = await Center.findOne({
        centerCode: code,
        _id: { $ne: center._id },
        isDeleted: false
      });
      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: 'Center code already exists'
        });
      }
      updates.centerCode = code;
    }

    if (updates.assignedAdmins !== undefined) {
      updates.assignedAdmins = normalizeAssignedAdmins(updates.assignedAdmins) ?? [];
    }

    if (updates.status !== undefined && !['ACTIVE', 'DISABLED'].includes(updates.status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be ACTIVE or DISABLED'
      });
    }

    Object.assign(center, updates);
    await center.save();

    res.json({
      success: true,
      message: 'Center updated successfully',
      data: formatCenterForAdmin(center)
    });
  } catch (error) {
    console.error('Update center error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Center code already exists'
      });
    }
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateCenterStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['ACTIVE', 'DISABLED'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be ACTIVE or DISABLED'
      });
    }

    const center = await findActiveCenterById(req.params.id);
    if (!center) {
      return res.status(404).json({ success: false, message: 'Center not found' });
    }

    center.status = status;
    await center.save();

    res.json({
      success: true,
      message: 'Center status updated',
      data: formatCenterForAdmin(center)
    });
  } catch (error) {
    console.error('Update center status error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.deleteCenter = async (req, res) => {
  try {
    const center = await findActiveCenterById(req.params.id);
    if (!center) {
      return res.status(404).json({ success: false, message: 'Center not found' });
    }

    const courseCount = await Course.countDocuments({ center: center._id, isActive: true });
    if (courseCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete center. ${courseCount} active course(s) are linked. Disable the center or reassign courses first.`
      });
    }

    center.isDeleted = true;
    center.status = 'DISABLED';
    await center.save();

    res.json({
      success: true,
      message: 'Center deleted successfully'
    });
  } catch (error) {
    console.error('Delete center error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/** Lightweight list for dropdowns (super admin) */
exports.getCentersDropdown = async (req, res) => {
  try {
    const centers = await Center.find({ ...ACTIVE_CENTER_FILTER, status: 'ACTIVE' })
      .select('centerName centerCode city state name')
      .sort({ centerName: 1 })
      .lean();

    res.json({
      success: true,
      count: centers.length,
      data: centers.map((c) => ({
        _id: c._id,
        centerName: c.centerName || c.name,
        centerCode: c.centerCode,
        city: c.city,
        state: c.state
      }))
    });
  } catch (error) {
    console.error('Centers dropdown error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
