const Subject = require('../models/Subject');
const Topic = require('../models/Topic');
const Teacher = require('../models/Teacher');
const { generateSubjectId } = require('../utils/contentIdGenerator');
const {
  NOT_DELETED,
  escapeRegex,
  parsePagination,
  parseSort
} = require('../utils/contentMastersHelpers');

const formatSubject = (doc, extras = {}) => ({
  _id: doc._id,
  subjectId: doc.subjectId,
  subjectName: doc.subjectName,
  description: doc.description || '',
  status: doc.status,
  linkedTopics: extras.linkedTopics ?? 0,
  linkedTeachers: extras.linkedTeachers ?? 0,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt
});

const buildSubjectListQuery = ({ search = '', status }) => {
  const query = { ...NOT_DELETED };

  if (status && ['ACTIVE', 'INACTIVE'].includes(status)) {
    query.status = status;
  }

  const trimmed = String(search).trim();
  if (trimmed) {
    const regex = new RegExp(escapeRegex(trimmed), 'i');
    query.$or = [{ subjectName: regex }, { subjectId: regex }];
  }

  return query;
};

exports.createSubject = async (req, res) => {
  try {
    const { subjectName, description = '', status = 'ACTIVE' } = req.body;

    if (!subjectName?.trim()) {
      return res.status(400).json({ success: false, message: 'subjectName is required' });
    }

    const subject = await Subject.create({
      subjectId: await generateSubjectId(),
      subjectName: subjectName.trim(),
      description: String(description || '').trim(),
      status: status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE'
    });

    res.status(201).json({
      success: true,
      message: 'Subject created successfully',
      data: formatSubject(subject.toObject())
    });
  } catch (error) {
    console.error('Create subject error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getSubjects = async (req, res) => {
  try {
    const query = buildSubjectListQuery(req.query);
    const { page, limit, skip } = parsePagination(req.query);
    const sort = parseSort(req.query, ['createdAt', 'subjectName', 'subjectId', 'status']);

    const [subjects, total] = await Promise.all([
      Subject.find(query).sort(sort).skip(skip).limit(limit).lean(),
      Subject.countDocuments(query)
    ]);

    res.json({
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 0,
      count: subjects.length,
      data: subjects.map((s) => formatSubject(s))
    });
  } catch (error) {
    console.error('Get subjects error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getSubjectsDropdown = async (req, res) => {
  try {
    const subjects = await Subject.find({ status: 'ACTIVE', ...NOT_DELETED })
      .select('_id subjectId subjectName')
      .sort({ subjectName: 1 })
      .lean();

    res.json({ success: true, count: subjects.length, data: subjects });
  } catch (error) {
    console.error('Subjects dropdown error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getSubjectById = async (req, res) => {
  try {
    const subject = await Subject.findOne({ _id: req.params.id, ...NOT_DELETED }).lean();
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    const [linkedTopics, linkedTeachers] = await Promise.all([
      Topic.countDocuments({ subject: subject._id, ...NOT_DELETED }),
      Teacher.countDocuments({ subjects: subject._id, ...NOT_DELETED })
    ]);

    res.json({
      success: true,
      data: formatSubject(subject, { linkedTopics, linkedTeachers })
    });
  } catch (error) {
    console.error('Get subject by id error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateSubject = async (req, res) => {
  try {
    const subject = await Subject.findOne({ _id: req.params.id, ...NOT_DELETED });
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    if (req.body.subjectName !== undefined) {
      if (!String(req.body.subjectName).trim()) {
        return res.status(400).json({ success: false, message: 'subjectName cannot be empty' });
      }
      subject.subjectName = String(req.body.subjectName).trim();
    }

    if (req.body.description !== undefined) {
      subject.description = String(req.body.description).trim();
    }

    if (req.body.status !== undefined) {
      if (!['ACTIVE', 'INACTIVE'].includes(req.body.status)) {
        return res.status(400).json({ success: false, message: 'Status must be ACTIVE or INACTIVE' });
      }
      subject.status = req.body.status;
    }

    await subject.save();

    res.json({
      success: true,
      message: 'Subject updated successfully',
      data: formatSubject(subject.toObject())
    });
  } catch (error) {
    console.error('Update subject error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateSubjectStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['ACTIVE', 'INACTIVE'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be ACTIVE or INACTIVE' });
    }

    const subject = await Subject.findOneAndUpdate(
      { _id: req.params.id, ...NOT_DELETED },
      { status },
      { new: true }
    ).lean();

    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    res.json({
      success: true,
      message: 'Subject status updated',
      data: formatSubject(subject)
    });
  } catch (error) {
    console.error('Update subject status error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.deleteSubject = async (req, res) => {
  try {
    const subject = await Subject.findOne({ _id: req.params.id, ...NOT_DELETED });
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    const activeTopics = await Topic.countDocuments({
      subject: subject._id,
      status: 'ACTIVE',
      ...NOT_DELETED
    });
    if (activeTopics > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete subject with active topics. Deactivate topics first.'
      });
    }

    subject.isDeleted = true;
    subject.deletedAt = new Date();
    subject.status = 'INACTIVE';
    await subject.save();

    res.json({
      success: true,
      message: 'Subject deleted successfully',
      data: { _id: subject._id }
    });
  } catch (error) {
    console.error('Delete subject error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
