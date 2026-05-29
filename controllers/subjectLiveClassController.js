const mongoose = require('mongoose');
const SubjectLiveClass = require('../models/SubjectLiveClass');
const SubjectContentFolder = require('../models/SubjectContentFolder');
const FacultySubject = require('../models/FacultySubject');
const {
  generateSubjectLiveClassId,
  isValidObjectId
} = require('../utils/contentIdGenerator');
const { NOT_DELETED, escapeRegex, parsePagination, parseSort } = require('../utils/contentMastersHelpers');
const Batch = require('../models/Batch');
const Center = require('../models/Center');
const Classroom = require('../models/Classroom');
const {
  validateLiveClassPayload,
  validateRecurrence,
  validateTimeString,
  PUBLISH_STATUSES,
  LIVE_CLASS_TIMEZONES,
  CLASS_STATUSES,
  REPEAT_TYPES,
  WEEKDAYS,
  MONTHLY_PATTERNS
} = require('../utils/facultyContentHelpers');
const { previewRecurrence } = require('../services/recurrenceEngine');
const { runScheduleConflictChecks } = require('../services/scheduleConflictService');
const {
  sendValidationError,
  sendScheduleConflictError,
  sendNotFound,
  fail
} = require('../utils/cmsApiErrors');

const formatLiveClass = (doc) => ({
  _id: doc._id,
  liveClassId: doc.liveClassId,
  facultySubjectId: doc.facultySubjectId,
  folderId: doc.folderId,
  batchId: doc.batchId,
  centerId: doc.centerId,
  classroomId: doc.classroomId,
  classTitle: doc.classTitle,
  scheduledDate: doc.scheduledDate,
  startTime: doc.startTime,
  durationHours: doc.durationHours ?? 0,
  durationMinutes: doc.durationMinutes ?? 0,
  durationSeconds: doc.durationSeconds ?? 0,
  timezone: doc.timezone,
  attendanceEnabled: doc.attendanceEnabled !== false,
  publishStatus: doc.publishStatus,
  classStatus: doc.classStatus,
  recurrence: doc.recurrence || { enabled: false },
  folderName: doc.folderName || doc.folder?.folderName || '',
  facultySubjectName: doc.facultySubjectName || doc.facultySubject?.subjectName || '',
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt
});

const buildListPipeline = ({
  facultySubjectId,
  folderId,
  publishStatus,
  classStatus,
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
  if (publishStatus && PUBLISH_STATUSES.includes(publishStatus)) {
    match.publishStatus = publishStatus;
  }
  if (classStatus) match.classStatus = classStatus;
  if (batchId && isValidObjectId(batchId)) {
    match.batchId = new mongoose.Types.ObjectId(batchId);
  }
  if (centerId && isValidObjectId(centerId)) {
    match.centerId = new mongoose.Types.ObjectId(centerId);
  }

  const pipeline = [{ $match: match }];

  pipeline.push({
    $lookup: {
      from: 'subjectcontentfolders',
      localField: 'folderId',
      foreignField: '_id',
      as: 'folderDoc'
    }
  });
  pipeline.push({
    $lookup: {
      from: 'facultysubjects',
      localField: 'facultySubjectId',
      foreignField: '_id',
      as: 'facultySubjectDoc'
    }
  });
  pipeline.push({ $unwind: { path: '$folderDoc', preserveNullAndEmptyArrays: true } });
  pipeline.push({ $unwind: { path: '$facultySubjectDoc', preserveNullAndEmptyArrays: true } });

  const trimmed = String(search).trim();
  if (trimmed) {
    const term = escapeRegex(trimmed);
    pipeline.push({
      $match: {
        $or: [
          { classTitle: { $regex: term, $options: 'i' } },
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
            liveClassId: 1,
            facultySubjectId: 1,
            folderId: 1,
            batchId: 1,
            centerId: 1,
            classroomId: 1,
            classTitle: 1,
            scheduledDate: 1,
            startTime: 1,
            durationHours: 1,
            durationMinutes: 1,
            durationSeconds: 1,
            timezone: 1,
            attendanceEnabled: 1,
            publishStatus: 1,
            classStatus: 1,
            recurrence: 1,
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

exports.createLiveClass = async (req, res) => {
  try {
    const validation = await validateLiveClassPayload(req.body);
    if (!validation.ok) {
      return sendValidationError(res, validation);
    }

    const scheduleCheck = await runScheduleConflictChecks({
      facultySubjectId: validation.facultySubject._id,
      classroomId: req.body.classroomId,
      scheduledDate: req.body.scheduledDate,
      startTime: validation.startTime,
      durationHours: req.body.durationHours,
      durationMinutes: req.body.durationMinutes,
      durationSeconds: req.body.durationSeconds,
      recurrence: validation.recurrence
    });
    if (!scheduleCheck.ok) {
      return sendScheduleConflictError(res, scheduleCheck);
    }

    const doc = await SubjectLiveClass.create({
      liveClassId: await generateSubjectLiveClassId(),
      facultySubjectId: validation.facultySubject._id,
      folderId: validation.folder._id,
      batchId: req.body.batchId,
      centerId: req.body.centerId,
      classroomId: req.body.classroomId,
      classTitle: String(req.body.classTitle).trim(),
      scheduledDate: new Date(req.body.scheduledDate),
      startTime: validation.startTime,
      durationHours: Number(req.body.durationHours) || 0,
      durationMinutes: Number(req.body.durationMinutes) || 0,
      durationSeconds: Number(req.body.durationSeconds) || 0,
      timezone: validation.timezone,
      attendanceEnabled: validation.attendanceEnabled,
      publishStatus: validation.publishStatus,
      classStatus: validation.classStatus,
      recurrence: validation.recurrence,
      createdBy: req.user?._id || null,
      updatedBy: req.user?._id || null
    });

    res.status(201).json({
      success: true,
      message: 'Live class created successfully',
      data: formatLiveClass(doc.toObject())
    });
  } catch (error) {
    console.error('Create live class error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getLiveClasses = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const sort = parseSort(req.query, ['createdAt', 'scheduledDate', 'classTitle', 'liveClassId']);

    const pipeline = buildListPipeline({
      facultySubjectId: req.query.facultySubjectId,
      folderId: req.query.folderId,
      publishStatus: req.query.publishStatus,
      classStatus: req.query.classStatus,
      batchId: req.query.batchId,
      centerId: req.query.centerId,
      search: req.query.search ?? '',
      sort,
      skip,
      limit
    });

    const [result] = await SubjectLiveClass.aggregate(pipeline);
    const rows = result?.rows || [];
    const total = result?.total?.[0]?.count || 0;

    res.json({
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 0,
      count: rows.length,
      data: rows.map((row) => formatLiveClass({ ...row, _id: row._id }))
    });
  } catch (error) {
    console.error('List live classes error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getLiveClassById = async (req, res) => {
  try {
    const doc = await SubjectLiveClass.findOne({ _id: req.params.id, ...NOT_DELETED }).lean();
    if (!doc) {
      return sendNotFound(res, {
        code: 'LIVE_CLASS_NOT_FOUND',
        message: 'Live class not found',
        reason: 'No active live class exists for this id (it may be deleted).',
        suggestions: ['Use GET /api/live-classes to list classes and copy the MongoDB _id.']
      });
    }

    const [folder, facultySubject] = await Promise.all([
      SubjectContentFolder.findById(doc.folderId).select('folderName').lean(),
      FacultySubject.findById(doc.facultySubjectId).select('subjectName').lean()
    ]);

    res.json({
      success: true,
      data: formatLiveClass({
        ...doc,
        folderName: folder?.folderName,
        facultySubjectName: facultySubject?.subjectName
      })
    });
  } catch (error) {
    console.error('Get live class error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateLiveClass = async (req, res) => {
  try {
    const existing = await SubjectLiveClass.findOne({ _id: req.params.id, ...NOT_DELETED });
    if (!existing) {
      return sendNotFound(res, {
        code: 'LIVE_CLASS_NOT_FOUND',
        message: 'Live class not found',
        reason: 'No active live class exists for this id (it may be deleted).',
        suggestions: ['Verify the id from GET /api/live-classes/:id or list endpoint.']
      });
    }

    const merged = {
      facultySubjectId: req.body.facultySubjectId ?? existing.facultySubjectId,
      folderId: req.body.folderId ?? existing.folderId,
      batchId: req.body.batchId ?? existing.batchId,
      centerId: req.body.centerId ?? existing.centerId,
      classroomId: req.body.classroomId ?? existing.classroomId,
      classTitle: req.body.classTitle ?? existing.classTitle,
      scheduledDate: req.body.scheduledDate ?? existing.scheduledDate,
      startTime: req.body.startTime ?? existing.startTime,
      timezone: req.body.timezone ?? existing.timezone,
      attendanceEnabled:
        req.body.attendanceEnabled !== undefined
          ? req.body.attendanceEnabled
          : existing.attendanceEnabled,
      publishStatus: req.body.publishStatus ?? existing.publishStatus,
      classStatus: req.body.classStatus ?? existing.classStatus,
      recurrence: req.body.recurrence ?? existing.recurrence
    };

    const validation = await validateLiveClassPayload(merged, { partial: true });
    if (!validation.ok) {
      return sendValidationError(res, validation);
    }

    const scheduleCheck = await runScheduleConflictChecks(
      {
        facultySubjectId: validation.facultySubject._id,
        classroomId: merged.classroomId,
        scheduledDate: merged.scheduledDate,
        startTime: validation.startTime,
        durationHours:
          req.body.durationHours !== undefined ? req.body.durationHours : existing.durationHours,
        durationMinutes:
          req.body.durationMinutes !== undefined
            ? req.body.durationMinutes
            : existing.durationMinutes,
        durationSeconds:
          req.body.durationSeconds !== undefined
            ? req.body.durationSeconds
            : existing.durationSeconds,
        recurrence: validation.recurrence
      },
      existing._id
    );
    if (!scheduleCheck.ok) {
      return sendScheduleConflictError(res, scheduleCheck);
    }

    if (req.body.classTitle !== undefined) existing.classTitle = String(req.body.classTitle).trim();
    if (req.body.scheduledDate !== undefined) existing.scheduledDate = new Date(req.body.scheduledDate);
    if (req.body.startTime !== undefined) existing.startTime = validation.startTime;
    if (req.body.durationHours !== undefined) existing.durationHours = Number(req.body.durationHours) || 0;
    if (req.body.durationMinutes !== undefined) existing.durationMinutes = Number(req.body.durationMinutes) || 0;
    if (req.body.durationSeconds !== undefined) existing.durationSeconds = Number(req.body.durationSeconds) || 0;
    if (req.body.timezone !== undefined) existing.timezone = validation.timezone;
    if (req.body.batchId !== undefined) existing.batchId = req.body.batchId;
    if (req.body.centerId !== undefined) existing.centerId = req.body.centerId;
    if (req.body.classroomId !== undefined) existing.classroomId = req.body.classroomId;
    if (req.body.attendanceEnabled !== undefined) {
      existing.attendanceEnabled = validation.attendanceEnabled;
    }
    if (req.body.folderId !== undefined) existing.folderId = validation.folder._id;
    if (req.body.facultySubjectId !== undefined) existing.facultySubjectId = validation.facultySubject._id;
    if (req.body.publishStatus !== undefined) existing.publishStatus = validation.publishStatus;
    if (req.body.classStatus !== undefined) existing.classStatus = validation.classStatus;
    if (req.body.recurrence !== undefined) existing.recurrence = validation.recurrence;

    existing.updatedBy = req.user?._id || null;
    await existing.save();

    res.json({
      success: true,
      message: 'Live class updated successfully',
      data: formatLiveClass(existing.toObject())
    });
  } catch (error) {
    console.error('Update live class error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updatePublishStatus = async (req, res) => {
  try {
    const { publishStatus } = req.body;
    if (!PUBLISH_STATUSES.includes(publishStatus)) {
      return sendValidationError(
        res,
        fail({
          code: 'INVALID_PUBLISH_STATUS',
          field: 'publishStatus',
          message: `publishStatus must be one of: ${PUBLISH_STATUSES.join(', ')}`,
          reason: 'publishStatus must be DRAFT, PUBLISHED, or UNPUBLISHED.',
          suggestions: [`Allowed: ${PUBLISH_STATUSES.join(', ')}`]
        })
      );
    }

    const doc = await SubjectLiveClass.findOneAndUpdate(
      { _id: req.params.id, ...NOT_DELETED },
      { publishStatus, updatedBy: req.user?._id || null },
      { new: true }
    ).lean();

    if (!doc) {
      return sendNotFound(res, {
        code: 'LIVE_CLASS_NOT_FOUND',
        message: 'Live class not found',
        reason: 'Cannot update publish status — live class not found or deleted.'
      });
    }

    res.json({
      success: true,
      message: `Live class ${publishStatus.toLowerCase()} successfully`,
      data: formatLiveClass(doc)
    });
  } catch (error) {
    console.error('Update publish status error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const toPreviewDateString = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
};

const runRecurrencePreview = ({ scheduledDate, startTime, recurrence, maxOccurrences }) => {
  const anchorDate = toPreviewDateString(scheduledDate);
  if (!anchorDate) {
    return {
      ok: false,
      error: fail({
        code: 'VALIDATION_REQUIRED_FIELDS',
        field: 'scheduledDate',
        message: 'scheduledDate is required',
        reason: 'Preview recurrence needs a valid anchor date.',
        suggestions: ['Use YYYY-MM-DD, e.g. "2026-05-29".']
      })
    };
  }

  const result = previewRecurrence({
    scheduledDate: anchorDate,
    startTime: startTime || '00:00:00',
    recurrence: recurrence || { enabled: false },
    maxOccurrences: maxOccurrences || 500
  });

  return { ok: true, ...result };
};

exports.previewRecurrence = async (req, res) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const { scheduledDate, startTime, recurrence, maxOccurrences } = body;

    let normalizedStart = startTime || '00:00:00';
    if (startTime !== undefined) {
      const timeCheck = validateTimeString(startTime);
      if (!timeCheck.ok) return sendValidationError(res, timeCheck);
      normalizedStart = timeCheck.value;
    }

    let normalizedRecurrence = recurrence || { enabled: false };
    if (recurrence !== undefined) {
      const recCheck = validateRecurrence(recurrence);
      if (!recCheck.ok) return sendValidationError(res, recCheck);
      normalizedRecurrence = recCheck.value;
    }

    const preview = runRecurrencePreview({
      scheduledDate,
      startTime: normalizedStart,
      recurrence: normalizedRecurrence,
      maxOccurrences
    });
    if (!preview.ok) return sendValidationError(res, preview.error);

    res.json({
      success: true,
      previewMode: 'STANDALONE',
      appliedInput: {
        scheduledDate: toPreviewDateString(scheduledDate),
        startTime: normalizedStart,
        recurrence: normalizedRecurrence
      },
      totalSessions: preview.totalSessions,
      occurrences: preview.occurrences
    });
  } catch (error) {
    console.error('Preview recurrence error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * Preview recurrence for an existing live class. Body fields are optional overrides.
 */
exports.previewRecurrenceForLiveClass = async (req, res) => {
  try {
    const source = await SubjectLiveClass.findOne({ _id: req.params.id, ...NOT_DELETED }).lean();
    if (!source) {
      return sendNotFound(res, {
        code: 'LIVE_CLASS_NOT_FOUND',
        message: 'Live class not found',
        reason: 'Cannot preview recurrence — live class not found or deleted.',
        suggestions: ['Use GET /api/live-classes to find the MongoDB _id.']
      });
    }

    const body = req.body && typeof req.body === 'object' ? req.body : {};

    const scheduledDate =
      body.scheduledDate !== undefined ? body.scheduledDate : source.scheduledDate;

    let startTime = body.startTime !== undefined ? body.startTime : source.startTime;
    if (body.startTime !== undefined) {
      const timeCheck = validateTimeString(body.startTime);
      if (!timeCheck.ok) return sendValidationError(res, timeCheck);
      startTime = timeCheck.value;
    } else if (startTime) {
      const timeCheck = validateTimeString(startTime);
      if (timeCheck.ok) startTime = timeCheck.value;
    }

    const recurrence =
      body.recurrence !== undefined
        ? { ...(source.recurrence || { enabled: false }), ...body.recurrence }
        : source.recurrence || { enabled: false };

    const recCheck = validateRecurrence(recurrence);
    if (!recCheck.ok) return sendValidationError(res, recCheck);

    const preview = runRecurrencePreview({
      scheduledDate,
      startTime,
      recurrence: recCheck.value,
      maxOccurrences: body.maxOccurrences
    });
    if (!preview.ok) return sendValidationError(res, preview.error);

    res.json({
      success: true,
      previewMode: 'LIVE_CLASS',
      _id: source._id,
      liveClassId: source.liveClassId,
      sourceLiveClassId: source._id,
      classTitle: source.classTitle,
      appliedInput: {
        scheduledDate: toPreviewDateString(scheduledDate),
        startTime,
        recurrence: recCheck.value
      },
      overridesFromBody: {
        scheduledDate: body.scheduledDate !== undefined,
        startTime: body.startTime !== undefined,
        recurrence: body.recurrence !== undefined,
        maxOccurrences: body.maxOccurrences !== undefined
      },
      totalSessions: preview.totalSessions,
      occurrences: preview.occurrences
    });
  } catch (error) {
    console.error('Preview recurrence for live class error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const buildDuplicateClassTitle = (sourceTitle, overrideTitle) => {
  const custom = String(overrideTitle || '').trim();
  if (custom) return custom;

  const base = String(sourceTitle || 'Live Class').trim();
  if (/\(copy\)\s*$/i.test(base)) return base;
  return `${base} (Copy)`;
};

exports.duplicateLiveClass = async (req, res) => {
  try {
    const source = await SubjectLiveClass.findOne({ _id: req.params.id, ...NOT_DELETED }).lean();
    if (!source) {
      return sendNotFound(res, {
        code: 'LIVE_CLASS_NOT_FOUND',
        message: 'Live class not found',
        reason: 'Cannot duplicate — source live class not found or deleted.'
      });
    }

    const body = req.body && typeof req.body === 'object' ? req.body : {};

    const clone = {
      liveClassId: await generateSubjectLiveClassId(),
      facultySubjectId: source.facultySubjectId,
      folderId: source.folderId,
      batchId: source.batchId,
      centerId: source.centerId,
      classroomId: source.classroomId,
      classTitle: buildDuplicateClassTitle(source.classTitle, body.classTitle),
      scheduledDate: source.scheduledDate,
      startTime: source.startTime,
      durationHours: source.durationHours ?? 0,
      durationMinutes: source.durationMinutes ?? 0,
      durationSeconds: source.durationSeconds ?? 0,
      timezone: source.timezone,
      attendanceEnabled: source.attendanceEnabled !== false,
      publishStatus: 'DRAFT',
      classStatus: 'UPCOMING',
      recurrence: source.recurrence || { enabled: false },
      createdBy: req.user?._id || null,
      updatedBy: req.user?._id || null
    };

    const doc = await SubjectLiveClass.create(clone);

    res.status(201).json({
      success: true,
      message: 'Live class duplicated as draft',
      data: formatLiveClass(doc.toObject())
    });
  } catch (error) {
    console.error('Duplicate live class error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getLiveClassDashboardSummary = async (req, res) => {
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

    const [totalClasses, draftClasses, publishedClasses, unpublishedClasses, upcomingClasses, ongoingClasses, completedClasses, cancelledClasses] =
      await Promise.all([
        SubjectLiveClass.countDocuments(match),
        SubjectLiveClass.countDocuments({ ...match, publishStatus: 'DRAFT' }),
        SubjectLiveClass.countDocuments({ ...match, publishStatus: 'PUBLISHED' }),
        SubjectLiveClass.countDocuments({ ...match, publishStatus: 'UNPUBLISHED' }),
        SubjectLiveClass.countDocuments({ ...match, classStatus: 'UPCOMING' }),
        SubjectLiveClass.countDocuments({ ...match, classStatus: 'ONGOING' }),
        SubjectLiveClass.countDocuments({ ...match, classStatus: 'COMPLETED' }),
        SubjectLiveClass.countDocuments({ ...match, classStatus: 'CANCELLED' })
      ]);

    res.json({
      success: true,
      data: {
        totalClasses,
        draftClasses,
        publishedClasses,
        unpublishedClasses,
        upcomingClasses,
        ongoingClasses,
        completedClasses,
        cancelledClasses
      }
    });
  } catch (error) {
    console.error('Live class dashboard summary error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const CMS_DEPENDENCY_FLOW = [
  { step: 1, field: 'facultySubjectId', api: 'GET /api/faculty-subjects/dropdown?category=LIVE_CLASS' },
  { step: 2, field: 'folderId', api: 'GET /api/folders?facultySubjectId={facultySubjectId}&category=LIVE_CLASS' },
  { step: 3, field: 'batchId', api: 'GET /api/batches/dropdown?facultySubjectId={facultySubjectId}' },
  { step: 4, field: 'centerId', api: 'GET /api/centers/dropdown' },
  { step: 5, field: 'classroomId', api: 'GET /api/classrooms/dropdown?centerId={centerId}' },
  { step: 6, field: 'create', api: 'POST /api/live-classes' }
];

exports.getLiveClassCreateForm = async (req, res) => {
  try {
    const { facultySubjectId, folderId, centerId } = req.query;
    const data = {
      defaults: {
        timezone: 'Asia/Kolkata',
        publishStatus: 'DRAFT',
        classStatus: 'UPCOMING',
        attendanceEnabled: true,
        durationHours: 0,
        durationMinutes: 0,
        durationSeconds: 0,
        recurrence: { enabled: false }
      },
      enums: {
        timezones: LIVE_CLASS_TIMEZONES,
        publishStatuses: PUBLISH_STATUSES,
        classStatuses: CLASS_STATUSES,
        repeatTypes: REPEAT_TYPES,
        weekdays: WEEKDAYS,
        monthlyPatterns: MONTHLY_PATTERNS
      },
      dependencyFlow: CMS_DEPENDENCY_FLOW,
      dropdownApis: {
        facultySubjects: '/api/faculty-subjects/dropdown?category=LIVE_CLASS',
        folders: '/api/folders?facultySubjectId={facultySubjectId}&category=LIVE_CLASS',
        batches: '/api/batches/dropdown?facultySubjectId={facultySubjectId}',
        centers: '/api/centers/dropdown',
        classrooms: '/api/classrooms/dropdown?centerId={centerId}'
      }
    };

    if (facultySubjectId && isValidObjectId(facultySubjectId)) {
      const [facultySubject, folders, batches] = await Promise.all([
        FacultySubject.findOne({ _id: facultySubjectId, ...NOT_DELETED, status: 'ACTIVE' })
          .select('_id facultySubjectId subjectName teacher categories')
          .populate('teacher', 'teacherName')
          .lean(),
        SubjectContentFolder.find({
          facultySubjectId,
          category: 'LIVE_CLASS',
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

      data.facultySubject = facultySubject
        ? {
            _id: facultySubject._id,
            facultySubjectId: facultySubject.facultySubjectId,
            subjectName: facultySubject.subjectName
          }
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
        ...NOT_DELETED
      })
        .select('_id folderId folderName facultySubjectId category')
        .lean();
      data.selectedFolder = folder || null;
    }

    if (centerId && isValidObjectId(centerId)) {
      const [center, classrooms] = await Promise.all([
        Center.findOne({ _id: centerId, ...NOT_DELETED }).select('_id centerName centerCode').lean(),
        Classroom.find({
          center: centerId,
          status: 'ACTIVE',
          ...NOT_DELETED
        })
          .select('_id classroomId classroomName classroomCode capacity')
          .sort({ classroomName: 1 })
          .lean()
      ]);

      data.center = center
        ? { _id: center._id, centerName: center.centerName, centerCode: center.centerCode }
        : null;
      data.classrooms = classrooms.map((c) => ({
        _id: c._id,
        classroomId: c.classroomId,
        classroomName: c.classroomName,
        classroomCode: c.classroomCode,
        capacity: c.capacity ?? 0
      }));
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Live class create form error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.deleteLiveClass = async (req, res) => {
  try {
    const doc = await SubjectLiveClass.findOne({ _id: req.params.id, ...NOT_DELETED });
    if (!doc) {
      return sendNotFound(res, {
        code: 'LIVE_CLASS_NOT_FOUND',
        message: 'Live class not found',
        reason: 'Cannot delete — live class not found or already deleted.'
      });
    }

    doc.isDeleted = true;
    doc.deletedAt = new Date();
    doc.updatedBy = req.user?._id || null;
    await doc.save();

    res.json({ success: true, message: 'Live class deleted successfully', data: { _id: doc._id } });
  } catch (error) {
    console.error('Delete live class error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
