const TestConfigSection = require('../models/TestConfigSection');
const { generateTestConfigSectionId } = require('../utils/contentIdGenerator');
const {
  formatDateOnly,
  normalizeStatus,
  parsePagination,
  parseTestConfigSort,
  buildStatusFilter,
  applySearchFilter,
  NOT_DELETED
} = require('../utils/testConfigurationHelpers');

const resolveSectionName = (body) => {
  const raw = body.sectionName ?? body.section_name ?? body.name;
  return raw !== undefined ? String(raw).trim() : undefined;
};

const formatSection = (doc) => ({
  _id: doc._id,
  sectionId: doc.sectionId,
  sectionName: doc.sectionName,
  status: doc.status,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
  createdOn: formatDateOnly(doc.createdAt),
  modifiedOn: formatDateOnly(doc.updatedAt)
});

const buildListQuery = ({ search = '', status }) => {
  let query = buildStatusFilter(status);
  query = applySearchFilter(query, search, ['sectionName', 'sectionId']);
  return query;
};

exports.createSection = async (req, res) => {
  try {
    const sectionName = resolveSectionName(req.body);
    const status = normalizeStatus(req.body.status);

    if (status === null) {
      return res.status(400).json({ success: false, message: 'Status must be ACTIVE or INACTIVE' });
    }
    if (!sectionName) {
      return res.status(400).json({ success: false, message: 'sectionName is required' });
    }

    const duplicate = await TestConfigSection.findOne({
      sectionName: new RegExp(`^${sectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
      ...NOT_DELETED
    }).lean();

    if (duplicate) {
      return res.status(409).json({ success: false, message: 'Section name already exists' });
    }

    const record = await TestConfigSection.create({
      sectionId: await generateTestConfigSectionId(),
      sectionName,
      status
    });

    res.status(201).json({
      success: true,
      message: 'Section created successfully',
      data: formatSection(record.toObject())
    });
  } catch (error) {
    console.error('Create test config section error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getSections = async (req, res) => {
  try {
    const query = buildListQuery(req.query);
    const { page, limit, skip } = parsePagination(req.query);
    const sort = parseTestConfigSort(
      req.query,
      ['createdAt', 'updatedAt', 'sectionName', 'sectionId', 'status'],
      'createdAt'
    );

    const [rows, total] = await Promise.all([
      TestConfigSection.find(query).sort(sort).skip(skip).limit(limit).lean(),
      TestConfigSection.countDocuments(query)
    ]);

    res.json({
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 0,
      count: rows.length,
      data: rows.map(formatSection)
    });
  } catch (error) {
    console.error('Get test config sections error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getSectionsDropdown = async (req, res) => {
  try {
    const rows = await TestConfigSection.find({ status: 'ACTIVE', ...NOT_DELETED })
      .select('_id sectionId sectionName')
      .sort({ sectionName: 1 })
      .lean();

    res.json({ success: true, count: rows.length, data: rows });
  } catch (error) {
    console.error('Sections dropdown error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getSectionById = async (req, res) => {
  try {
    const record = await TestConfigSection.findOne({ _id: req.params.id, ...NOT_DELETED }).lean();
    if (!record) {
      return res.status(404).json({ success: false, message: 'Section not found' });
    }

    res.json({ success: true, data: formatSection(record) });
  } catch (error) {
    console.error('Get section by id error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateSection = async (req, res) => {
  try {
    const record = await TestConfigSection.findOne({ _id: req.params.id, ...NOT_DELETED });
    if (!record) {
      return res.status(404).json({ success: false, message: 'Section not found' });
    }

    const sectionName = resolveSectionName(req.body);
    if (sectionName !== undefined) {
      if (!sectionName) {
        return res.status(400).json({ success: false, message: 'sectionName cannot be empty' });
      }

      const duplicate = await TestConfigSection.findOne({
        _id: { $ne: record._id },
        sectionName: new RegExp(`^${sectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
        ...NOT_DELETED
      }).lean();

      if (duplicate) {
        return res.status(409).json({ success: false, message: 'Section name already exists' });
      }

      record.sectionName = sectionName;
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
      message: 'Section updated successfully',
      data: formatSection(record.toObject())
    });
  } catch (error) {
    console.error('Update test config section error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateSectionStatus = async (req, res) => {
  try {
    const status = normalizeStatus(req.body.status, null);
    if (status === null) {
      return res.status(400).json({ success: false, message: 'Status must be ACTIVE or INACTIVE' });
    }

    const record = await TestConfigSection.findOneAndUpdate(
      { _id: req.params.id, ...NOT_DELETED },
      { status },
      { new: true }
    ).lean();

    if (!record) {
      return res.status(404).json({ success: false, message: 'Section not found' });
    }

    res.json({
      success: true,
      message: 'Section status updated',
      data: formatSection(record)
    });
  } catch (error) {
    console.error('Update section status error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.deleteSection = async (req, res) => {
  try {
    const record = await TestConfigSection.findOne({ _id: req.params.id, ...NOT_DELETED });
    if (!record) {
      return res.status(404).json({ success: false, message: 'Section not found' });
    }

    record.isDeleted = true;
    record.deletedAt = new Date();
    record.status = 'INACTIVE';
    await record.save();

    res.json({
      success: true,
      message: 'Section deleted successfully',
      data: { _id: record._id, sectionId: record.sectionId }
    });
  } catch (error) {
    console.error('Delete test config section error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
