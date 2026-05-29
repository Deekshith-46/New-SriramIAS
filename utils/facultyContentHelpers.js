const FacultySubject = require('../models/FacultySubject');
const SubjectContentFolder = require('../models/SubjectContentFolder');
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
  LIVE_CLASS_TIMEZONES,
  CLASS_STATUSES,
  REPEAT_TYPES,
  WEEKDAYS,
  MONTHLY_PATTERNS
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

module.exports = {
  FACULTY_CATEGORIES,
  FOLDER_STATUSES,
  PUBLISH_STATUSES,
  LIVE_CLASS_TIMEZONES,
  CLASS_STATUSES,
  validateCategory,
  findActiveFacultySubject,
  findActiveFolder,
  validateFolderPayload,
  validateLiveClassPayload,
  validateBatchForLiveClass,
  validateCenterForLiveClass,
  validateClassroomForLiveClass,
  validateRecurrence
};
