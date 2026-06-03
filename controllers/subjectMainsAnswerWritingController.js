const SubjectMainsAnswerWriting = require('../models/SubjectMainsAnswerWriting');
const SubjectContentFolder = require('../models/SubjectContentFolder');
const FacultySubject = require('../models/FacultySubject');
const Topic = require('../models/Topic');
const cloudinary = require('../config/cloudinary');
const uploadToCloudinary = require('../utils/uploadToCloudinary');
const {
  generateSubjectMainsAnswerWritingId,
  isValidObjectId
} = require('../utils/contentIdGenerator');
const { NOT_DELETED, parsePagination, parseSort } = require('../utils/contentMastersHelpers');
const {
  formatMainsAnswerWritingRow,
  runMainsAnswerWritingList
} = require('../utils/mainsAnswerWritingListHelpers');
const {
  validateMainsAnswerWritingPayload,
  PUBLISH_STATUSES,
  MAINS_DURATION_PRESETS,
  MAINS_DURATION_PRESET_OPTIONS
} = require('../utils/facultyContentHelpers');
const { sendValidationError, sendNotFound, fail } = require('../utils/cmsApiErrors');

const formatMainsAnswerWriting = formatMainsAnswerWritingRow;

const parseMainsListFilters = (query) => ({
  facultySubjectId: query.facultySubjectId,
  folderId: query.folderId,
  topicId: query.topicId,
  topicName: query.topicName,
  subjectId: query.subjectId,
  subjectName: query.subjectName,
  publishStatus: query.publishStatus
    ? String(query.publishStatus).trim().toUpperCase()
    : undefined,
  search: query.search ?? ''
});

const deletePdfFromCloudinary = async (publicId) => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
  } catch (err) {
    console.error('Cloudinary delete mains answer PDF error:', err.message);
  }
};

exports.createMainsAnswerWriting = async (req, res) => {
  try {
    if (!req.file) {
      return sendValidationError(
        res,
        fail({
          code: 'MAINS_PDF_REQUIRED',
          field: 'pdf',
          message: 'Upload PDF is required',
          suggestions: ['Multipart field name must be "pdf". PDF files only.']
        })
      );
    }

    const validation = await validateMainsAnswerWritingPayload(req.body);
    if (!validation.ok) {
      return sendValidationError(res, validation);
    }

    const uploaded = await uploadToCloudinary(
      req.file,
      'faculty-subject/mains-answer-writing',
      'raw',
      'pdf'
    );

    let resolvedTopicId = validation.topic?._id || null;
    if (!resolvedTopicId && validation.facultySubject?.topics?.length === 1) {
      resolvedTopicId = validation.facultySubject.topics[0];
    }

    const doc = await SubjectMainsAnswerWriting.create({
      mainsAnswerWritingId: await generateSubjectMainsAnswerWritingId(),
      facultySubjectId: validation.facultySubject._id,
      folderId: validation.folder._id,
      topicId: resolvedTopicId,
      testName: String(req.body.testName).trim(),
      scheduleDate: validation.scheduleDate,
      durationPreset: validation.durationPreset,
      durationMinutes: validation.durationMinutes,
      totalMarks: validation.totalMarks,
      passMarks: validation.passMarks ?? null,
      resultDate: validation.resultDate,
      questionsText: validation.questionsText,
      pdf: {
        url: uploaded.url,
        publicId: uploaded.public_id,
        format: uploaded.format || 'pdf',
        bytes: uploaded.bytes || 0
      },
      publishStatus: validation.publishStatus,
      createdBy: req.user?._id || null,
      updatedBy: req.user?._id || null
    });

    res.status(201).json({
      success: true,
      message: 'Mains answer writing entry created successfully',
      data: formatMainsAnswerWriting(doc.toObject())
    });
  } catch (error) {
    console.error('Create mains answer writing error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getMainsAnswerWritings = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const sort = parseSort(req.query, [
      'createdAt',
      'testName',
      'mainsAnswerWritingId',
      'scheduleDate',
      'resultDate'
    ]);

    const { rows, total } = await runMainsAnswerWritingList(parseMainsListFilters(req.query), {
      sort,
      skip,
      limit
    });

    res.json({
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 0,
      count: rows.length,
      data: rows.map((row) => formatMainsAnswerWriting({ ...row, _id: row._id }))
    });
  } catch (error) {
    console.error('List mains answer writing error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getMainsAnswerWritingById = async (req, res) => {
  try {
    const doc = await SubjectMainsAnswerWriting.findOne({ _id: req.params.id, ...NOT_DELETED }).lean();
    if (!doc) {
      return sendNotFound(res, {
        code: 'MAINS_ANSWER_WRITING_NOT_FOUND',
        message: 'Mains answer writing entry not found',
        reason: 'No active entry exists for this id.'
      });
    }

    const [folder, facultySubject, topic] = await Promise.all([
      SubjectContentFolder.findById(doc.folderId).select('folderName').lean(),
      FacultySubject.findById(doc.facultySubjectId).select('subjectName').lean(),
      doc.topicId ? Topic.findById(doc.topicId).select('topicId topicName').lean() : null
    ]);

    res.json({
      success: true,
      data: formatMainsAnswerWriting({
        ...doc,
        folderName: folder?.folderName,
        facultySubjectName: facultySubject?.subjectName,
        topicName: topic?.topicName
      })
    });
  } catch (error) {
    console.error('Get mains answer writing error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateMainsAnswerWriting = async (req, res) => {
  try {
    const existing = await SubjectMainsAnswerWriting.findOne({ _id: req.params.id, ...NOT_DELETED });
    if (!existing) {
      return sendNotFound(res, {
        code: 'MAINS_ANSWER_WRITING_NOT_FOUND',
        message: 'Mains answer writing entry not found'
      });
    }

    const merged = {
      facultySubjectId: req.body.facultySubjectId ?? existing.facultySubjectId,
      folderId: req.body.folderId ?? existing.folderId,
      topicId: req.body.topicId ?? existing.topicId,
      testName: req.body.testName ?? existing.testName,
      scheduleDate: req.body.scheduleDate ?? existing.scheduleDate,
      durationPreset: req.body.durationPreset ?? existing.durationPreset,
      durationMinutes: req.body.durationMinutes ?? existing.durationMinutes,
      totalMarks: req.body.totalMarks ?? existing.totalMarks,
      passMarks: req.body.passMarks ?? existing.passMarks,
      resultDate: req.body.resultDate ?? existing.resultDate,
      questionsText: req.body.questionsText ?? existing.questionsText,
      publishStatus: req.body.publishStatus ?? existing.publishStatus
    };

    const validation = await validateMainsAnswerWritingPayload(merged, { partial: true });
    if (!validation.ok) {
      return sendValidationError(res, validation);
    }

    if (req.body.testName !== undefined) existing.testName = String(req.body.testName).trim();
    if (req.body.scheduleDate !== undefined) existing.scheduleDate = validation.scheduleDate;
    if (req.body.durationPreset !== undefined) existing.durationPreset = validation.durationPreset;
    if (req.body.durationMinutes !== undefined || req.body.durationPreset !== undefined) {
      existing.durationMinutes = validation.durationMinutes;
    }
    if (req.body.totalMarks !== undefined) existing.totalMarks = validation.totalMarks;
    if (req.body.passMarks !== undefined) existing.passMarks = validation.passMarks ?? null;
    if (req.body.resultDate !== undefined) existing.resultDate = validation.resultDate;
    if (req.body.questionsText !== undefined) existing.questionsText = validation.questionsText;
    if (req.body.folderId !== undefined) existing.folderId = validation.folder._id;
    if (req.body.topicId !== undefined) {
      existing.topicId = validation.topic?._id || null;
    }
    if (req.body.facultySubjectId !== undefined) {
      existing.facultySubjectId = validation.facultySubject._id;
    }
    if (req.body.publishStatus !== undefined) existing.publishStatus = validation.publishStatus;

    if (req.file) {
      const uploaded = await uploadToCloudinary(
        req.file,
        'faculty-subject/mains-answer-writing',
        'raw',
        'pdf'
      );
      const oldPublicId = existing.pdf?.publicId;
      existing.pdf = {
        url: uploaded.url,
        publicId: uploaded.public_id,
        format: uploaded.format || 'pdf',
        bytes: uploaded.bytes || 0
      };
      if (oldPublicId) await deletePdfFromCloudinary(oldPublicId);
    }

    existing.updatedBy = req.user?._id || null;
    await existing.save();

    res.json({
      success: true,
      message: 'Mains answer writing entry updated successfully',
      data: formatMainsAnswerWriting(existing.toObject())
    });
  } catch (error) {
    console.error('Update mains answer writing error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateMainsAnswerWritingPublishStatus = async (req, res) => {
  try {
    const publishStatus = String(req.body.publishStatus || '').trim().toUpperCase();
    if (!PUBLISH_STATUSES.includes(publishStatus)) {
      return sendValidationError(
        res,
        fail({
          code: 'INVALID_PUBLISH_STATUS',
          field: 'publishStatus',
          message: `publishStatus must be one of: ${PUBLISH_STATUSES.join(', ')}`
        })
      );
    }

    const doc = await SubjectMainsAnswerWriting.findOneAndUpdate(
      { _id: req.params.id, ...NOT_DELETED },
      { publishStatus, updatedBy: req.user?._id || null },
      { new: true }
    ).lean();

    if (!doc) {
      return sendNotFound(res, {
        code: 'MAINS_ANSWER_WRITING_NOT_FOUND',
        message: 'Mains answer writing entry not found'
      });
    }

    res.json({
      success: true,
      message: `Publish status set to ${publishStatus}`,
      data: formatMainsAnswerWriting(doc)
    });
  } catch (error) {
    console.error('Update mains answer writing publish status error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getMainsAnswerWritingDashboardSummary = async (req, res) => {
  try {
    const match = { ...NOT_DELETED };
    const { facultySubjectId, folderId } = req.query;

    if (facultySubjectId && isValidObjectId(facultySubjectId)) {
      match.facultySubjectId = new mongoose.Types.ObjectId(facultySubjectId);
    }
    if (folderId && isValidObjectId(folderId)) {
      match.folderId = new mongoose.Types.ObjectId(folderId);
    }

    const [total, published, draft, unpublished] = await Promise.all([
      SubjectMainsAnswerWriting.countDocuments(match),
      SubjectMainsAnswerWriting.countDocuments({ ...match, publishStatus: 'PUBLISHED' }),
      SubjectMainsAnswerWriting.countDocuments({ ...match, publishStatus: 'DRAFT' }),
      SubjectMainsAnswerWriting.countDocuments({ ...match, publishStatus: 'UNPUBLISHED' })
    ]);

    res.json({
      success: true,
      data: {
        totalEntries: total,
        publishedCount: published,
        draftCount: draft,
        unpublishedCount: unpublished
      }
    });
  } catch (error) {
    console.error('Mains answer writing dashboard summary error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const MAINS_DEPENDENCY_FLOW = [
  {
    step: 1,
    field: 'facultySubjectId',
    api: 'GET /api/faculty-subjects/dropdown?category=MAINS_ANSWER_WRITING'
  },
  {
    step: 2,
    field: 'topicId',
    api: 'GET /api/mains-answer-writing/filter/topics-dropdown?facultySubjectId={facultySubjectId}'
  },
  {
    step: 3,
    field: 'folderId',
    api: 'GET /api/folders?facultySubjectId={facultySubjectId}&category=MAINS_ANSWER_WRITING'
  },
  {
    step: 4,
    field: 'create',
    api: 'POST /api/mains-answer-writing (multipart pdf file)'
  }
];

exports.getMainsAnswerWritingCreateForm = async (req, res) => {
  try {
    const { facultySubjectId, folderId } = req.query;

    const data = {
      defaults: {
        publishStatus: 'DRAFT',
        durationPreset: '60',
        durationMinutes: 60
      },
      enums: {
        publishStatuses: PUBLISH_STATUSES,
        durationPresets: MAINS_DURATION_PRESET_OPTIONS,
        durationPresetLabels: MAINS_DURATION_PRESETS.map((mins) => ({
          value: String(mins),
          label: `${mins} mins`
        })).concat([{ value: 'CUSTOM', label: 'Custom' }])
      },
      allowedUpload: {
        fieldName: 'pdf',
        maxBytes: 20 * 1024 * 1024,
        mimeTypes: ['application/pdf']
      },
      dependencyFlow: MAINS_DEPENDENCY_FLOW,
      dropdownApis: {
        subjects: '/api/mains-answer-writing/filter/subjects-dropdown',
        topics: '/api/mains-answer-writing/filter/topics-dropdown?facultySubjectId={facultySubjectId}',
        facultySubjects: '/api/faculty-subjects/dropdown?category=MAINS_ANSWER_WRITING',
        folders: '/api/folders?facultySubjectId={facultySubjectId}&category=MAINS_ANSWER_WRITING'
      },
      listFilters: {
        facultySubjectId: 'Faculty subject Mongo _id',
        subjectName: 'Filter by faculty subject display name (partial match)',
        subjectId: 'Master subject Mongo _id',
        topicId: 'Topic Mongo _id',
        topicName: 'Filter by topic name (partial match)',
        folderId: 'Content folder Mongo _id',
        publishStatus: 'DRAFT | PUBLISHED | UNPUBLISHED',
        search: 'testName, subject, topic, folder'
      },
      folders: [],
      topics: []
    };

    if (facultySubjectId && isValidObjectId(facultySubjectId)) {
      const facultySubject = await FacultySubject.findOne({
        _id: facultySubjectId,
        status: 'ACTIVE',
        categories: { $in: ['MAINS_ANSWER_WRITING'] },
        ...NOT_DELETED
      })
        .select('_id facultySubjectId subjectName categories')
        .lean();

      if (!facultySubject) {
        return res.status(400).json({
          success: false,
          message: 'Invalid faculty subject or MAINS_ANSWER_WRITING category not enabled'
        });
      }

      const folders = await SubjectContentFolder.find({
        facultySubjectId,
        category: 'MAINS_ANSWER_WRITING',
        status: 'ACTIVE',
        ...NOT_DELETED
      })
        .select('_id folderId folderName')
        .sort({ folderName: 1 })
        .lean();

      data.facultySubject = {
        _id: facultySubject._id,
        facultySubjectId: facultySubject.facultySubjectId,
        subjectName: facultySubject.subjectName
      };
      const topicIds = facultySubject.topics || [];
      const topics = topicIds.length
        ? await Topic.find({ _id: { $in: topicIds }, status: 'ACTIVE', ...NOT_DELETED })
            .select('_id topicId topicName')
            .sort({ topicName: 1 })
            .lean()
        : [];

      data.folders = folders.map((f) => ({
        _id: f._id,
        folderId: f.folderId,
        folderName: f.folderName
      }));
      data.topics = topics.map((t) => ({
        _id: t._id,
        topicId: t.topicId,
        topicName: t.topicName
      }));
    }

    if (folderId && isValidObjectId(folderId)) {
      const folder = await SubjectContentFolder.findOne({
        _id: folderId,
        category: 'MAINS_ANSWER_WRITING',
        ...NOT_DELETED
      })
        .select('_id folderId folderName facultySubjectId')
        .lean();
      data.selectedFolder = folder || null;
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Mains answer writing create form error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getMainsAnswerWritingSubjectsDropdown = async (req, res) => {
  try {
    const rows = await FacultySubject.find({
      status: 'ACTIVE',
      categories: { $in: ['MAINS_ANSWER_WRITING'] },
      ...NOT_DELETED
    })
      .populate('subject', 'subjectId subjectName')
      .select('_id facultySubjectId subjectName subject')
      .sort({ subjectName: 1 })
      .lean();

    res.json({
      success: true,
      count: rows.length,
      data: rows.map((r) => ({
        _id: r._id,
        facultySubjectId: r.facultySubjectId,
        subjectName: r.subjectName,
        masterSubjectId: r.subject?._id || null,
        masterSubjectName: r.subject?.subjectName || null
      }))
    });
  } catch (error) {
    console.error('Mains subjects dropdown error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getMainsAnswerWritingTopicsDropdown = async (req, res) => {
  try {
    const { facultySubjectId } = req.query;

    if (!facultySubjectId || !isValidObjectId(facultySubjectId)) {
      return res.status(400).json({
        success: false,
        message: 'facultySubjectId is required and must be a valid id'
      });
    }

    const facultySubject = await FacultySubject.findOne({
      _id: facultySubjectId,
      status: 'ACTIVE',
      categories: { $in: ['MAINS_ANSWER_WRITING'] },
      ...NOT_DELETED
    })
      .select('_id facultySubjectId subjectName topics')
      .lean();

    if (!facultySubject) {
      return res.status(400).json({
        success: false,
        message: 'Invalid faculty subject or MAINS_ANSWER_WRITING category not enabled'
      });
    }

    const topicIds = facultySubject.topics || [];
    const topics = topicIds.length
      ? await Topic.find({ _id: { $in: topicIds }, status: 'ACTIVE', ...NOT_DELETED })
          .select('_id topicId topicName')
          .sort({ topicName: 1 })
          .lean()
      : [];

    res.json({
      success: true,
      facultySubject: {
        _id: facultySubject._id,
        facultySubjectId: facultySubject.facultySubjectId,
        subjectName: facultySubject.subjectName
      },
      count: topics.length,
      data: topics.map((t) => ({
        _id: t._id,
        topicId: t.topicId,
        topicName: t.topicName
      }))
    });
  } catch (error) {
    console.error('Mains topics dropdown error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.deleteMainsAnswerWriting = async (req, res) => {
  try {
    const doc = await SubjectMainsAnswerWriting.findOne({ _id: req.params.id, ...NOT_DELETED });
    if (!doc) {
      return sendNotFound(res, {
        code: 'MAINS_ANSWER_WRITING_NOT_FOUND',
        message: 'Mains answer writing entry not found'
      });
    }

    if (doc.pdf?.publicId) {
      await deletePdfFromCloudinary(doc.pdf.publicId);
    }

    doc.isDeleted = true;
    doc.deletedAt = new Date();
    doc.updatedBy = req.user?._id || null;
    await doc.save();

    res.json({
      success: true,
      message: 'Mains answer writing entry deleted successfully',
      data: { _id: doc._id }
    });
  } catch (error) {
    console.error('Delete mains answer writing error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
