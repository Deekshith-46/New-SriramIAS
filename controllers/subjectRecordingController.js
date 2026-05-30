const mongoose = require('mongoose');
const SubjectRecording = require('../models/SubjectRecording');
const SubjectContentFolder = require('../models/SubjectContentFolder');
const FacultySubject = require('../models/FacultySubject');
const Topic = require('../models/Topic');
const Teacher = require('../models/Teacher');
const Batch = require('../models/Batch');
const Center = require('../models/Center');
const cloudinary = require('../config/cloudinary');
const uploadToCloudinary = require('../utils/uploadToCloudinary');
const {
  generateSubjectRecordingId,
  isValidObjectId
} = require('../utils/contentIdGenerator');
const { NOT_DELETED, escapeRegex, parsePagination, parseSort } = require('../utils/contentMastersHelpers');
const {
  validateRecordingPayload,
  RECORDING_VISIBILITY_STATUSES,
  resolveRecordingTopicsForBatch
} = require('../utils/facultyContentHelpers');
const { sendValidationError, sendNotFound, fail } = require('../utils/cmsApiErrors');

const formatDurationLabel = (seconds = 0) => {
  const total = Math.max(0, Number(seconds) || 0);
  const mins = Math.floor(total / 60);
  if (mins < 60) return `${mins} mins`;
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem ? `${hours} hr ${rem} mins` : `${hours} hr`;
};

const formatRecording = (doc) => ({
  _id: doc._id,
  recordingId: doc.recordingId,
  facultySubjectId: doc.facultySubjectId,
  folderId: doc.folderId,
  batchId: doc.batchId,
  lessonName: doc.lessonName,
  centerId: doc.centerId,
  topicId: doc.topicId,
  teacherId: doc.teacherId,
  tags: doc.tags || [],
  visibility: doc.visibility,
  recording: doc.recording,
  description: doc.description || '',
  viewCount: doc.viewCount ?? 0,
  durationLabel: formatDurationLabel(doc.recording?.durationSeconds),
  folderName: doc.folderName || doc.folder?.folderName || '',
  facultySubjectName: doc.facultySubjectName || doc.facultySubject?.subjectName || '',
  topicName: doc.topicName || doc.topic?.topicName || '',
  teacherName: doc.teacherName || doc.teacher?.teacherName || '',
  batchName: doc.batchName || doc.batch?.batchName || '',
  centerName: doc.centerName || doc.center?.centerName || doc.center?.name || '',
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt
});

const buildListPipeline = ({
  facultySubjectId,
  folderId,
  visibility,
  batchId,
  centerId,
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
  if (visibility && RECORDING_VISIBILITY_STATUSES.includes(visibility)) {
    match.visibility = visibility;
  }
  if (batchId && isValidObjectId(batchId)) {
    match.batchId = new mongoose.Types.ObjectId(batchId);
  }
  if (centerId && isValidObjectId(centerId)) {
    match.centerId = new mongoose.Types.ObjectId(centerId);
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
    {
      $lookup: {
        from: 'topics',
        localField: 'topicId',
        foreignField: '_id',
        as: 'topicDoc'
      }
    },
    {
      $lookup: {
        from: 'teachers',
        localField: 'teacherId',
        foreignField: '_id',
        as: 'teacherDoc'
      }
    },
    {
      $lookup: {
        from: 'batches',
        localField: 'batchId',
        foreignField: '_id',
        as: 'batchDoc'
      }
    },
    {
      $lookup: {
        from: 'centers',
        localField: 'centerId',
        foreignField: '_id',
        as: 'centerDoc'
      }
    },
    { $unwind: { path: '$folderDoc', preserveNullAndEmptyArrays: true } },
    { $unwind: { path: '$facultySubjectDoc', preserveNullAndEmptyArrays: true } },
    { $unwind: { path: '$topicDoc', preserveNullAndEmptyArrays: true } },
    { $unwind: { path: '$teacherDoc', preserveNullAndEmptyArrays: true } },
    { $unwind: { path: '$batchDoc', preserveNullAndEmptyArrays: true } },
    { $unwind: { path: '$centerDoc', preserveNullAndEmptyArrays: true } }
  );

  const trimmed = String(search).trim();
  if (trimmed) {
    const term = escapeRegex(trimmed);
    pipeline.push({
      $match: {
        $or: [
          { lessonName: { $regex: term, $options: 'i' } },
          { 'folderDoc.folderName': { $regex: term, $options: 'i' } },
          { 'facultySubjectDoc.subjectName': { $regex: term, $options: 'i' } },
          { 'topicDoc.topicName': { $regex: term, $options: 'i' } }
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
            recordingId: 1,
            facultySubjectId: 1,
            folderId: 1,
            batchId: 1,
            lessonName: 1,
            centerId: 1,
            topicId: 1,
            teacherId: 1,
            tags: 1,
            visibility: 1,
            recording: 1,
            description: 1,
            viewCount: 1,
            createdAt: 1,
            updatedAt: 1,
            folderName: '$folderDoc.folderName',
            facultySubjectName: '$facultySubjectDoc.subjectName',
            topicName: '$topicDoc.topicName',
            teacherName: '$teacherDoc.teacherName',
            batchName: '$batchDoc.batchName',
            centerName: { $ifNull: ['$centerDoc.centerName', '$centerDoc.name'] }
          }
        }
      ],
      total: [{ $count: 'count' }]
    }
  });

  return pipeline;
};

const deleteRecordingFromCloudinary = async (publicId) => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
  } catch (err) {
    console.error('Cloudinary delete recording error:', err.message);
  }
};

exports.createRecording = async (req, res) => {
  try {
    if (!req.file) {
      return sendValidationError(
        res,
        fail({
          code: 'RECORDING_FILE_REQUIRED',
          field: 'recording',
          message: 'Upload Recording is required',
          suggestions: ['Multipart field name must be "recording".']
        })
      );
    }

    const validation = await validateRecordingPayload(req.body);
    if (!validation.ok) {
      return sendValidationError(res, validation);
    }

    const uploaded = await uploadToCloudinary(
      req.file,
      'faculty-subject/recordings',
      'video'
    );

    const doc = await SubjectRecording.create({
      recordingId: await generateSubjectRecordingId(),
      facultySubjectId: validation.facultySubject._id,
      folderId: validation.folder._id,
      batchId: req.body.batchId,
      lessonName: String(req.body.lessonName).trim(),
      centerId: req.body.centerId,
      topicId: req.body.topicId,
      teacherId: req.body.teacherId,
      tags: validation.tags,
      visibility: validation.visibility,
      recording: {
        url: uploaded.url,
        publicId: uploaded.public_id,
        durationSeconds: uploaded.duration || 0,
        format: uploaded.format || '',
        bytes: uploaded.bytes || 0
      },
      description:
        validation.description !== undefined
          ? validation.description
          : String(req.body.description || '').trim(),
      createdBy: req.user?._id || null,
      updatedBy: req.user?._id || null
    });

    res.status(201).json({
      success: true,
      message: 'Recording created successfully',
      data: formatRecording(doc.toObject())
    });
  } catch (error) {
    console.error('Create recording error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getRecordings = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const sort = parseSort(req.query, ['createdAt', 'lessonName', 'recordingId', 'viewCount']);

    const pipeline = buildListPipeline({
      facultySubjectId: req.query.facultySubjectId,
      folderId: req.query.folderId,
      visibility: req.query.visibility
        ? String(req.query.visibility).trim().toUpperCase()
        : undefined,
      batchId: req.query.batchId,
      centerId: req.query.centerId,
      search: req.query.search ?? '',
      sort,
      skip,
      limit
    });

    const [result] = await SubjectRecording.aggregate(pipeline);
    const rows = result?.rows || [];
    const total = result?.total?.[0]?.count || 0;

    res.json({
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 0,
      count: rows.length,
      data: rows.map((row) => formatRecording({ ...row, _id: row._id }))
    });
  } catch (error) {
    console.error('List recordings error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getRecordingById = async (req, res) => {
  try {
    const doc = await SubjectRecording.findOne({ _id: req.params.id, ...NOT_DELETED }).lean();
    if (!doc) {
      return sendNotFound(res, {
        code: 'RECORDING_NOT_FOUND',
        message: 'Recording not found',
        reason: 'No active recording exists for this id.'
      });
    }

    const [folder, facultySubject, topic, teacher, batch, center] = await Promise.all([
      SubjectContentFolder.findById(doc.folderId).select('folderName').lean(),
      FacultySubject.findById(doc.facultySubjectId).select('subjectName').lean(),
      Topic.findById(doc.topicId).select('topicId topicName').lean(),
      Teacher.findById(doc.teacherId).select('teacherId teacherName').lean(),
      Batch.findById(doc.batchId).select('batchId batchName').lean(),
      Center.findById(doc.centerId).select('centerName name').lean()
    ]);

    res.json({
      success: true,
      data: formatRecording({
        ...doc,
        folderName: folder?.folderName,
        facultySubjectName: facultySubject?.subjectName,
        topicName: topic?.topicName,
        teacherName: teacher?.teacherName,
        batchName: batch?.batchName,
        centerName: center?.centerName || center?.name
      })
    });
  } catch (error) {
    console.error('Get recording error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateRecording = async (req, res) => {
  try {
    const existing = await SubjectRecording.findOne({ _id: req.params.id, ...NOT_DELETED });
    if (!existing) {
      return sendNotFound(res, {
        code: 'RECORDING_NOT_FOUND',
        message: 'Recording not found'
      });
    }

    const merged = {
      facultySubjectId: req.body.facultySubjectId ?? existing.facultySubjectId,
      folderId: req.body.folderId ?? existing.folderId,
      batchId: req.body.batchId ?? existing.batchId,
      lessonName: req.body.lessonName ?? existing.lessonName,
      centerId: req.body.centerId ?? existing.centerId,
      topicId: req.body.topicId ?? existing.topicId,
      teacherId: req.body.teacherId ?? existing.teacherId,
      visibility: req.body.visibility ?? existing.visibility,
      tags: req.body.tags !== undefined ? req.body.tags : existing.tags,
      description: req.body.description !== undefined ? req.body.description : existing.description
    };

    const validation = await validateRecordingPayload(merged, { partial: true });
    if (!validation.ok) {
      return sendValidationError(res, validation);
    }

    if (req.body.lessonName !== undefined) {
      existing.lessonName = String(req.body.lessonName).trim();
    }
    if (req.body.batchId !== undefined) existing.batchId = req.body.batchId;
    if (req.body.centerId !== undefined) existing.centerId = req.body.centerId;
    if (req.body.topicId !== undefined) existing.topicId = req.body.topicId;
    if (req.body.teacherId !== undefined) existing.teacherId = req.body.teacherId;
    if (req.body.folderId !== undefined) existing.folderId = validation.folder._id;
    if (req.body.facultySubjectId !== undefined) {
      existing.facultySubjectId = validation.facultySubject._id;
    }
    if (req.body.visibility !== undefined) existing.visibility = validation.visibility;
    if (req.body.tags !== undefined) existing.tags = validation.tags;
    if (req.body.description !== undefined) {
      existing.description = String(req.body.description || '').trim();
    }

    if (req.file) {
      const uploaded = await uploadToCloudinary(
        req.file,
        'faculty-subject/recordings',
        'video'
      );
      const oldPublicId = existing.recording?.publicId;
      existing.recording = {
        url: uploaded.url,
        publicId: uploaded.public_id,
        durationSeconds: uploaded.duration || 0,
        format: uploaded.format || '',
        bytes: uploaded.bytes || 0
      };
      if (oldPublicId) await deleteRecordingFromCloudinary(oldPublicId);
    }

    existing.updatedBy = req.user?._id || null;
    await existing.save();

    res.json({
      success: true,
      message: 'Recording updated successfully',
      data: formatRecording(existing.toObject())
    });
  } catch (error) {
    console.error('Update recording error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateRecordingVisibility = async (req, res) => {
  try {
    const visibility = String(req.body.visibility || '').trim().toUpperCase();
    if (!RECORDING_VISIBILITY_STATUSES.includes(visibility)) {
      return sendValidationError(
        res,
        fail({
          code: 'INVALID_VISIBILITY',
          field: 'visibility',
          message: `visibility must be one of: ${RECORDING_VISIBILITY_STATUSES.join(', ')}`
        })
      );
    }

    const doc = await SubjectRecording.findOneAndUpdate(
      { _id: req.params.id, ...NOT_DELETED },
      { visibility, updatedBy: req.user?._id || null },
      { new: true }
    ).lean();

    if (!doc) {
      return sendNotFound(res, {
        code: 'RECORDING_NOT_FOUND',
        message: 'Recording not found'
      });
    }

    res.json({
      success: true,
      message: `Recording visibility set to ${visibility}`,
      data: formatRecording(doc)
    });
  } catch (error) {
    console.error('Update recording visibility error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.playRecording = async (req, res) => {
  try {
    const doc = await SubjectRecording.findOneAndUpdate(
      { _id: req.params.id, ...NOT_DELETED },
      { $inc: { viewCount: 1 } },
      { new: true }
    ).lean();

    if (!doc) {
      return sendNotFound(res, {
        code: 'RECORDING_NOT_FOUND',
        message: 'Recording not found'
      });
    }

    res.json({
      success: true,
      data: {
        recordingId: doc.recordingId,
        lessonName: doc.lessonName,
        videoUrl: doc.recording?.url,
        durationSeconds: doc.recording?.durationSeconds ?? 0,
        durationLabel: formatDurationLabel(doc.recording?.durationSeconds),
        viewCount: doc.viewCount
      }
    });
  } catch (error) {
    console.error('Play recording error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getRecordingDashboardSummary = async (req, res) => {
  try {
    const match = { ...NOT_DELETED };
    const { facultySubjectId, folderId, batchId, centerId } = req.query;

    if (facultySubjectId && isValidObjectId(facultySubjectId)) {
      match.facultySubjectId = new mongoose.Types.ObjectId(facultySubjectId);
    }
    if (folderId && isValidObjectId(folderId)) {
      match.folderId = new mongoose.Types.ObjectId(folderId);
    }
    if (batchId && isValidObjectId(batchId)) {
      match.batchId = new mongoose.Types.ObjectId(batchId);
    }
    if (centerId && isValidObjectId(centerId)) {
      match.centerId = new mongoose.Types.ObjectId(centerId);
    }

    const counts = await Promise.all(
      RECORDING_VISIBILITY_STATUSES.map((status) =>
        SubjectRecording.countDocuments({ ...match, visibility: status })
      )
    );

    const totalRecordings = counts.reduce((a, b) => a + b, 0);
    const totalViews = await SubjectRecording.aggregate([
      { $match: match },
      { $group: { _id: null, views: { $sum: '$viewCount' } } }
    ]);

    const summary = {
      totalRecordings,
      totalViews: totalViews[0]?.views || 0
    };

    RECORDING_VISIBILITY_STATUSES.forEach((status, index) => {
      const key =
        status === 'VISIBILITY'
          ? 'visibilityCount'
          : `${status.charAt(0)}${status.slice(1).toLowerCase()}Count`;
      summary[key] = counts[index];
    });

    res.json({ success: true, data: summary });
  } catch (error) {
    console.error('Recording dashboard summary error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const RECORDING_DEPENDENCY_FLOW = [
  { step: 1, field: 'facultySubjectId', api: 'GET /api/faculty-subjects/dropdown?category=RECORDING' },
  {
    step: 2,
    field: 'folderId',
    api: 'GET /api/folders?facultySubjectId={facultySubjectId}&category=RECORDING'
  },
  { step: 3, field: 'batchId', api: 'GET /api/batches/dropdown?facultySubjectId={facultySubjectId}' },
  { step: 4, field: 'centerId', api: 'GET /api/centers/dropdown' },
  {
    step: 5,
    field: 'topicId',
    api: 'GET /api/recordings/topics-dropdown?batchId={batchId}&facultySubjectId={facultySubjectId}'
  },
  {
    step: 6,
    field: 'teacherId',
    api: 'GET /api/recordings/create-form?facultySubjectId={facultySubjectId} → data.teacher'
  },
  { step: 7, field: 'create', api: 'POST /api/recordings (multipart recording file)' }
];

exports.getRecordingCreateForm = async (req, res) => {
  try {
    const { facultySubjectId, folderId, batchId } = req.query;

    const data = {
      defaults: {
        visibility: 'DRAFT',
        tags: []
      },
      enums: {
        visibility: RECORDING_VISIBILITY_STATUSES
      },
      allowedUpload: {
        fieldName: 'recording',
        maxBytes: 100 * 1024 * 1024,
        mimeTypes: ['video/mp4', 'video/quicktime', 'video/x-matroska', 'video/x-msvideo', 'video/avi']
      },
      dependencyFlow: RECORDING_DEPENDENCY_FLOW,
      dropdownApis: {
        facultySubjects: '/api/faculty-subjects/dropdown?category=RECORDING',
        folders: '/api/folders?facultySubjectId={facultySubjectId}&category=RECORDING',
        batches: '/api/batches/dropdown?facultySubjectId={facultySubjectId}',
        centers: '/api/centers/dropdown',
        topics: '/api/recordings/topics-dropdown?batchId={batchId}&facultySubjectId={facultySubjectId}'
      },
      topics: [],
      teacher: null,
      folders: [],
      batches: []
    };

    if (facultySubjectId && isValidObjectId(facultySubjectId)) {
      const facultySubject = await FacultySubject.findOne({
        _id: facultySubjectId,
        status: 'ACTIVE',
        categories: { $in: ['RECORDING'] },
        ...NOT_DELETED
      })
        .select('_id facultySubjectId subjectName teacher topics categories')
        .lean();

      if (!facultySubject) {
        return res.status(400).json({
          success: false,
          message: 'Invalid faculty subject or RECORDING category not enabled'
        });
      }

      if (!facultySubject.categories?.includes('RECORDING')) {
        return res.status(400).json({
          success: false,
          message: 'RECORDING category is not enabled on this faculty subject'
        });
      }

      const topicIds = facultySubject.topics || [];
      const [topics, teacher, folders, batches] = await Promise.all([
        Topic.find({ _id: { $in: topicIds }, status: 'ACTIVE', ...NOT_DELETED })
          .select('_id topicId topicName')
          .sort({ topicName: 1 })
          .lean(),
        Teacher.findOne({ _id: facultySubject.teacher, ...NOT_DELETED })
          .select('_id teacherId teacherName')
          .lean(),
        SubjectContentFolder.find({
          facultySubjectId,
          category: 'RECORDING',
          status: 'ACTIVE',
          ...NOT_DELETED
        })
          .select('_id folderId folderName')
          .sort({ folderName: 1 })
          .lean(),
        Batch.find({
          facultySubjects: facultySubjectId,
          status: { $in: ['ACTIVE', 'UPCOMING'] },
          ...NOT_DELETED
        })
          .select('_id batchId batchName')
          .sort({ batchName: 1 })
          .lean()
      ]);

      data.facultySubject = {
        _id: facultySubject._id,
        facultySubjectId: facultySubject.facultySubjectId,
        subjectName: facultySubject.subjectName
      };
      data.topics = topics.map((t) => ({
        _id: t._id,
        topicId: t.topicId,
        topicName: t.topicName
      }));
      data.teacher = teacher
        ? { _id: teacher._id, teacherId: teacher.teacherId, teacherName: teacher.teacherName }
        : null;
      data.folders = folders.map((f) => ({
        _id: f._id,
        folderId: f.folderId,
        folderName: f.folderName
      }));
      data.batches = batches.map((b) => ({
        _id: b._id,
        batchId: b.batchId,
        batchName: b.batchName
      }));
    }

    if (folderId && isValidObjectId(folderId)) {
      const folder = await SubjectContentFolder.findOne({
        _id: folderId,
        category: 'RECORDING',
        ...NOT_DELETED
      })
        .select('_id folderId folderName facultySubjectId')
        .lean();
      data.selectedFolder = folder || null;
    }

    if (batchId && isValidObjectId(batchId)) {
      const topicResult = await resolveRecordingTopicsForBatch(batchId, facultySubjectId || undefined);
      if (topicResult.ok) {
        data.topics = topicResult.topics;
        data.batch = topicResult.batch;
        if (!data.facultySubject && topicResult.facultySubject) {
          data.facultySubject = topicResult.facultySubject;
        }
      } else if (facultySubjectId) {
        return sendValidationError(res, topicResult);
      }
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Recording create form error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getRecordingTopicsDropdown = async (req, res) => {
  try {
    const { batchId, facultySubjectId } = req.query;

    if (!batchId) {
      return sendValidationError(
        res,
        fail({
          code: 'VALIDATION_REQUIRED_FIELDS',
          field: 'batchId',
          message: 'batchId is required',
          suggestions: [
            'Call after user selects a batch: GET /api/recordings/topics-dropdown?batchId=&facultySubjectId='
          ]
        })
      );
    }

    const result = await resolveRecordingTopicsForBatch(batchId, facultySubjectId);
    if (!result.ok) {
      return sendValidationError(res, result);
    }

    res.json({
      success: true,
      message: 'Topics loaded for batch faculty subject',
      batch: result.batch,
      facultySubject: result.facultySubject,
      count: result.topics.length,
      data: result.topics
    });
  } catch (error) {
    console.error('Recording topics dropdown error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.deleteRecording = async (req, res) => {
  try {
    const doc = await SubjectRecording.findOne({ _id: req.params.id, ...NOT_DELETED });
    if (!doc) {
      return sendNotFound(res, {
        code: 'RECORDING_NOT_FOUND',
        message: 'Recording not found'
      });
    }

    if (doc.recording?.publicId) {
      await deleteRecordingFromCloudinary(doc.recording.publicId);
    }

    doc.isDeleted = true;
    doc.deletedAt = new Date();
    doc.updatedBy = req.user?._id || null;
    await doc.save();

    res.json({
      success: true,
      message: 'Recording deleted successfully',
      data: { _id: doc._id }
    });
  } catch (error) {
    console.error('Delete recording error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
