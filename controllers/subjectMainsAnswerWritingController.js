const mongoose = require('mongoose');
const SubjectMainsAnswerWriting = require('../models/SubjectMainsAnswerWriting');
const SubjectContentFolder = require('../models/SubjectContentFolder');
const FacultySubject = require('../models/FacultySubject');
const cloudinary = require('../config/cloudinary');
const uploadToCloudinary = require('../utils/uploadToCloudinary');
const {
  generateSubjectMainsAnswerWritingId,
  isValidObjectId
} = require('../utils/contentIdGenerator');
const { NOT_DELETED, escapeRegex, parsePagination, parseSort } = require('../utils/contentMastersHelpers');
const {
  validateMainsAnswerWritingPayload,
  PUBLISH_STATUSES,
  MAINS_DURATION_PRESETS,
  MAINS_DURATION_PRESET_OPTIONS
} = require('../utils/facultyContentHelpers');
const { sendValidationError, sendNotFound, fail } = require('../utils/cmsApiErrors');

const formatDurationLabel = (minutes = 0) => {
  const mins = Math.max(0, Number(minutes) || 0);
  if (mins < 60) return `${mins} mins`;
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem ? `${hours} hr ${rem} mins` : `${hours} hr`;
};

const formatMainsAnswerWriting = (doc) => ({
  _id: doc._id,
  mainsAnswerWritingId: doc.mainsAnswerWritingId,
  facultySubjectId: doc.facultySubjectId,
  folderId: doc.folderId,
  testName: doc.testName,
  scheduleDate: doc.scheduleDate,
  durationPreset: doc.durationPreset,
  durationMinutes: doc.durationMinutes,
  durationLabel: formatDurationLabel(doc.durationMinutes),
  totalMarks: doc.totalMarks,
  resultDate: doc.resultDate,
  questionsText: doc.questionsText,
  pdf: doc.pdf,
  publishStatus: doc.publishStatus,
  folderName: doc.folderName || doc.folder?.folderName || '',
  facultySubjectName: doc.facultySubjectName || doc.facultySubject?.subjectName || '',
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt
});

const buildListPipeline = ({
  facultySubjectId,
  folderId,
  publishStatus,
  search = '',
  sort,
  skip,
  limit
}) => {
  const match = { isDeleted: false };

  if (facultySubjectId && isValidObjectId(facultySubjectId)) {
    match.facultySubjectId = new mongoose.Types.ObjectId(facultySubjectId);
  }
  if (folderId && isValidObjectId(folderId)) {
    match.folderId = new mongoose.Types.ObjectId(folderId);
  }
  if (publishStatus && PUBLISH_STATUSES.includes(publishStatus)) {
    match.publishStatus = publishStatus;
  }

  const pipeline = [{ $match: match }];

  pipeline.push(
    {
      $lookup: {
        from: 'subjectcontentfolders',
        localField: 'folderId',
        foreignField: '_id',
        as: 'folderDoc'
      }
    },
    {
      $lookup: {
        from: 'facultysubjects',
        localField: 'facultySubjectId',
        foreignField: '_id',
        as: 'facultySubjectDoc'
      }
    },
    { $unwind: { path: '$folderDoc', preserveNullAndEmptyArrays: true } },
    { $unwind: { path: '$facultySubjectDoc', preserveNullAndEmptyArrays: true } }
  );

  const trimmed = String(search).trim();
  if (trimmed) {
    const term = escapeRegex(trimmed);
    pipeline.push({
      $match: {
        $or: [
          { testName: { $regex: term, $options: 'i' } },
          { 'folderDoc.folderName': { $regex: term, $options: 'i' } },
          { 'facultySubjectDoc.subjectName': { $regex: term, $options: 'i' } }
        ]
      }
    });
  }

  pipeline.push({
    $facet: {
      rows: [
        { $sort: sort },
        { $skip: skip },
        { $limit: limit },
        {
          $project: {
            _id: 1,
            mainsAnswerWritingId: 1,
            facultySubjectId: 1,
            folderId: 1,
            testName: 1,
            scheduleDate: 1,
            durationPreset: 1,
            durationMinutes: 1,
            totalMarks: 1,
            resultDate: 1,
            questionsText: 1,
            pdf: 1,
            publishStatus: 1,
            createdAt: 1,
            updatedAt: 1,
            folderName: '$folderDoc.folderName',
            facultySubjectName: '$facultySubjectDoc.subjectName'
          }
        }
      ],
      total: [{ $count: 'count' }]
    }
  });

  return pipeline;
};

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

    const doc = await SubjectMainsAnswerWriting.create({
      mainsAnswerWritingId: await generateSubjectMainsAnswerWritingId(),
      facultySubjectId: validation.facultySubject._id,
      folderId: validation.folder._id,
      testName: String(req.body.testName).trim(),
      scheduleDate: validation.scheduleDate,
      durationPreset: validation.durationPreset,
      durationMinutes: validation.durationMinutes,
      totalMarks: validation.totalMarks,
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

    const pipeline = buildListPipeline({
      facultySubjectId: req.query.facultySubjectId,
      folderId: req.query.folderId,
      publishStatus: req.query.publishStatus
        ? String(req.query.publishStatus).trim().toUpperCase()
        : undefined,
      search: req.query.search ?? '',
      sort,
      skip,
      limit
    });

    const [result] = await SubjectMainsAnswerWriting.aggregate(pipeline);
    const rows = result?.rows || [];
    const total = result?.total?.[0]?.count || 0;

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

    const [folder, facultySubject] = await Promise.all([
      SubjectContentFolder.findById(doc.folderId).select('folderName').lean(),
      FacultySubject.findById(doc.facultySubjectId).select('subjectName').lean()
    ]);

    res.json({
      success: true,
      data: formatMainsAnswerWriting({
        ...doc,
        folderName: folder?.folderName,
        facultySubjectName: facultySubject?.subjectName
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
      testName: req.body.testName ?? existing.testName,
      scheduleDate: req.body.scheduleDate ?? existing.scheduleDate,
      durationPreset: req.body.durationPreset ?? existing.durationPreset,
      durationMinutes: req.body.durationMinutes ?? existing.durationMinutes,
      totalMarks: req.body.totalMarks ?? existing.totalMarks,
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
    if (req.body.resultDate !== undefined) existing.resultDate = validation.resultDate;
    if (req.body.questionsText !== undefined) existing.questionsText = validation.questionsText;
    if (req.body.folderId !== undefined) existing.folderId = validation.folder._id;
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
    field: 'folderId',
    api: 'GET /api/folders?facultySubjectId={facultySubjectId}&category=MAINS_ANSWER_WRITING'
  },
  {
    step: 3,
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
        facultySubjects: '/api/faculty-subjects/dropdown?category=MAINS_ANSWER_WRITING',
        folders: '/api/folders?facultySubjectId={facultySubjectId}&category=MAINS_ANSWER_WRITING'
      },
      folders: []
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
      data.folders = folders.map((f) => ({
        _id: f._id,
        folderId: f.folderId,
        folderName: f.folderName
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
