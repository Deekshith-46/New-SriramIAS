const ExamPatternInstruction = require('../models/ExamPatternInstruction');
const { generateExamInstructionId } = require('../utils/contentIdGenerator');
const {
  INSTRUCTION_MAX_LENGTH,
  formatDateOnly,
  normalizeStatus,
  parsePagination,
  parseTestConfigSort,
  buildStatusFilter,
  applySearchFilter,
  NOT_DELETED
} = require('../utils/testConfigurationHelpers');

const resolveInstructionDescription = (body) => {
  const raw =
    body.instructionDescription ??
    body.instruction_description ??
    body.description;
  return raw !== undefined ? String(raw).trim() : undefined;
};

const formatExamPattern = (doc) => ({
  _id: doc._id,
  instructionId: doc.instructionId,
  instructionDescription: doc.instructionDescription,
  status: doc.status,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
  createdOn: formatDateOnly(doc.createdAt),
  modifiedOn: formatDateOnly(doc.updatedAt)
});

const buildListQuery = ({ search = '', status }) => {
  let query = buildStatusFilter(status);
  query = applySearchFilter(query, search, ['instructionDescription', 'instructionId']);
  return query;
};

exports.createExamPattern = async (req, res) => {
  try {
    const instructionDescription = resolveInstructionDescription(req.body);
    const status = normalizeStatus(req.body.status);

    if (status === null) {
      return res.status(400).json({ success: false, message: 'Status must be ACTIVE or INACTIVE' });
    }
    if (!instructionDescription) {
      return res.status(400).json({ success: false, message: 'instructionDescription is required' });
    }
    if (instructionDescription.length > INSTRUCTION_MAX_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `instructionDescription cannot exceed ${INSTRUCTION_MAX_LENGTH} characters`
      });
    }

    const record = await ExamPatternInstruction.create({
      instructionId: await generateExamInstructionId(),
      instructionDescription,
      status
    });

    res.status(201).json({
      success: true,
      message: 'Exam instruction created successfully',
      data: formatExamPattern(record.toObject())
    });
  } catch (error) {
    console.error('Create exam pattern error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getExamPatterns = async (req, res) => {
  try {
    const query = buildListQuery(req.query);
    const { page, limit, skip } = parsePagination(req.query);
    const sort = parseTestConfigSort(
      req.query,
      ['createdAt', 'updatedAt', 'instructionDescription', 'instructionId', 'status'],
      'createdAt'
    );

    const [rows, total] = await Promise.all([
      ExamPatternInstruction.find(query).sort(sort).skip(skip).limit(limit).lean(),
      ExamPatternInstruction.countDocuments(query)
    ]);

    res.json({
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 0,
      count: rows.length,
      data: rows.map(formatExamPattern)
    });
  } catch (error) {
    console.error('Get exam patterns error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getExamPatternsDropdown = async (req, res) => {
  try {
    const rows = await ExamPatternInstruction.find({ status: 'ACTIVE', ...NOT_DELETED })
      .select('_id instructionId instructionDescription')
      .sort({ instructionId: -1 })
      .lean();

    res.json({ success: true, count: rows.length, data: rows });
  } catch (error) {
    console.error('Exam patterns dropdown error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getExamPatternById = async (req, res) => {
  try {
    const record = await ExamPatternInstruction.findOne({ _id: req.params.id, ...NOT_DELETED }).lean();
    if (!record) {
      return res.status(404).json({ success: false, message: 'Exam instruction not found' });
    }

    res.json({ success: true, data: formatExamPattern(record) });
  } catch (error) {
    console.error('Get exam pattern by id error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateExamPattern = async (req, res) => {
  try {
    const record = await ExamPatternInstruction.findOne({ _id: req.params.id, ...NOT_DELETED });
    if (!record) {
      return res.status(404).json({ success: false, message: 'Exam instruction not found' });
    }

    const instructionDescription = resolveInstructionDescription(req.body);
    if (instructionDescription !== undefined) {
      if (!instructionDescription) {
        return res.status(400).json({ success: false, message: 'instructionDescription cannot be empty' });
      }
      if (instructionDescription.length > INSTRUCTION_MAX_LENGTH) {
        return res.status(400).json({
          success: false,
          message: `instructionDescription cannot exceed ${INSTRUCTION_MAX_LENGTH} characters`
        });
      }
      record.instructionDescription = instructionDescription;
    }

    if (req.body.status !== undefined) {
      const status = normalizeStatus(req.body.status, null);
      if (status === null) {
        return res.status(400).json({ success: false, message: 'Status must be ACTIVE or INACTIVE' });
      }
      record.status = status;
    }

    await record.save();

    res.json({
      success: true,
      message: 'Exam instruction updated successfully',
      data: formatExamPattern(record.toObject())
    });
  } catch (error) {
    console.error('Update exam pattern error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateExamPatternStatus = async (req, res) => {
  try {
    const status = normalizeStatus(req.body.status, null);
    if (status === null) {
      return res.status(400).json({ success: false, message: 'Status must be ACTIVE or INACTIVE' });
    }

    const record = await ExamPatternInstruction.findOneAndUpdate(
      { _id: req.params.id, ...NOT_DELETED },
      { status },
      { new: true }
    ).lean();

    if (!record) {
      return res.status(404).json({ success: false, message: 'Exam instruction not found' });
    }

    res.json({
      success: true,
      message: 'Exam instruction status updated',
      data: formatExamPattern(record)
    });
  } catch (error) {
    console.error('Update exam pattern status error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.deleteExamPattern = async (req, res) => {
  try {
    const record = await ExamPatternInstruction.findOne({ _id: req.params.id, ...NOT_DELETED });
    if (!record) {
      return res.status(404).json({ success: false, message: 'Exam instruction not found' });
    }

    record.isDeleted = true;
    record.deletedAt = new Date();
    record.status = 'INACTIVE';
    await record.save();

    res.json({
      success: true,
      message: 'Exam instruction deleted successfully',
      data: { _id: record._id, instructionId: record.instructionId }
    });
  } catch (error) {
    console.error('Delete exam pattern error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
