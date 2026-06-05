const TestConfigLanguage = require('../models/TestConfigLanguage');
const { generateTestConfigLanguageId } = require('../utils/contentIdGenerator');
const {
  formatDateOnly,
  normalizeStatus,
  parsePagination,
  parseTestConfigSort,
  buildStatusFilter,
  applySearchFilter,
  NOT_DELETED
} = require('../utils/testConfigurationHelpers');

const resolveLanguageName = (body) => {
  const raw = body.languageName ?? body.language ?? body.name;
  return raw !== undefined ? String(raw).trim() : undefined;
};

const formatLanguage = (doc) => ({
  _id: doc._id,
  languageId: doc.languageId,
  languageName: doc.languageName,
  status: doc.status,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
  createdOn: formatDateOnly(doc.createdAt),
  modifiedOn: formatDateOnly(doc.updatedAt)
});

const buildListQuery = ({ search = '', status }) => {
  let query = buildStatusFilter(status);
  query = applySearchFilter(query, search, ['languageName', 'languageId']);
  return query;
};

exports.createLanguage = async (req, res) => {
  try {
    const languageName = resolveLanguageName(req.body);
    const status = normalizeStatus(req.body.status);

    if (status === null) {
      return res.status(400).json({ success: false, message: 'Status must be ACTIVE or INACTIVE' });
    }
    if (!languageName) {
      return res.status(400).json({ success: false, message: 'languageName is required' });
    }

    const duplicate = await TestConfigLanguage.findOne({
      languageName: new RegExp(`^${languageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
      ...NOT_DELETED
    }).lean();

    if (duplicate) {
      return res.status(409).json({ success: false, message: 'Language name already exists' });
    }

    const record = await TestConfigLanguage.create({
      languageId: await generateTestConfigLanguageId(),
      languageName,
      status
    });

    res.status(201).json({
      success: true,
      message: 'Language created successfully',
      data: formatLanguage(record.toObject())
    });
  } catch (error) {
    console.error('Create test config language error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getLanguages = async (req, res) => {
  try {
    const query = buildListQuery(req.query);
    const { page, limit, skip } = parsePagination(req.query);
    const sort = parseTestConfigSort(
      req.query,
      ['createdAt', 'updatedAt', 'languageName', 'languageId', 'status'],
      'createdAt'
    );

    const [rows, total] = await Promise.all([
      TestConfigLanguage.find(query).sort(sort).skip(skip).limit(limit).lean(),
      TestConfigLanguage.countDocuments(query)
    ]);

    res.json({
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 0,
      count: rows.length,
      data: rows.map(formatLanguage)
    });
  } catch (error) {
    console.error('Get test config languages error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getLanguagesDropdown = async (req, res) => {
  try {
    const rows = await TestConfigLanguage.find({ status: 'ACTIVE', ...NOT_DELETED })
      .select('_id languageId languageName')
      .sort({ languageName: 1 })
      .lean();

    res.json({ success: true, count: rows.length, data: rows });
  } catch (error) {
    console.error('Languages dropdown error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getLanguageById = async (req, res) => {
  try {
    const record = await TestConfigLanguage.findOne({ _id: req.params.id, ...NOT_DELETED }).lean();
    if (!record) {
      return res.status(404).json({ success: false, message: 'Language not found' });
    }

    res.json({ success: true, data: formatLanguage(record) });
  } catch (error) {
    console.error('Get language by id error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateLanguage = async (req, res) => {
  try {
    const record = await TestConfigLanguage.findOne({ _id: req.params.id, ...NOT_DELETED });
    if (!record) {
      return res.status(404).json({ success: false, message: 'Language not found' });
    }

    const languageName = resolveLanguageName(req.body);
    if (languageName !== undefined) {
      if (!languageName) {
        return res.status(400).json({ success: false, message: 'languageName cannot be empty' });
      }

      const duplicate = await TestConfigLanguage.findOne({
        _id: { $ne: record._id },
        languageName: new RegExp(`^${languageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
        ...NOT_DELETED
      }).lean();

      if (duplicate) {
        return res.status(409).json({ success: false, message: 'Language name already exists' });
      }

      record.languageName = languageName;
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
      message: 'Language updated successfully',
      data: formatLanguage(record.toObject())
    });
  } catch (error) {
    console.error('Update test config language error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateLanguageStatus = async (req, res) => {
  try {
    const status = normalizeStatus(req.body.status, null);
    if (status === null) {
      return res.status(400).json({ success: false, message: 'Status must be ACTIVE or INACTIVE' });
    }

    const record = await TestConfigLanguage.findOneAndUpdate(
      { _id: req.params.id, ...NOT_DELETED },
      { status },
      { new: true }
    ).lean();

    if (!record) {
      return res.status(404).json({ success: false, message: 'Language not found' });
    }

    res.json({
      success: true,
      message: 'Language status updated',
      data: formatLanguage(record)
    });
  } catch (error) {
    console.error('Update language status error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.deleteLanguage = async (req, res) => {
  try {
    const record = await TestConfigLanguage.findOne({ _id: req.params.id, ...NOT_DELETED });
    if (!record) {
      return res.status(404).json({ success: false, message: 'Language not found' });
    }

    record.isDeleted = true;
    record.deletedAt = new Date();
    record.status = 'INACTIVE';
    await record.save();

    res.json({
      success: true,
      message: 'Language deleted successfully',
      data: { _id: record._id, languageId: record.languageId }
    });
  } catch (error) {
    console.error('Delete test config language error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
