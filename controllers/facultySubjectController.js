const mongoose = require('mongoose');
const FacultySubject = require('../models/FacultySubject');
const SubjectContentFolder = require('../models/SubjectContentFolder');
const Subject = require('../models/Subject');
const Topic = require('../models/Topic');
const Teacher = require('../models/Teacher');
const { generateFacultySubjectId, isValidObjectId } = require('../utils/contentIdGenerator');
const {
  NOT_DELETED,
  escapeRegex,
  parsePagination,
  parseSort,
  findActiveSubject
} = require('../utils/contentMastersHelpers');
const { validateFacultySubjectPayload } = require('../utils/batchFacultyHelpers');
const {
  FACULTY_CATEGORIES,
  normalizeFacultyCategories
} = require('../utils/batchFacultyConstants');

const FACULTY_CATEGORY_LABELS = {
  LIVE_CLASS: 'Live Class',
  RECORDING: 'Recording',
  PRELIMS_TEST: 'Prelims Test',
  MAINS_ANSWER_WRITING: 'Mains Answer Writing',
  PDF: 'PDF'
};

/** Lightweight shape for dropdowns / batch subject picker */
const formatFacultySubjectSummary = (doc) => ({
  _id: doc._id,
  facultySubjectId: doc.facultySubjectId,
  subjectName: doc.subjectName,
  teacherName: doc.teacher?.teacherName || doc.teacherName || ''
});

const findFacultySubjectByRef = async (ref) => {
  if (!ref) return null;
  const base = { ...NOT_DELETED };
  if (isValidObjectId(ref)) {
    return FacultySubject.findOne({ _id: ref, ...base })
      .select('_id facultySubjectId subjectName teacher')
      .populate('teacher', 'teacherName')
      .lean();
  }
  return FacultySubject.findOne({ facultySubjectId: String(ref).trim(), ...base })
    .select('_id facultySubjectId subjectName teacher')
    .populate('teacher', 'teacherName')
    .lean();
};

const formatFacultySubject = (doc) => ({
  _id: doc._id,
  facultySubjectId: doc.facultySubjectId,
  subjectName: doc.subjectName,
  subject: doc.subject?._id || doc.subject,
  teacher: doc.teacher?._id || doc.teacher,
  teacherDetails: doc.teacher
    ? {
        _id: doc.teacher._id,
        teacherId: doc.teacher.teacherId,
        teacherName: doc.teacher.teacherName,
        centerId: doc.teacher.centerId
      }
    : undefined,
  topics: (doc.topics || []).map((t) => ({
    _id: t._id || t,
    topicId: t.topicId,
    topicName: t.topicName
  })),
  categories: normalizeFacultyCategories(doc.categories || []),
  status: doc.status,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt
});

const buildFacultySubjectQuery = ({ search = '', status, category }) => {
  const conditions = [{ ...NOT_DELETED }];

  if (status && ['ACTIVE', 'INACTIVE'].includes(String(status).toUpperCase())) {
    conditions.push({ status: String(status).toUpperCase() });
  }
  if (category) {
    conditions.push({ categories: String(category).trim().toUpperCase() });
  }

  const trimmed = String(search ?? '').trim();
  if (trimmed) {
    conditions.push({
      subjectName: { $regex: escapeRegex(trimmed), $options: 'i' }
    });
  }

  return conditions.length === 1 ? conditions[0] : { $and: conditions };
};

exports.createFacultySubject = async (req, res) => {
  try {
    const {
      subjectName,
      subjectId,
      topicIds = [],
      teacherId,
      categories = [],
      status = 'ACTIVE'
    } = req.body;

    const validation = await validateFacultySubjectPayload({
      subjectName,
      subjectId,
      topicIds,
      teacherId,
      categories
    });
    if (!validation.ok) {
      return res.status(400).json({ success: false, message: validation.message });
    }

    const fs = await FacultySubject.create({
      facultySubjectId: await generateFacultySubjectId(),
      subjectName: subjectName.trim(),
      subject: validation.subject._id,
      topics: validation.topics,
      teacher: validation.teacher._id,
      categories: validation.categories,
      status: status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE'
    });

    const populated = await FacultySubject.findById(fs._id)
      .populate('subject', 'subjectId subjectName')
      .populate('topics', 'topicId topicName')
      .populate('teacher', 'teacherId teacherName centerId')
      .lean();

    res.status(201).json({
      success: true,
      message: 'FacultySubject created successfully',
      data: formatFacultySubject(populated)
    });
  } catch (error) {
    console.error('Create facultySubject error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getFacultySubjects = async (req, res) => {
  try {
    const query = buildFacultySubjectQuery({
      search: req.query.search ?? req.query.q ?? '',
      status: req.query.status,
      category: req.query.category
    });
    const { page, limit, skip } = parsePagination(req.query);
    const sort = parseSort(req.query, ['createdAt', 'subjectName', 'facultySubjectId', 'status']);

    const [rows, total] = await Promise.all([
      FacultySubject.find(query)
        .populate('subject', 'subjectId subjectName')
        .populate('topics', 'topicId topicName')
        .populate('teacher', 'teacherId teacherName centerId')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      FacultySubject.countDocuments(query)
    ]);

    res.json({
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 0,
      count: rows.length,
      data: rows.map(formatFacultySubject)
    });
  } catch (error) {
    console.error('Get facultySubjects error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getFacultySubjectById = async (req, res) => {
  try {
    const doc = await FacultySubject.findOne({ _id: req.params.id, ...NOT_DELETED })
      .populate('subject', 'subjectId subjectName')
      .populate('topics', 'topicId topicName')
      .populate('teacher', 'teacherId teacherName centerId')
      .lean();

    if (!doc) return res.status(404).json({ success: false, message: 'FacultySubject not found' });

    res.json({ success: true, data: formatFacultySubject(doc) });
  } catch (error) {
    console.error('Get facultySubject by id error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateFacultySubject = async (req, res) => {
  try {
    const existing = await FacultySubject.findOne({ _id: req.params.id, ...NOT_DELETED });
    if (!existing) return res.status(404).json({ success: false, message: 'FacultySubject not found' });

    const nextPayload = {
      subjectName: req.body.subjectName ?? existing.subjectName,
      subjectId: req.body.subjectId ?? existing.subject,
      topicIds: req.body.topicIds ?? existing.topics,
      teacherId: req.body.teacherId ?? existing.teacher,
      categories: req.body.categories ?? existing.categories
    };

    const validation = await validateFacultySubjectPayload(nextPayload);
    if (!validation.ok) {
      return res.status(400).json({ success: false, message: validation.message });
    }

    if (req.body.subjectName !== undefined) existing.subjectName = nextPayload.subjectName.trim();
    if (req.body.subjectId !== undefined) existing.subject = validation.subject._id;
    if (req.body.topicIds !== undefined) existing.topics = validation.topics;
    if (req.body.teacherId !== undefined) existing.teacher = validation.teacher._id;
    if (req.body.categories !== undefined) existing.categories = validation.categories;
    if (req.body.status !== undefined) {
      existing.status = req.body.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';
    }

    await existing.save();

    const populated = await FacultySubject.findById(existing._id)
      .populate('subject', 'subjectId subjectName')
      .populate('topics', 'topicId topicName')
      .populate('teacher', 'teacherId teacherName centerId')
      .lean();

    res.json({
      success: true,
      message: 'FacultySubject updated successfully',
      data: formatFacultySubject(populated)
    });
  } catch (error) {
    console.error('Update facultySubject error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateFacultySubjectStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['ACTIVE', 'INACTIVE'].includes(status)) {
      return res.status(400).json({ success: false, message: 'status must be ACTIVE or INACTIVE' });
    }

    const doc = await FacultySubject.findOneAndUpdate(
      { _id: req.params.id, ...NOT_DELETED },
      { status },
      { new: true }
    )
      .populate('subject', 'subjectId subjectName')
      .populate('topics', 'topicId topicName')
      .populate('teacher', 'teacherId teacherName centerId')
      .lean();

    if (!doc) return res.status(404).json({ success: false, message: 'FacultySubject not found' });
    res.json({ success: true, message: 'FacultySubject status updated', data: formatFacultySubject(doc) });
  } catch (error) {
    console.error('Update facultySubject status error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * Single endpoint for Faculty Subject create/edit form dropdowns.
 * Step 1: GET without subjectId → categories + subjects
 * Step 2: GET ?subjectId=... → also topics + teachers for that subject
 */
exports.getFacultySubjectCreateForm = async (req, res) => {
  try {
    const { subjectId, centerId } = req.query;

    const categories = FACULTY_CATEGORIES.map((value) => ({
      value,
      label: FACULTY_CATEGORY_LABELS[value] || value
    }));

    const subjects = await Subject.find({ status: 'ACTIVE', ...NOT_DELETED })
      .select('_id subjectId subjectName')
      .sort({ subjectName: 1 })
      .lean();

    const data = {
      categories,
      subjects,
      topics: [],
      teachers: [],
      selectedSubject: null
    };

    if (subjectId) {
      const subject = await findActiveSubject(subjectId);
      if (!subject) {
        return res.status(400).json({ success: false, message: 'Invalid or inactive subject' });
      }

      data.selectedSubject = {
        _id: subject._id,
        subjectId: subject.subjectId,
        subjectName: subject.subjectName
      };

      data.topics = await Topic.find({
        subject: subject._id,
        status: 'ACTIVE',
        ...NOT_DELETED
      })
        .select('_id topicId topicName')
        .sort({ topicName: 1 })
        .lean();

      const teacherQuery = {
        status: 'ACTIVE',
        ...NOT_DELETED,
        subjects: subject._id
      };
      if (centerId && isValidObjectId(centerId)) {
        teacherQuery.centerId = new mongoose.Types.ObjectId(centerId);
      }

      const teachers = await Teacher.find(teacherQuery)
        .select('_id teacherId teacherName centerId')
        .populate('centerId', 'centerName')
        .sort({ teacherName: 1 })
        .lean();

      data.teachers = teachers.map((t) => ({
        _id: t._id,
        teacherId: t.teacherId,
        teacherName: t.teacherName,
        centerId: t.centerId?._id || t.centerId,
        centerName: t.centerId?.centerName || ''
      }));
    }

    res.json({
      success: true,
      message: subjectId
        ? 'Form options loaded for selected subject (topics + teachers)'
        : 'Form options loaded (subjects + categories)',
      data
    });
  } catch (error) {
    console.error('Faculty subject create form error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getFacultySubjectsDropdown = async (req, res) => {
  try {
    const { category, search = '', status = 'ACTIVE', page = 1, limit = 100 } = req.query;

    const conditions = [{ ...NOT_DELETED }];

    if (status && ['ACTIVE', 'INACTIVE'].includes(String(status).toUpperCase())) {
      conditions.push({ status: String(status).toUpperCase() });
    } else {
      conditions.push({ status: 'ACTIVE' });
    }
    if (category) {
      conditions.push({ categories: String(category).trim().toUpperCase() });
    }

    const trimmed = String(search ?? '').trim();
    if (trimmed) {
      conditions.push({
        subjectName: { $regex: escapeRegex(trimmed), $options: 'i' }
      });
    }

    const filter = conditions.length === 1 ? conditions[0] : { $and: conditions };

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 100));
    const skip = (pageNum - 1) * limitNum;

    const [rows, total] = await Promise.all([
      FacultySubject.find(filter)
        .select('_id facultySubjectId subjectName teacher')
        .populate('teacher', 'teacherName')
        .sort({ subjectName: 1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      FacultySubject.countDocuments(filter)
    ]);

    res.json({
      success: true,
      count: rows.length,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 0,
      data: rows.map(formatFacultySubjectSummary)
    });
  } catch (error) {
    console.error('Get facultySubjects dropdown error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/** Single faculty subject — summary only (no topics / categories / nested details) */
exports.getFacultySubjectSummary = async (req, res) => {
  try {
    const doc = await findFacultySubjectByRef(req.params.id);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'FacultySubject not found' });
    }

    res.json({ success: true, data: formatFacultySubjectSummary(doc) });
  } catch (error) {
    console.error('Get facultySubject summary error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/** Left navigation content tree grouped by category */
exports.getContentTree = async (req, res) => {
  try {
    const ref = req.params.id;
    let facultySubject = null;

    if (isValidObjectId(ref)) {
      facultySubject = await FacultySubject.findOne({ _id: ref, ...NOT_DELETED }).lean();
    } else {
      facultySubject = await FacultySubject.findOne({
        facultySubjectId: String(ref).trim(),
        ...NOT_DELETED
      }).lean();
    }

    if (!facultySubject) {
      return res.status(404).json({ success: false, message: 'FacultySubject not found' });
    }

    const folders = await SubjectContentFolder.find({
      facultySubjectId: facultySubject._id,
      status: 'ACTIVE',
      ...NOT_DELETED
    })
      .select('_id folderId folderName category')
      .sort({ folderName: 1 })
      .lean();

    const tree = {};
    for (const category of FACULTY_CATEGORIES) {
      tree[category] = [];
    }

    for (const folder of folders) {
      if (!tree[folder.category]) tree[folder.category] = [];
      tree[folder.category].push({
        _id: folder._id,
        folderId: folder.folderId,
        folderName: folder.folderName
      });
    }

    res.json({
      success: true,
      facultySubjectId: facultySubject._id,
      subjectName: facultySubject.subjectName,
      categories: facultySubject.categories || [],
      data: tree
    });
  } catch (error) {
    console.error('Get content tree error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.deleteFacultySubject = async (req, res) => {
  try {
    const doc = await FacultySubject.findOneAndUpdate(
      { _id: req.params.id, ...NOT_DELETED },
      {
        isDeleted: true,
        deletedAt: new Date(),
        status: 'INACTIVE'
      },
      { new: true, runValidators: false }
    );

    if (!doc) return res.status(404).json({ success: false, message: 'FacultySubject not found' });

    res.json({ success: true, message: 'FacultySubject deleted successfully', data: { _id: doc._id } });
  } catch (error) {
    console.error('Delete facultySubject error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
