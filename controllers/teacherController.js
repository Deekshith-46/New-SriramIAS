const mongoose = require('mongoose');
const Teacher = require('../models/Teacher');
const { generateTeacherId, isValidObjectId } = require('../utils/contentIdGenerator');
const { findActiveCenter } = require('../utils/academicHierarchyHelpers');
const {
  NOT_DELETED,
  escapeRegex,
  parsePagination,
  parseSort,
  validateActiveSubjectIds
} = require('../utils/contentMastersHelpers');

const teacherPopulate = [
  { path: 'centerId', select: 'centerName name centerCode city state' },
  { path: 'subjects', select: 'subjectId subjectName' }
];

const resolveCenterId = (body) => body.centerId ?? body.center ?? null;

const formatTeacher = (doc) => ({
  _id: doc._id,
  teacherId: doc.teacherId,
  teacherName: doc.teacherName,
  centerId: doc.centerId?._id || doc.centerId,
  centerName: doc.centerId?.centerName || doc.centerId?.name || doc.centerName || '',
  description: doc.description || '',
  subjects: (doc.subjects || []).map((s) => ({
    _id: s._id || s,
    subjectId: s.subjectId,
    subjectName: s.subjectName
  })),
  status: doc.status,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt
});

const buildTeacherListQuery = ({ search = '', status, subject, center, centerId }) => {
  const query = { ...NOT_DELETED };

  if (status && ['ACTIVE', 'INACTIVE'].includes(status)) {
    query.status = status;
  }

  const resolvedCenter = centerId || center;
  if (resolvedCenter && isValidObjectId(resolvedCenter)) {
    query.centerId = new mongoose.Types.ObjectId(resolvedCenter);
  }

  if (subject && isValidObjectId(subject)) {
    query.subjects = new mongoose.Types.ObjectId(subject);
  }

  const trimmed = String(search).trim();
  if (trimmed) {
    const regex = new RegExp(escapeRegex(trimmed), 'i');
    query.$or = [{ teacherName: regex }, { teacherId: regex }];
  }

  return query;
};

exports.createTeacher = async (req, res) => {
  try {
    const { teacherName, subjects = [], description = '', status = 'ACTIVE' } = req.body;
    const centerRef = resolveCenterId(req.body);

    if (!teacherName?.trim()) {
      return res.status(400).json({ success: false, message: 'teacherName is required' });
    }
    if (!centerRef) {
      return res.status(400).json({ success: false, message: 'centerId is required' });
    }

    const center = await findActiveCenter(centerRef);
    if (!center) {
      return res.status(400).json({ success: false, message: 'Invalid or inactive center' });
    }

    const subjectValidation = await validateActiveSubjectIds(subjects);
    if (!subjectValidation.ok) {
      return res.status(400).json({ success: false, message: subjectValidation.message });
    }

    const teacher = await Teacher.create({
      teacherId: await generateTeacherId(),
      teacherName: teacherName.trim(),
      centerId: center._id,
      subjects: subjectValidation.subjects.map((s) => s._id),
      description: String(description || '').trim(),
      status: status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE'
    });

    const populated = await Teacher.findById(teacher._id).populate(teacherPopulate).lean();

    res.status(201).json({
      success: true,
      message: 'Teacher created successfully',
      data: formatTeacher(populated)
    });
  } catch (error) {
    console.error('Create teacher error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getTeachersDropdown = async (req, res) => {
  try {
    const { centerId, subject, status = 'ACTIVE' } = req.query;
    const query = { ...NOT_DELETED };

    if (status && ['ACTIVE', 'INACTIVE'].includes(String(status).toUpperCase())) {
      query.status = String(status).toUpperCase();
    } else {
      query.status = 'ACTIVE';
    }

    if (centerId && isValidObjectId(centerId)) {
      query.centerId = new mongoose.Types.ObjectId(centerId);
    }

    if (subject && isValidObjectId(subject)) {
      query.subjects = new mongoose.Types.ObjectId(subject);
    }

    const rows = await Teacher.find(query)
      .select('_id teacherId teacherName centerId')
      .sort({ teacherName: 1 })
      .lean();

    res.json({
      success: true,
      count: rows.length,
      data: rows.map((row) => ({
        _id: row._id,
        teacherId: row.teacherId || '',
        teacherName: row.teacherName || ''
      }))
    });
  } catch (error) {
    console.error('Teachers dropdown error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getTeachers = async (req, res) => {
  try {
    const query = buildTeacherListQuery(req.query);
    const { page, limit, skip } = parsePagination(req.query);
    const sort = parseSort(req.query, ['createdAt', 'teacherName', 'teacherId', 'status']);

    const [teachers, total] = await Promise.all([
      Teacher.find(query).populate(teacherPopulate).sort(sort).skip(skip).limit(limit).lean(),
      Teacher.countDocuments(query)
    ]);

    res.json({
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 0,
      count: teachers.length,
      data: teachers.map((t) => formatTeacher(t))
    });
  } catch (error) {
    console.error('Get teachers error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getTeacherById = async (req, res) => {
  try {
    const teacher = await Teacher.findOne({ _id: req.params.id, ...NOT_DELETED })
      .populate(teacherPopulate)
      .lean();

    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher not found' });
    }

    res.json({ success: true, data: formatTeacher(teacher) });
  } catch (error) {
    console.error('Get teacher by id error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateTeacher = async (req, res) => {
  try {
    const teacher = await Teacher.findOne({ _id: req.params.id, ...NOT_DELETED });
    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher not found' });
    }

    if (req.body.teacherName !== undefined) {
      if (!String(req.body.teacherName).trim()) {
        return res.status(400).json({ success: false, message: 'teacherName cannot be empty' });
      }
      teacher.teacherName = String(req.body.teacherName).trim();
    }

    if (req.body.centerId !== undefined || req.body.center !== undefined) {
      const centerRef = resolveCenterId(req.body);
      if (!centerRef) {
        return res.status(400).json({ success: false, message: 'centerId cannot be empty' });
      }
      const center = await findActiveCenter(centerRef);
      if (!center) {
        return res.status(400).json({ success: false, message: 'Invalid or inactive center' });
      }
      teacher.centerId = center._id;
    }

    if (req.body.subjects !== undefined) {
      const subjectValidation = await validateActiveSubjectIds(req.body.subjects);
      if (!subjectValidation.ok) {
        return res.status(400).json({ success: false, message: subjectValidation.message });
      }
      teacher.subjects = subjectValidation.subjects.map((s) => s._id);
    }

    if (req.body.description !== undefined) {
      teacher.description = String(req.body.description).trim();
    }

    if (req.body.status !== undefined) {
      if (!['ACTIVE', 'INACTIVE'].includes(req.body.status)) {
        return res.status(400).json({ success: false, message: 'Status must be ACTIVE or INACTIVE' });
      }
      teacher.status = req.body.status;
    }

    await teacher.save();

    const populated = await Teacher.findById(teacher._id).populate(teacherPopulate).lean();

    res.json({
      success: true,
      message: 'Teacher updated successfully',
      data: formatTeacher(populated)
    });
  } catch (error) {
    console.error('Update teacher error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateTeacherStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['ACTIVE', 'INACTIVE'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be ACTIVE or INACTIVE' });
    }

    const teacher = await Teacher.findOneAndUpdate(
      { _id: req.params.id, ...NOT_DELETED },
      { status },
      { new: true }
    )
      .populate(teacherPopulate)
      .lean();

    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher not found' });
    }

    res.json({
      success: true,
      message: 'Teacher status updated',
      data: formatTeacher(teacher)
    });
  } catch (error) {
    console.error('Update teacher status error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.deleteTeacher = async (req, res) => {
  try {
    const teacher = await Teacher.findOne({ _id: req.params.id, ...NOT_DELETED });
    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Teacher not found' });
    }

    teacher.isDeleted = true;
    teacher.deletedAt = new Date();
    teacher.status = 'INACTIVE';
    await teacher.save();

    res.json({
      success: true,
      message: 'Teacher deleted successfully',
      data: { _id: teacher._id }
    });
  } catch (error) {
    console.error('Delete teacher error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
