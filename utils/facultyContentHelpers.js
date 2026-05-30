const FacultySubject = require('../models/FacultySubject');
const SubjectContentFolder = require('../models/SubjectContentFolder');
const Topic = require('../models/Topic');
const Teacher = require('../models/Teacher');
const Batch = require('../models/Batch');
const Course = require('../models/Course');
const Center = require('../models/Center');
const Classroom = require('../models/Classroom');
const { isValidObjectId } = require('./contentIdGenerator');
const { NOT_DELETED } = require('./contentMastersHelpers');
const { fail } = require('./cmsApiErrors');
const {
  FACULTY_CATEGORIES,
  FOLDER_STATUSES,
  PUBLISH_STATUSES,
  RECORDING_VISIBILITY_STATUSES,
  LIVE_CLASS_TIMEZONES,
  CLASS_STATUSES,
  REPEAT_TYPES,
  WEEKDAYS,
  MONTHLY_PATTERNS,
  MAINS_DURATION_PRESETS,
  MAINS_DURATION_PRESET_OPTIONS,
  PDF_VISIBILITY_STATUSES
} = require('./facultyContentConstants');

const normalizeCategory = (value) => String(value || '').trim().toUpperCase();

const validateCategory = (category) => {
  const upper = normalizeCategory(category);
  if (!FACULTY_CATEGORIES.includes(upper)) {
    return {
      ok: false,
      message: `Invalid category. Allowed: ${FACULTY_CATEGORIES.join(', ')}`
    };
  }
  return { ok: true, value: upper };
};

const findActiveFacultySubject = async (facultySubjectId) => {
  if (!isValidObjectId(facultySubjectId)) return null;
  return FacultySubject.findOne({
    _id: facultySubjectId,
    status: 'ACTIVE',
    ...NOT_DELETED
  }).lean();
};

const validateFacultySubjectHasCategory = (facultySubject, category) => {
  if (!facultySubject.categories?.includes(category)) {
    return {
      ok: false,
      message: `Faculty subject does not include category ${category}`
    };
  }
  return { ok: true };
};

const findActiveFolder = async (folderId, { facultySubjectId, category } = {}) => {
  if (!isValidObjectId(folderId)) return null;
  const query = { _id: folderId, status: 'ACTIVE', ...NOT_DELETED };
  if (facultySubjectId) query.facultySubjectId = facultySubjectId;
  if (category) query.category = category;
  return SubjectContentFolder.findOne(query).lean();
};

const validateBatchForLiveClass = async (batchId, { facultySubjectId, centerId } = {}) => {
  if (!isValidObjectId(batchId)) {
    return fail({
      code: 'INVALID_BATCH_ID',
      field: 'batchId',
      message: 'Invalid batch id',
      reason: 'batchId is missing or not a valid MongoDB ObjectId.',
      suggestions: ['Use an id from GET /api/batches/dropdown?facultySubjectId=...']
    });
  }

  const batch = await Batch.findOne({
    _id: batchId,
    status: { $in: ['ACTIVE', 'UPCOMING'] },
    ...NOT_DELETED
  }).lean();

  if (!batch) {
    return fail({
      code: 'BATCH_NOT_ACTIVE',
      field: 'batchId',
      message: 'Invalid or inactive batch',
      reason: 'Batch was not found, is deleted, or status is not ACTIVE/UPCOMING.',
      suggestions: ['Pick a batch from GET /api/batches/dropdown?facultySubjectId=...']
    });
  }

  if (facultySubjectId) {
    const linked = (batch.facultySubjects || []).some(
      (id) => String(id) === String(facultySubjectId)
    );
    if (!linked) {
      return fail({
        code: 'BATCH_NOT_LINKED_TO_FACULTY_SUBJECT',
        field: 'batchId',
        message: 'Selected batch is not linked to this faculty subject',
        reason: 'batch.facultySubjects[] does not include the selected facultySubjectId.',
        suggestions: [
          'Link this faculty subject to the batch in Batch ERP, or choose another batch from the dropdown.'
        ]
      });
    }
  }

  if (centerId && isValidObjectId(centerId)) {
    const course = await Course.findOne({ _id: batch.course, ...NOT_DELETED }).lean();
    if (course?.center && String(course.center) !== String(centerId)) {
      return fail({
        code: 'CENTER_BATCH_MISMATCH',
        field: 'centerId',
        message: 'Selected center does not match the batch course center',
        reason: 'The batch course is tied to a different center than centerId.',
        suggestions: [
          'Select the center that matches the batch course, or pick a batch under the selected center.'
        ]
      });
    }
  }

  return { ok: true, batch };
};

const validateCenterForLiveClass = async (centerId) => {
  if (!isValidObjectId(centerId)) {
    return fail({
      code: 'INVALID_CENTER_ID',
      field: 'centerId',
      message: 'Invalid center id',
      reason: 'centerId is missing or not a valid MongoDB ObjectId.',
      suggestions: ['Use an id from GET /api/centers/dropdown']
    });
  }

  const center = await Center.findOne({
    _id: centerId,
    ...NOT_DELETED
  }).lean();

  if (!center) {
    return fail({
      code: 'CENTER_NOT_FOUND',
      field: 'centerId',
      message: 'Invalid center',
      reason: 'Center was not found or is deleted.',
      suggestions: ['Use GET /api/centers/dropdown']
    });
  }

  return { ok: true, center };
};

const validateClassroomForLiveClass = async (classroomId, centerId, batchId) => {
  if (!isValidObjectId(classroomId)) {
    return fail({
      code: 'INVALID_CLASSROOM_ID',
      field: 'classroomId',
      message: 'Invalid classroom id',
      reason: 'classroomId is missing or not a valid MongoDB ObjectId.',
      suggestions: ['Use GET /api/classrooms/dropdown?centerId=...']
    });
  }

  const classroom = await Classroom.findOne({
    _id: classroomId,
    status: 'ACTIVE',
    ...NOT_DELETED
  }).lean();

  if (!classroom) {
    return fail({
      code: 'CLASSROOM_NOT_ACTIVE',
      field: 'classroomId',
      message: 'Invalid or inactive classroom',
      reason: 'Classroom was not found, is inactive, or is deleted.',
      suggestions: ['Use GET /api/classrooms/dropdown?centerId=...']
    });
  }

  if (centerId && String(classroom.center) !== String(centerId)) {
    return fail({
      code: 'CLASSROOM_CENTER_MISMATCH',
      field: 'classroomId',
      message: 'Classroom does not belong to the selected center',
      reason: 'classroom.center does not match the centerId on the request.',
      suggestions: ['Reload classrooms after selecting centerId.']
    });
  }

  if (batchId) {
    const batchCheck = await validateBatchForLiveClass(batchId, { centerId });
    if (!batchCheck.ok) return batchCheck;
  }

  return { ok: true, classroom };
};

const validateTimeString = (startTime) => {
  const value = String(startTime || '').trim();
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(value)) {
    return fail({
      code: 'INVALID_START_TIME',
      field: 'startTime',
      message: 'startTime must be HH:mm or HH:mm:ss',
      reason: 'startTime format is invalid.',
      suggestions: ['Examples: "10:00:00" or "10:00"']
    });
  }
  return { ok: true, value: value.length === 5 ? `${value}:00` : value };
};

const validateRecurrence = (recurrence = {}) => {
  if (!recurrence || recurrence.enabled !== true) {
    return { ok: true, value: { enabled: false } };
  }

  const repeatType = String(recurrence.repeatType || '').toUpperCase();
  if (!REPEAT_TYPES.includes(repeatType)) {
    return fail({
      code: 'INVALID_REPEAT_TYPE',
      field: 'recurrence.repeatType',
      message: `repeatType must be one of: ${REPEAT_TYPES.join(', ')}`,
      reason: 'recurrence.repeatType is missing or not allowed.',
      suggestions: [`Allowed: ${REPEAT_TYPES.join(', ')}`]
    });
  }

  const normalized = {
    enabled: true,
    repeatType,
    repeatEvery: Math.max(1, Number(recurrence.repeatEvery) || 1),
    startDate: recurrence.startDate ? new Date(recurrence.startDate) : null,
    endDate: recurrence.endDate ? new Date(recurrence.endDate) : null,
    weekdays: Array.isArray(recurrence.weekdays)
      ? recurrence.weekdays.map((d) => String(d).toUpperCase()).filter((d) => WEEKDAYS.includes(d))
      : [],
    monthlyPattern: recurrence.monthlyPattern
      ? String(recurrence.monthlyPattern).toUpperCase()
      : null,
    excludedDates: Array.isArray(recurrence.excludedDates)
      ? recurrence.excludedDates.map((d) => new Date(d)).filter((d) => !Number.isNaN(d.getTime()))
      : [],
    paused: Boolean(recurrence.paused),
    pausedUntil: recurrence.pausedUntil ? new Date(recurrence.pausedUntil) : null,
    notes: String(recurrence.notes || '').trim()
  };

  if (repeatType === 'WEEKLY' && !normalized.weekdays.length) {
    return fail({
      code: 'RECURRENCE_WEEKDAYS_REQUIRED',
      field: 'recurrence.weekdays',
      message: 'weekdays required for WEEKLY recurrence',
      reason: 'When repeatType is WEEKLY, recurrence.weekdays must include at least one day.',
      suggestions: ['Example: ["MON", "WED", "FRI"]']
    });
  }

  if (repeatType === 'MONTHLY' && !MONTHLY_PATTERNS.includes(normalized.monthlyPattern)) {
    normalized.monthlyPattern = 'SAME_DATE';
  }

  if (normalized.endDate && normalized.startDate && normalized.endDate < normalized.startDate) {
    return fail({
      code: 'RECURRENCE_INVALID_DATE_RANGE',
      field: 'recurrence.endDate',
      message: 'recurrence endDate must be on or after startDate',
      reason: 'recurrence.endDate is before recurrence.startDate.',
      suggestions: ['Set endDate to the last day of the repeat window.']
    });
  }

  return { ok: true, value: normalized };
};

const validateLiveClassPayload = async (body, { partial = false } = {}) => {
  const errors = [];
  const missingFields = [];

  const requireField = (field, label) => {
    if (body[field] === undefined || body[field] === null || body[field] === '') {
      missingFields.push(field);
      errors.push(`${label} is required`);
      return false;
    }
    return true;
  };

  if (!partial || body.facultySubjectId !== undefined) requireField('facultySubjectId', 'facultySubjectId');
  if (!partial || body.folderId !== undefined) requireField('folderId', 'folderId');
  if (!partial || body.batchId !== undefined) requireField('batchId', 'batchId');
  if (!partial || body.centerId !== undefined) requireField('centerId', 'centerId');
  if (!partial || body.classroomId !== undefined) requireField('classroomId', 'classroomId');
  if (!partial || body.classTitle !== undefined) requireField('classTitle', 'classTitle');
  if (!partial || body.scheduledDate !== undefined) requireField('scheduledDate', 'scheduledDate');
  if (!partial || body.startTime !== undefined) requireField('startTime', 'startTime');
  if (!partial || body.timezone !== undefined) requireField('timezone', 'timezone');

  if (errors.length) {
    return fail({
      code: 'VALIDATION_REQUIRED_FIELDS',
      message: errors.join('; '),
      reason: 'One or more required fields are missing for this live class request.',
      details: { missingFields },
      suggestions: partial
        ? ['Send only fields you want to change, but each sent relation id must remain valid.']
        : [
            'Required on create: facultySubjectId, folderId, batchId, centerId, classroomId, classTitle, scheduledDate, startTime, timezone'
          ]
    });
  }

  let facultySubject = null;
  let folder = null;

  if (body.facultySubjectId) {
    facultySubject = await findActiveFacultySubject(body.facultySubjectId);
    if (!facultySubject) {
      return fail({
        code: 'FACULTY_SUBJECT_NOT_ACTIVE',
        field: 'facultySubjectId',
        message: 'Invalid or inactive faculty subject',
        reason: 'Faculty subject was not found, is inactive, or is deleted.',
        suggestions: ['Use GET /api/faculty-subjects/dropdown?category=LIVE_CLASS']
      });
    }
  }

  if (body.folderId && facultySubject) {
    folder = await findActiveFolder(body.folderId, {
      facultySubjectId: facultySubject._id,
      category: 'LIVE_CLASS'
    });
    if (!folder) {
      return fail({
        code: 'FOLDER_INVALID_FOR_LIVE_CLASS',
        field: 'folderId',
        message: 'Invalid folder or folder does not belong to faculty subject LIVE_CLASS category',
        reason:
          'Folder must be ACTIVE, not deleted, and tied to the same facultySubjectId with category LIVE_CLASS.',
        suggestions: [
          'Use GET /api/folders?facultySubjectId=...&category=LIVE_CLASS',
          'Create a folder via POST /api/faculty-subjects/content/folders if none exist.'
        ]
      });
    }
  }

  if (body.batchId) {
    const batchCheck = await validateBatchForLiveClass(body.batchId, {
      facultySubjectId: facultySubject?._id,
      centerId: body.centerId
    });
    if (!batchCheck.ok) return batchCheck;
  }

  if (body.centerId) {
    const centerCheck = await validateCenterForLiveClass(body.centerId);
    if (!centerCheck.ok) return centerCheck;
  }

  if (body.classroomId) {
    const classroomCheck = await validateClassroomForLiveClass(
      body.classroomId,
      body.centerId,
      body.batchId
    );
    if (!classroomCheck.ok) return classroomCheck;
  }

  if (facultySubject && !facultySubject.teacher) {
    return fail({
      code: 'FACULTY_SUBJECT_NO_TEACHER',
      field: 'facultySubjectId',
      message: 'Faculty subject must have an assigned teacher for schedule validation',
      reason: 'Faculty schedule clash checks use the teacher on the faculty subject record.',
      suggestions: ['Assign a teacher to this faculty subject in Faculty Subject ERP.']
    });
  }

  const attendanceEnabled =
    body.attendanceEnabled !== undefined ? Boolean(body.attendanceEnabled) : true;

  let startTime = body.startTime;
  if (body.startTime !== undefined) {
    const timeCheck = validateTimeString(body.startTime);
    if (!timeCheck.ok) return timeCheck;
    startTime = timeCheck.value;
  }

  let timezone = body.timezone !== undefined ? String(body.timezone).trim() : 'Asia/Kolkata';
  if (body.timezone !== undefined && !LIVE_CLASS_TIMEZONES.includes(timezone)) {
    return fail({
      code: 'INVALID_TIMEZONE',
      field: 'timezone',
      message: `timezone must be one of: ${LIVE_CLASS_TIMEZONES.join(', ')}`,
      reason: 'timezone is not in the allowed list.',
      suggestions: ['Load allowed values from GET /api/live-classes/create-form → data.enums.timezones']
    });
  }

  let publishStatus = body.publishStatus || 'DRAFT';
  if (body.publishStatus !== undefined && !PUBLISH_STATUSES.includes(body.publishStatus)) {
    return fail({
      code: 'INVALID_PUBLISH_STATUS',
      field: 'publishStatus',
      message: `publishStatus must be one of: ${PUBLISH_STATUSES.join(', ')}`,
      reason: 'publishStatus is not DRAFT, PUBLISHED, or UNPUBLISHED.',
      suggestions: ['Use PATCH /api/live-classes/:id/publish-status to change publish state only.']
    });
  }

  let classStatus = body.classStatus || 'UPCOMING';
  if (body.classStatus !== undefined && !CLASS_STATUSES.includes(body.classStatus)) {
    return fail({
      code: 'INVALID_CLASS_STATUS',
      field: 'classStatus',
      message: `classStatus must be one of: ${CLASS_STATUSES.join(', ')}`,
      reason: 'classStatus is not a valid operational status.',
      suggestions: [`Allowed: ${CLASS_STATUSES.join(', ')}`]
    });
  }

  let recurrence = { enabled: false };
  if (body.recurrence !== undefined) {
    const recCheck = validateRecurrence(body.recurrence);
    if (!recCheck.ok) return recCheck;
    recurrence = recCheck.value;
  }

  return {
    ok: true,
    facultySubject,
    folder,
    startTime,
    timezone,
    publishStatus,
    classStatus,
    recurrence,
    attendanceEnabled
  };
};

const validateFolderPayload = async ({ facultySubjectId, category, folderName }) => {
  if (!folderName?.trim()) {
    return { ok: false, message: 'folderName is required' };
  }

  const cat = validateCategory(category);
  if (!cat.ok) return cat;

  const facultySubject = await findActiveFacultySubject(facultySubjectId);
  if (!facultySubject) {
    return { ok: false, message: 'Invalid or inactive faculty subject' };
  }

  const hasCat = validateFacultySubjectHasCategory(facultySubject, cat.value);
  if (!hasCat.ok) return hasCat;

  return { ok: true, facultySubject, category: cat.value };
};

const parseTags = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((t) => String(t).trim()).filter(Boolean);
  }
  if (typeof raw === 'string') {
    return raw
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
  }
  return [];
};

const validateTopicForFacultySubject = async (topicId, facultySubject) => {
  if (!isValidObjectId(topicId)) {
    return fail({
      code: 'INVALID_TOPIC_ID',
      field: 'topicId',
      message: 'Invalid topic id',
      reason: 'topicId is missing or not a valid MongoDB ObjectId.',
      suggestions: ['Use a topic from GET /api/recordings/create-form?facultySubjectId=...']
    });
  }

  const allowedIds = (facultySubject.topics || []).map((t) => String(t));
  if (!allowedIds.includes(String(topicId))) {
    return fail({
      code: 'TOPIC_NOT_ON_FACULTY_SUBJECT',
      field: 'topicId',
      message: 'Topic is not linked to this faculty subject',
      reason: 'topicId must be one of the topics selected on the faculty subject.',
      suggestions: ['Reload topics from the create-form after selecting faculty subject.']
    });
  }

  const topic = await Topic.findOne({
    _id: topicId,
    status: 'ACTIVE',
    ...NOT_DELETED
  }).lean();

  if (!topic) {
    return fail({
      code: 'TOPIC_NOT_ACTIVE',
      field: 'topicId',
      message: 'Invalid or inactive topic',
      reason: 'Topic was not found or is inactive.',
      suggestions: ['Pick a topic from the faculty subject topic list.']
    });
  }

  return { ok: true, topic };
};

const validateTeacherForRecording = async (teacherId, facultySubject) => {
  if (!isValidObjectId(teacherId)) {
    return fail({
      code: 'INVALID_TEACHER_ID',
      field: 'teacherId',
      message: 'Invalid teacher id',
      reason: 'teacherId is missing or not a valid MongoDB ObjectId.',
      suggestions: ['Use the teacher assigned to this faculty subject.']
    });
  }

  if (String(facultySubject.teacher) !== String(teacherId)) {
    return fail({
      code: 'TEACHER_FACULTY_MISMATCH',
      field: 'teacherId',
      message: 'Teacher must match the faculty subject assigned teacher',
      reason: 'Recording teacher must be the same teacher linked on the faculty subject.',
      suggestions: ['Use teacherId from GET /api/recordings/create-form → data.teacher._id']
    });
  }

  const teacher = await Teacher.findOne({
    _id: teacherId,
    status: 'ACTIVE',
    ...NOT_DELETED
  }).lean();

  if (!teacher) {
    return fail({
      code: 'TEACHER_NOT_ACTIVE',
      field: 'teacherId',
      message: 'Invalid or inactive teacher',
      reason: 'Teacher was not found or is inactive.'
    });
  }

  return { ok: true, teacher };
};

const validateRecordingPayload = async (body, { partial = false, requireVideo = false } = {}) => {
  const errors = [];
  const missingFields = [];

  const requireField = (field, label) => {
    if (body[field] === undefined || body[field] === null || body[field] === '') {
      missingFields.push(field);
      errors.push(`${label} is required`);
      return false;
    }
    return true;
  };

  if (!partial || body.facultySubjectId !== undefined) requireField('facultySubjectId', 'facultySubjectId');
  if (!partial || body.folderId !== undefined) requireField('folderId', 'folderId');
  if (!partial || body.batchId !== undefined) requireField('batchId', 'batchId');
  if (!partial || body.lessonName !== undefined) requireField('lessonName', 'lessonName');
  if (!partial || body.centerId !== undefined) requireField('centerId', 'centerId');
  if (!partial || body.topicId !== undefined) requireField('topicId', 'topicId');
  if (!partial || body.teacherId !== undefined) requireField('teacherId', 'teacherId');
  if (!partial || body.visibility !== undefined) requireField('visibility', 'visibility');

  if (errors.length) {
    return fail({
      code: 'VALIDATION_REQUIRED_FIELDS',
      message: errors.join('; '),
      reason: 'One or more required fields are missing for this recording request.',
      details: { missingFields },
      suggestions: partial
        ? ['Send only fields you want to change.']
        : [
            'Required on create: facultySubjectId, folderId, batchId, lessonName, centerId, topicId, teacherId, visibility, recording file'
          ]
    });
  }

  let facultySubject = null;
  let folder = null;

  if (body.facultySubjectId) {
    facultySubject = await findActiveFacultySubject(body.facultySubjectId);
    if (!facultySubject) {
      return fail({
        code: 'FACULTY_SUBJECT_NOT_ACTIVE',
        field: 'facultySubjectId',
        message: 'Invalid or inactive faculty subject',
        suggestions: ['Use GET /api/faculty-subjects/dropdown?category=RECORDING']
      });
    }

    const hasCat = validateFacultySubjectHasCategory(facultySubject, 'RECORDING');
    if (!hasCat.ok) {
      return fail({
        code: 'FACULTY_SUBJECT_CATEGORY_DISABLED',
        field: 'facultySubjectId',
        message: hasCat.message,
        reason: 'RECORDING category is not enabled on this faculty subject.',
        suggestions: ['Enable RECORDING on the faculty subject, then create a folder.']
      });
    }
  }

  if (body.folderId && facultySubject) {
    folder = await findActiveFolder(body.folderId, {
      facultySubjectId: facultySubject._id,
      category: 'RECORDING'
    });
    if (!folder) {
      return fail({
        code: 'FOLDER_INVALID_FOR_RECORDING',
        field: 'folderId',
        message: 'Invalid folder or folder does not belong to faculty subject RECORDING category',
        suggestions: [
          'GET /api/folders?facultySubjectId=...&category=RECORDING',
          'POST /api/faculty-subjects/content/folders with category RECORDING'
        ]
      });
    }
  }

  if (body.batchId) {
    const batchCheck = await validateBatchForLiveClass(body.batchId, {
      facultySubjectId: facultySubject?._id
    });
    if (!batchCheck.ok) return batchCheck;
  }

  if (body.centerId) {
    const centerCheck = await validateCenterForLiveClass(body.centerId);
    if (!centerCheck.ok) return centerCheck;
  }

  if (body.topicId && facultySubject) {
    const topicCheck = await validateTopicForFacultySubject(body.topicId, facultySubject);
    if (!topicCheck.ok) return topicCheck;
  }

  if (body.teacherId && facultySubject) {
    const teacherCheck = await validateTeacherForRecording(body.teacherId, facultySubject);
    if (!teacherCheck.ok) return teacherCheck;
  }

  let visibility = body.visibility !== undefined ? String(body.visibility).trim().toUpperCase() : 'DRAFT';
  if (body.visibility !== undefined && !RECORDING_VISIBILITY_STATUSES.includes(visibility)) {
    return fail({
      code: 'INVALID_VISIBILITY',
      field: 'visibility',
      message: `visibility must be one of: ${RECORDING_VISIBILITY_STATUSES.join(', ')}`,
      suggestions: ['Use PATCH /api/recordings/:id/visibility to change visibility only.']
    });
  }

  const tags = body.tags !== undefined ? parseTags(body.tags) : [];

  if (requireVideo) {
    return fail({
      code: 'RECORDING_FILE_REQUIRED',
      field: 'recording',
      message: 'Upload Recording is required',
      reason: 'No recording video file was uploaded.',
      suggestions: ['Send multipart field name "recording" with MP4, MOV, MKV, or AVI (max 100 MB).']
    });
  }

  return {
    ok: true,
    facultySubject,
    folder,
    visibility,
    tags,
    description: body.description !== undefined ? String(body.description || '').trim() : undefined
  };
};

/**
 * Batch → FacultySubject (on batch) → Subject → Topics (facultySubject.topics[]).
 * Used for recording topic dropdown after batch is selected.
 */
const resolveRecordingTopicsForBatch = async (batchId, facultySubjectIdOptional) => {
  if (!isValidObjectId(batchId)) {
    return fail({
      code: 'INVALID_BATCH_ID',
      field: 'batchId',
      message: 'Invalid batch id',
      suggestions: ['Use an id from GET /api/batches/dropdown?facultySubjectId=...']
    });
  }

  const batch = await Batch.findOne({
    _id: batchId,
    status: { $in: ['ACTIVE', 'UPCOMING'] },
    ...NOT_DELETED
  })
    .select('_id batchId batchName facultySubjects')
    .lean();

  if (!batch) {
    return fail({
      code: 'BATCH_NOT_ACTIVE',
      field: 'batchId',
      message: 'Invalid or inactive batch',
      suggestions: ['Pick a batch from GET /api/batches/dropdown']
    });
  }

  const linkedIds = (batch.facultySubjects || []).map((id) => String(id));
  if (!linkedIds.length) {
    return fail({
      code: 'BATCH_NO_FACULTY_SUBJECTS',
      field: 'batchId',
      message: 'Batch has no faculty subjects linked',
      reason: 'batch.facultySubjects[] is empty.',
      suggestions: ['Link faculty subjects to this batch in Batch ERP.']
    });
  }

  let facultySubjectId = facultySubjectIdOptional ? String(facultySubjectIdOptional).trim() : null;

  if (facultySubjectId) {
    if (!isValidObjectId(facultySubjectId) || !linkedIds.includes(facultySubjectId)) {
      return fail({
        code: 'FACULTY_SUBJECT_NOT_ON_BATCH',
        field: 'facultySubjectId',
        message: 'Faculty subject is not linked to this batch',
        reason: 'The facultySubjectId is not in batch.facultySubjects[].',
        suggestions: ['Use a faculty subject that appears on the selected batch.']
      });
    }
  } else if (linkedIds.length === 1) {
    facultySubjectId = linkedIds[0];
  } else {
    const facultySubjects = await FacultySubject.find({
      _id: { $in: linkedIds },
      ...NOT_DELETED
    })
      .select('_id facultySubjectId subjectName')
      .lean();

    return fail({
      code: 'FACULTY_SUBJECT_ID_REQUIRED',
      field: 'facultySubjectId',
      message: 'facultySubjectId is required when batch has multiple faculty subjects',
      details: {
        batchId: String(batch._id),
        facultySubjects: facultySubjects.map((fs) => ({
          _id: fs._id,
          facultySubjectId: fs.facultySubjectId,
          subjectName: fs.subjectName
        }))
      },
      suggestions: ['Pass facultySubjectId query param matching the current faculty subject screen.']
    });
  }

  const facultySubject = await FacultySubject.findOne({
    _id: facultySubjectId,
    status: 'ACTIVE',
    ...NOT_DELETED
  })
    .select('_id facultySubjectId subjectName subject topics teacher categories')
    .populate('subject', 'subjectId subjectName')
    .lean();

  if (!facultySubject) {
    return fail({
      code: 'FACULTY_SUBJECT_NOT_ACTIVE',
      field: 'facultySubjectId',
      message: 'Invalid or inactive faculty subject'
    });
  }

  const subjectRef = facultySubject.subject?._id || facultySubject.subject;
  const topicIdList = facultySubject.topics || [];

  const topics = topicIdList.length
    ? await Topic.find({
        _id: { $in: topicIdList },
        subject: subjectRef,
        status: 'ACTIVE',
        ...NOT_DELETED
      })
        .select('_id topicId topicName subject')
        .sort({ topicName: 1 })
        .lean()
    : [];

  return {
    ok: true,
    batch: {
      _id: batch._id,
      batchId: batch.batchId,
      batchName: batch.batchName
    },
    facultySubject: {
      _id: facultySubject._id,
      facultySubjectId: facultySubject.facultySubjectId,
      subjectName: facultySubject.subjectName,
      subject: facultySubject.subject
        ? {
            _id: facultySubject.subject._id,
            subjectId: facultySubject.subject.subjectId,
            subjectName: facultySubject.subject.subjectName
          }
        : null
    },
    teacherId: facultySubject.teacher,
    topics: topics.map((t) => ({
      _id: t._id,
      topicId: t.topicId,
      topicName: t.topicName
    }))
  };
};

const parseDateField = (value, field) => {
  if (value === undefined || value === null || value === '') {
    return { ok: false, message: `${field} is required` };
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return fail({
      code: 'INVALID_DATE',
      field,
      message: `${field} must be a valid date`,
      reason: `${field} could not be parsed as a date.`,
      suggestions: ['Use ISO date format, e.g. "2026-05-30" or "2026-05-30T00:00:00.000Z"']
    });
  }
  return { ok: true, value: date };
};

const resolveMainsDuration = (durationPreset, durationMinutesRaw) => {
  const preset = String(durationPreset || '').trim().toUpperCase();
  if (!MAINS_DURATION_PRESET_OPTIONS.includes(preset)) {
    return fail({
      code: 'INVALID_DURATION_PRESET',
      field: 'durationPreset',
      message: `durationPreset must be one of: ${MAINS_DURATION_PRESET_OPTIONS.join(', ')}`,
      suggestions: ['Load allowed values from GET /api/mains-answer-writing/create-form → data.enums.durationPresets']
    });
  }

  if (preset === 'CUSTOM') {
    const customMinutes = Number(durationMinutesRaw);
    if (!Number.isFinite(customMinutes) || customMinutes < 1) {
      return fail({
        code: 'CUSTOM_DURATION_REQUIRED',
        field: 'durationMinutes',
        message: 'durationMinutes is required when durationPreset is CUSTOM',
        reason: 'Custom duration must be a positive number of minutes.',
        suggestions: ['Example: durationPreset=CUSTOM, durationMinutes=45']
      });
    }
    return { ok: true, durationPreset: preset, durationMinutes: Math.floor(customMinutes) };
  }

  return {
    ok: true,
    durationPreset: preset,
    durationMinutes: Number(preset)
  };
};

const validateMainsAnswerWritingPayload = async (body, { partial = false } = {}) => {
  const errors = [];
  const missingFields = [];

  const requireField = (field, label) => {
    if (body[field] === undefined || body[field] === null || body[field] === '') {
      missingFields.push(field);
      errors.push(`${label} is required`);
      return false;
    }
    return true;
  };

  if (!partial || body.facultySubjectId !== undefined) requireField('facultySubjectId', 'facultySubjectId');
  if (!partial || body.folderId !== undefined) requireField('folderId', 'folderId');
  if (!partial || body.testName !== undefined) requireField('testName', 'testName');
  if (!partial || body.scheduleDate !== undefined) requireField('scheduleDate', 'scheduleDate');
  if (!partial || body.durationPreset !== undefined) requireField('durationPreset', 'durationPreset');
  if (!partial || body.totalMarks !== undefined) requireField('totalMarks', 'totalMarks');
  if (!partial || body.resultDate !== undefined) requireField('resultDate', 'resultDate');
  if (!partial || body.questionsText !== undefined) requireField('questionsText', 'questionsText');

  if (errors.length) {
    return fail({
      code: 'VALIDATION_REQUIRED_FIELDS',
      message: errors.join('; '),
      reason: 'One or more required fields are missing for this mains answer writing request.',
      details: { missingFields },
      suggestions: partial
        ? ['Send only fields you want to change.']
        : [
            'Required on create: facultySubjectId, folderId, testName, scheduleDate, durationPreset, totalMarks, resultDate, questionsText, pdf file'
          ]
    });
  }

  let facultySubject = null;
  let folder = null;

  if (body.facultySubjectId) {
    facultySubject = await findActiveFacultySubject(body.facultySubjectId);
    if (!facultySubject) {
      return fail({
        code: 'FACULTY_SUBJECT_NOT_ACTIVE',
        field: 'facultySubjectId',
        message: 'Invalid or inactive faculty subject',
        suggestions: ['Use GET /api/faculty-subjects/dropdown?category=MAINS_ANSWER_WRITING']
      });
    }

    const hasCat = validateFacultySubjectHasCategory(facultySubject, 'MAINS_ANSWER_WRITING');
    if (!hasCat.ok) {
      return fail({
        code: 'FACULTY_SUBJECT_CATEGORY_DISABLED',
        field: 'facultySubjectId',
        message: hasCat.message,
        reason: 'MAINS_ANSWER_WRITING category is not enabled on this faculty subject.',
        suggestions: ['Enable MAINS_ANSWER_WRITING on the faculty subject, then create a folder.']
      });
    }
  }

  if (body.folderId && facultySubject) {
    folder = await findActiveFolder(body.folderId, {
      facultySubjectId: facultySubject._id,
      category: 'MAINS_ANSWER_WRITING'
    });
    if (!folder) {
      return fail({
        code: 'FOLDER_INVALID_FOR_MAINS_ANSWER_WRITING',
        field: 'folderId',
        message: 'Invalid folder or folder does not belong to faculty subject MAINS_ANSWER_WRITING category',
        suggestions: [
          'GET /api/folders?facultySubjectId=...&category=MAINS_ANSWER_WRITING',
          'POST /api/faculty-subjects/content/folders with category MAINS_ANSWER_WRITING'
        ]
      });
    }
  }

  let scheduleDate = null;
  if (body.scheduleDate !== undefined) {
    const scheduleCheck = parseDateField(body.scheduleDate, 'scheduleDate');
    if (!scheduleCheck.ok) return scheduleCheck;
    scheduleDate = scheduleCheck.value;
  }

  let resultDate = null;
  if (body.resultDate !== undefined) {
    const resultCheck = parseDateField(body.resultDate, 'resultDate');
    if (!resultCheck.ok) return resultCheck;
    resultDate = resultCheck.value;
  }

  if (scheduleDate && resultDate && resultDate < scheduleDate) {
    return fail({
      code: 'INVALID_RESULT_DATE',
      field: 'resultDate',
      message: 'resultDate must be on or after scheduleDate',
      reason: 'Result date cannot be before the test schedule date.',
      suggestions: ['Set resultDate to the same day or after scheduleDate.']
    });
  }

  let durationPreset = body.durationPreset;
  let durationMinutes = body.durationMinutes;
  if (body.durationPreset !== undefined || body.durationMinutes !== undefined) {
    const durationCheck = resolveMainsDuration(
      body.durationPreset ?? durationPreset,
      body.durationMinutes ?? durationMinutes
    );
    if (!durationCheck.ok) return durationCheck;
    durationPreset = durationCheck.durationPreset;
    durationMinutes = durationCheck.durationMinutes;
  }

  let totalMarks = body.totalMarks;
  if (body.totalMarks !== undefined) {
    const marks = Number(body.totalMarks);
    if (!Number.isFinite(marks) || marks < 1) {
      return fail({
        code: 'INVALID_TOTAL_MARKS',
        field: 'totalMarks',
        message: 'totalMarks must be a positive number',
        suggestions: ['Example: 200']
      });
    }
    totalMarks = marks;
  }

  let publishStatus =
    body.publishStatus !== undefined
      ? String(body.publishStatus).trim().toUpperCase()
      : 'DRAFT';
  if (body.publishStatus !== undefined && !PUBLISH_STATUSES.includes(publishStatus)) {
    return fail({
      code: 'INVALID_PUBLISH_STATUS',
      field: 'publishStatus',
      message: `publishStatus must be one of: ${PUBLISH_STATUSES.join(', ')}`,
      suggestions: ['Use PATCH /api/mains-answer-writing/:id/publish-status to change publish state only.']
    });
  }

  const questionsText =
    body.questionsText !== undefined ? String(body.questionsText).trim() : undefined;
  if (body.questionsText !== undefined && !questionsText) {
    return fail({
      code: 'QUESTIONS_TEXT_REQUIRED',
      field: 'questionsText',
      message: 'Write Questions Manually is required',
      reason: 'questionsText cannot be empty.',
      suggestions: ['Paste or type questions in the text area.']
    });
  }

  return {
    ok: true,
    facultySubject,
    folder,
    scheduleDate,
    resultDate,
    durationPreset,
    durationMinutes,
    totalMarks,
    publishStatus,
    questionsText
  };
};

const validateSubjectPdfPayload = async (body, { partial = false } = {}) => {
  const errors = [];
  const missingFields = [];

  const requireField = (field, label) => {
    if (body[field] === undefined || body[field] === null || body[field] === '') {
      missingFields.push(field);
      errors.push(`${label} is required`);
      return false;
    }
    return true;
  };

  if (!partial || body.facultySubjectId !== undefined) requireField('facultySubjectId', 'facultySubjectId');
  if (!partial || body.folderId !== undefined) requireField('folderId', 'folderId');
  if (!partial || body.batchId !== undefined) requireField('batchId', 'batchId');
  if (!partial || body.pdfTitle !== undefined) requireField('pdfTitle', 'pdfTitle');
  if (!partial || body.visibility !== undefined) requireField('visibility', 'visibility');

  if (errors.length) {
    return fail({
      code: 'VALIDATION_REQUIRED_FIELDS',
      message: errors.join('; '),
      reason: 'One or more required fields are missing for this PDF request.',
      details: { missingFields },
      suggestions: partial
        ? ['Send only fields you want to change.']
        : [
            'Required on create: facultySubjectId, folderId, batchId, pdfTitle, visibility, pdf file'
          ]
    });
  }

  let facultySubject = null;
  let folder = null;

  if (body.facultySubjectId) {
    facultySubject = await findActiveFacultySubject(body.facultySubjectId);
    if (!facultySubject) {
      return fail({
        code: 'FACULTY_SUBJECT_NOT_ACTIVE',
        field: 'facultySubjectId',
        message: 'Invalid or inactive faculty subject',
        suggestions: ['Use GET /api/faculty-subjects/dropdown?category=PDF']
      });
    }

    const hasCat = validateFacultySubjectHasCategory(facultySubject, 'PDF');
    if (!hasCat.ok) {
      return fail({
        code: 'FACULTY_SUBJECT_CATEGORY_DISABLED',
        field: 'facultySubjectId',
        message: hasCat.message,
        reason: 'PDF category is not enabled on this faculty subject.',
        suggestions: ['Enable PDF on the faculty subject, then create a folder.']
      });
    }
  }

  if (body.folderId && facultySubject) {
    folder = await findActiveFolder(body.folderId, {
      facultySubjectId: facultySubject._id,
      category: 'PDF'
    });
    if (!folder) {
      return fail({
        code: 'FOLDER_INVALID_FOR_PDF',
        field: 'folderId',
        message: 'Invalid folder or folder does not belong to faculty subject PDF category',
        suggestions: [
          'GET /api/folders?facultySubjectId=...&category=PDF',
          'POST /api/faculty-subjects/content/folders with category PDF'
        ]
      });
    }
  }

  if (body.batchId) {
    const batchCheck = await validateBatchForLiveClass(body.batchId, {
      facultySubjectId: facultySubject?._id
    });
    if (!batchCheck.ok) return batchCheck;
  }

  let visibility =
    body.visibility !== undefined ? String(body.visibility).trim().toUpperCase() : 'DRAFT';
  if (body.visibility !== undefined && !PDF_VISIBILITY_STATUSES.includes(visibility)) {
    return fail({
      code: 'INVALID_VISIBILITY',
      field: 'visibility',
      message: `visibility must be one of: ${PDF_VISIBILITY_STATUSES.join(', ')}`,
      suggestions: ['Use PATCH /api/subject-pdfs/:id/visibility to change visibility only.']
    });
  }

  const tags = body.tags !== undefined ? parseTags(body.tags) : [];

  if (body.pdfTitle !== undefined && !String(body.pdfTitle).trim()) {
    return fail({
      code: 'PDF_TITLE_REQUIRED',
      field: 'pdfTitle',
      message: 'PDF title is required',
      reason: 'pdfTitle cannot be empty.'
    });
  }

  return {
    ok: true,
    facultySubject,
    folder,
    visibility,
    tags,
    description: body.description !== undefined ? String(body.description || '').trim() : undefined
  };
};

module.exports = {
  FACULTY_CATEGORIES,
  FOLDER_STATUSES,
  PUBLISH_STATUSES,
  RECORDING_VISIBILITY_STATUSES,
  PDF_VISIBILITY_STATUSES,
  LIVE_CLASS_TIMEZONES,
  CLASS_STATUSES,
  MAINS_DURATION_PRESETS,
  MAINS_DURATION_PRESET_OPTIONS,
  validateCategory,
  findActiveFacultySubject,
  findActiveFolder,
  validateFolderPayload,
  validateLiveClassPayload,
  validateRecordingPayload,
  validateMainsAnswerWritingPayload,
  validateSubjectPdfPayload,
  resolveRecordingTopicsForBatch,
  validateBatchForLiveClass,
  validateCenterForLiveClass,
  validateClassroomForLiveClass,
  validateRecurrence,
  parseTags
};
