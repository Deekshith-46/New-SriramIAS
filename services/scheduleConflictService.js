const mongoose = require('mongoose');
const SubjectLiveClass = require('../models/SubjectLiveClass');
const FacultySubject = require('../models/FacultySubject');
const { isValidObjectId } = require('../utils/contentIdGenerator');
const { NOT_DELETED } = require('../utils/contentMastersHelpers');
const { previewRecurrence } = require('./recurrenceEngine');
const { sessionFromSlot, describeRecurrence } = require('../utils/cmsApiErrors');

const ACTIVE_CLASS_STATUSES = ['UPCOMING', 'ONGOING', 'COMPLETED'];

const parseTimeToMinutes = (timeStr) => {
  const parts = String(timeStr || '00:00:00').trim().split(':').map(Number);
  const h = parts[0] || 0;
  const m = parts[1] || 0;
  const s = parts[2] || 0;
  return h * 60 + m + Math.floor(s / 60);
};

const durationToMinutes = ({ durationHours = 0, durationMinutes = 0, durationSeconds = 0 }) =>
  (Number(durationHours) || 0) * 60 +
  (Number(durationMinutes) || 0) +
  Math.floor((Number(durationSeconds) || 0) / 60);

const toDateKey = (value) => {
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
};

const slotsOverlap = (a, b) =>
  a.date === b.date && a.startMins < b.endMins && b.startMins < a.endMins;

const formatMinutes = (mins) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

/**
 * Expand a live class into bookable time slots (includes all recurrence occurrences).
 */
const expandSlotsForLiveClass = ({
  scheduledDate,
  startTime,
  durationHours = 0,
  durationMinutes = 0,
  durationSeconds = 0,
  recurrence
}) => {
  const duration = durationToMinutes({ durationHours, durationMinutes, durationSeconds });
  const normalizedStart = String(startTime || '00:00:00').trim();
  const anchorDate = toDateKey(scheduledDate);
  if (!anchorDate) return [];

  let occurrences;
  if (recurrence?.enabled) {
    const preview = previewRecurrence({
      scheduledDate: anchorDate,
      startTime: normalizedStart,
      recurrence
    });
    occurrences = preview.occurrences;
  } else {
    occurrences = [{ date: anchorDate, startTime: normalizedStart }];
  }

  return occurrences.map((occ) => {
    const startMins = parseTimeToMinutes(occ.startTime || normalizedStart);
    return {
      date: occ.date,
      startMins,
      endMins: startMins + duration
    };
  });
};

const findFirstOverlap = (requestedSlots, candidateSlots) => {
  for (const req of requestedSlots) {
    for (const cand of candidateSlots) {
      if (slotsOverlap(req, cand)) {
        return { requested: req, candidate: cand };
      }
    }
  }
  return null;
};

const getDateRangeFromSlots = (slots) => {
  const dates = slots.map((s) => s.date).filter(Boolean).sort();
  if (!dates.length) return { min: null, max: null };
  return {
    min: new Date(`${dates[0]}T00:00:00.000Z`),
    max: new Date(`${dates[dates.length - 1]}T23:59:59.999Z`)
  };
};

const buildLiveClassQueryBase = (excludeLiveClassId) => {
  const query = {
    ...NOT_DELETED,
    classStatus: { $in: ACTIVE_CLASS_STATUSES }
  };
  if (excludeLiveClassId && isValidObjectId(excludeLiveClassId)) {
    query._id = { $ne: new mongoose.Types.ObjectId(excludeLiveClassId) };
  }
  return query;
};

/**
 * Requirement 7 — classroom double-booking check.
 */
const checkClassroomAvailability = async ({
  classroomId,
  scheduledDate,
  startTime,
  durationHours,
  durationMinutes,
  durationSeconds,
  recurrence,
  excludeLiveClassId
}) => {
  if (!isValidObjectId(classroomId)) {
    return {
      ok: false,
      errorCode: 'INVALID_CLASSROOM_ID',
      message: 'Invalid classroom id',
      reason: 'classroomId is missing or not a valid MongoDB ObjectId.',
      field: 'classroomId',
      suggestions: ['Use an id from GET /api/classrooms/dropdown?centerId=...']
    };
  }

  const requestedSlots = expandSlotsForLiveClass({
    scheduledDate,
    startTime,
    durationHours,
    durationMinutes,
    durationSeconds,
    recurrence
  });

  if (!requestedSlots.length) {
    return {
      ok: false,
      errorCode: 'INVALID_SCHEDULE',
      message: 'Invalid schedule for availability check',
      reason: 'Could not build time slots from scheduledDate, startTime, duration, or recurrence.',
      field: 'scheduledDate',
      suggestions: [
        'Ensure scheduledDate and startTime are valid.',
        'If recurrence.enabled is true, set startDate and endDate on recurrence.'
      ]
    };
  }

  const { min, max } = getDateRangeFromSlots(requestedSlots);
  const candidates = await SubjectLiveClass.find({
    ...buildLiveClassQueryBase(excludeLiveClassId),
    classroomId,
    $or: [
      { scheduledDate: { $gte: min, $lte: max } },
      {
        'recurrence.enabled': true,
        'recurrence.endDate': { $gte: min },
        $or: [
          { 'recurrence.startDate': { $lte: max } },
          { 'recurrence.startDate': null, scheduledDate: { $lte: max } }
        ]
      }
    ]
  })
    .select(
      '_id liveClassId classTitle scheduledDate startTime durationHours durationMinutes durationSeconds recurrence classroomId'
    )
    .lean();

  for (const candidate of candidates) {
    const candidateSlots = expandSlotsForLiveClass(candidate);
    const overlap = findFirstOverlap(requestedSlots, candidateSlots);
    if (overlap) {
      const requestedSession = sessionFromSlot(overlap.requested);
      const conflictingSession = {
        liveClassId: candidate.liveClassId,
        classTitle: candidate.classTitle,
        ...sessionFromSlot(overlap.candidate),
        recurrence: describeRecurrence(candidate.recurrence)
      };
      const recurrenceNote = conflictingSession.recurrence.enabled
        ? ` The existing class repeats (${conflictingSession.recurrence.summary}), so other dates may also be blocked.`
        : '';

      return {
        ok: false,
        errorCode: 'CLASSROOM_SCHEDULE_CONFLICT',
        message: `Classroom is already booked on ${requestedSession.date} from ${requestedSession.startTime} to ${requestedSession.endTime} (conflicts with ${candidate.liveClassId})`,
        reason: `The selected classroom is already used by "${candidate.classTitle}" (${candidate.liveClassId}) at the same time on ${requestedSession.date}.${recurrenceNote}`,
        conflictType: 'CLASSROOM',
        requestedSession,
        conflictingSession,
        details: {
          classroomId: String(classroomId),
          firstConflictDate: requestedSession.date,
          existingClassMongoId: candidate._id ? String(candidate._id) : undefined
        },
        suggestions: [
          'Choose a different classroomId.',
          'Change startTime or duration so the slot does not overlap.',
          'Adjust recurrence (startDate/endDate, weekdays, or excludedDates).',
          'Update or delete the conflicting live class if it was created in error.',
          'Preview slots: POST /api/live-classes/preview-recurrence with the same schedule.'
        ]
      };
    }
  }

  return { ok: true };
};

/**
 * Requirement 8 — faculty (teacher) double-booking check via FacultySubject.teacher.
 */
const checkFacultyAvailability = async ({
  facultySubjectId,
  scheduledDate,
  startTime,
  durationHours,
  durationMinutes,
  durationSeconds,
  recurrence,
  excludeLiveClassId
}) => {
  if (!isValidObjectId(facultySubjectId)) {
    return {
      ok: false,
      errorCode: 'INVALID_FACULTY_SUBJECT_ID',
      message: 'Invalid faculty subject id',
      reason: 'facultySubjectId is missing or not a valid MongoDB ObjectId.',
      field: 'facultySubjectId',
      suggestions: ['Use an id from GET /api/faculty-subjects/dropdown?category=LIVE_CLASS']
    };
  }

  const facultySubject = await FacultySubject.findOne({
    _id: facultySubjectId,
    ...NOT_DELETED
  })
    .select('teacher subjectName')
    .lean();

  if (!facultySubject?.teacher) {
    return {
      ok: false,
      errorCode: 'FACULTY_SUBJECT_NO_TEACHER',
      message: 'Faculty subject or teacher not found',
      reason:
        'This faculty subject has no teacher assigned. Faculty clash checks require a teacher on the faculty subject.',
      field: 'facultySubjectId',
      suggestions: [
        'Assign a teacher on the faculty subject (Faculty Subject ERP), then retry.',
        'Pick a different facultySubjectId that has a teacher.'
      ]
    };
  }

  const teacherId = facultySubject.teacher;

  const requestedSlots = expandSlotsForLiveClass({
    scheduledDate,
    startTime,
    durationHours,
    durationMinutes,
    durationSeconds,
    recurrence
  });

  if (!requestedSlots.length) {
    return {
      ok: false,
      errorCode: 'INVALID_SCHEDULE',
      message: 'Invalid schedule for availability check',
      reason: 'Could not build time slots from scheduledDate, startTime, duration, or recurrence.',
      field: 'scheduledDate',
      suggestions: [
        'Ensure scheduledDate and startTime are valid.',
        'If recurrence.enabled is true, set startDate and endDate on recurrence.'
      ]
    };
  }

  const linkedSubjects = await FacultySubject.find({
    teacher: teacherId,
    ...NOT_DELETED
  })
    .select('_id')
    .lean();

  const facultySubjectIds = linkedSubjects.map((fs) => fs._id);
  if (!facultySubjectIds.length) {
    return { ok: true };
  }

  const { min, max } = getDateRangeFromSlots(requestedSlots);
  const candidates = await SubjectLiveClass.find({
    ...buildLiveClassQueryBase(excludeLiveClassId),
    facultySubjectId: { $in: facultySubjectIds },
    $or: [
      { scheduledDate: { $gte: min, $lte: max } },
      {
        'recurrence.enabled': true,
        'recurrence.endDate': { $gte: min },
        $or: [
          { 'recurrence.startDate': { $lte: max } },
          { 'recurrence.startDate': null, scheduledDate: { $lte: max } }
        ]
      }
    ]
  })
    .select(
      '_id liveClassId classTitle facultySubjectId scheduledDate startTime durationHours durationMinutes durationSeconds recurrence'
    )
    .populate('facultySubjectId', 'subjectName teacher')
    .lean();

  for (const candidate of candidates) {
    const candidateSlots = expandSlotsForLiveClass(candidate);
    const overlap = findFirstOverlap(requestedSlots, candidateSlots);
    if (overlap) {
      const fsName =
        candidate.facultySubjectId?.subjectName || facultySubject.subjectName || 'another subject';
      const requestedSession = sessionFromSlot(overlap.requested);
      const conflictingSession = {
        liveClassId: candidate.liveClassId,
        classTitle: candidate.classTitle,
        facultySubjectName: fsName,
        ...sessionFromSlot(overlap.candidate),
        recurrence: describeRecurrence(candidate.recurrence)
      };
      const recurrenceNote = conflictingSession.recurrence.enabled
        ? ` That class repeats (${conflictingSession.recurrence.summary}).`
        : '';

      return {
        ok: false,
        errorCode: 'FACULTY_SCHEDULE_CONFLICT',
        message: `Teacher is already scheduled on ${requestedSession.date} from ${requestedSession.startTime} to ${requestedSession.endTime} (conflicts with ${candidate.liveClassId})`,
        reason: `The teacher assigned to this faculty subject is already teaching "${candidate.classTitle}" (${fsName} / ${candidate.liveClassId}) at the same time on ${requestedSession.date}.${recurrenceNote}`,
        conflictType: 'FACULTY',
        requestedSession,
        conflictingSession,
        details: {
          facultySubjectId: String(facultySubjectId),
          facultySubjectName: facultySubject.subjectName,
          firstConflictDate: requestedSession.date
        },
        suggestions: [
          'Use a different faculty subject with another teacher.',
          'Change startTime or duration to avoid overlap.',
          'Adjust recurrence dates or excludedDates.',
          'Reschedule or delete the conflicting live class.',
          'Note: clash is based on FacultySubject.teacher, not a per-class teacher field.'
        ]
      };
    }
  }

  return { ok: true };
};

/**
 * Requirement 6 — block folder delete when live classes exist.
 */
const assertFolderCanBeDeleted = async (folderId) => {
  if (!isValidObjectId(folderId)) {
    return {
      ok: false,
      errorCode: 'INVALID_FOLDER_ID',
      message: 'Invalid folder id',
      reason: 'Folder id is missing or not a valid MongoDB ObjectId.',
      field: 'folderId'
    };
  }

  const count = await SubjectLiveClass.countDocuments({
    folderId,
    ...NOT_DELETED
  });

  if (count > 0) {
    return {
      ok: false,
      errorCode: 'FOLDER_HAS_LIVE_CLASSES',
      message: `Cannot delete folder: ${count} live class(es) still exist in this folder. Remove or move them first.`,
      reason: 'Folders with live classes cannot be deleted (REQ-6).',
      field: 'folderId',
      details: { liveClassCount: count },
      suggestions: [
        'Delete or move all live classes in this folder first.',
        'Use GET /api/live-classes?folderId=... to list classes in the folder.'
      ]
    };
  }

  return { ok: true };
};

const runScheduleConflictChecks = async (payload, excludeLiveClassId) => {
  const classroomCheck = await checkClassroomAvailability({
    classroomId: payload.classroomId,
    scheduledDate: payload.scheduledDate,
    startTime: payload.startTime,
    durationHours: payload.durationHours,
    durationMinutes: payload.durationMinutes,
    durationSeconds: payload.durationSeconds,
    recurrence: payload.recurrence,
    excludeLiveClassId
  });
  if (!classroomCheck.ok) return classroomCheck;

  const facultyCheck = await checkFacultyAvailability({
    facultySubjectId: payload.facultySubjectId,
    scheduledDate: payload.scheduledDate,
    startTime: payload.startTime,
    durationHours: payload.durationHours,
    durationMinutes: payload.durationMinutes,
    durationSeconds: payload.durationSeconds,
    recurrence: payload.recurrence,
    excludeLiveClassId
  });
  if (!facultyCheck.ok) return facultyCheck;

  return { ok: true };
};

module.exports = {
  expandSlotsForLiveClass,
  checkClassroomAvailability,
  checkFacultyAvailability,
  assertFolderCanBeDeleted,
  runScheduleConflictChecks,
  parseTimeToMinutes,
  durationToMinutes
};
