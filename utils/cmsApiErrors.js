/**
 * Structured API errors for Faculty Subject CMS (live classes, folders).
 * Keeps `message` for backward compatibility; adds errorCode, reason, field, suggestions.
 */

const fail = ({
  code,
  message,
  reason = null,
  field = null,
  details = null,
  suggestions = []
}) => ({
  ok: false,
  errorCode: code,
  message,
  reason: reason || message,
  field,
  details,
  suggestions: Array.isArray(suggestions) ? suggestions : [suggestions].filter(Boolean)
});

const toHttpBody = (payload, httpStatus) => {
  const body = {
    success: false,
    errorCode: payload.errorCode,
    message: payload.message,
    reason: payload.reason,
    httpStatus
  };
  if (payload.field) body.field = payload.field;
  if (payload.details) body.details = payload.details;
  if (payload.suggestions?.length) body.suggestions = payload.suggestions;

  // Legacy / conflict-specific top-level fields
  if (payload.conflictType) body.conflictType = payload.conflictType;
  if (payload.conflictWith) body.conflictWith = payload.conflictWith;
  if (payload.requestedSession) body.requestedSession = payload.requestedSession;
  if (payload.errors) body.errors = payload.errors;

  return body;
};

const sendError = (res, httpStatus, payload) => res.status(httpStatus).json(toHttpBody(payload, httpStatus));

const fromValidation = (result) => {
  if (result.ok) return null;
  return toHttpBody(
    {
      errorCode: result.errorCode || 'VALIDATION_ERROR',
      message: result.message,
      reason: result.reason || result.message,
      field: result.field || null,
      details: result.details || null,
      suggestions: result.suggestions || []
    },
    400
  );
};

const formatMinutes = (mins) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const sessionFromSlot = (slot) => ({
  date: slot.date,
  startTime: formatMinutes(slot.startMins),
  endTime: formatMinutes(slot.endMins)
});

const describeRecurrence = (recurrence) => {
  if (!recurrence?.enabled) {
    return { enabled: false, summary: 'Single session (no recurrence)' };
  }
  const end = recurrence.endDate
    ? new Date(recurrence.endDate).toISOString().slice(0, 10)
    : 'open-ended';
  const start = recurrence.startDate
    ? new Date(recurrence.startDate).toISOString().slice(0, 10)
    : null;
  let summary = `${recurrence.repeatType || 'DAILY'}`;
  if (recurrence.repeatEvery > 1) summary += ` every ${recurrence.repeatEvery}`;
  if (recurrence.repeatType === 'WEEKLY' && recurrence.weekdays?.length) {
    summary += ` on ${recurrence.weekdays.join(', ')}`;
  }
  if (recurrence.repeatType === 'MONTHLY' && recurrence.monthlyPattern) {
    summary += ` (${recurrence.monthlyPattern})`;
  }
  summary += ` from ${start || '?'} to ${end}`;
  return { enabled: true, summary, repeatType: recurrence.repeatType, startDate: start, endDate: end };
};

const buildScheduleConflictPayload = (check) => {
  const isClassroom = check.conflictType === 'CLASSROOM';
  return toHttpBody(
    {
      errorCode: check.errorCode,
      message: check.message,
      reason: check.reason,
      conflictType: check.conflictType,
      requestedSession: check.requestedSession,
      conflictWith: check.conflictingSession || check.conflictWith,
      details: check.details || null,
      suggestions: check.suggestions || []
    },
    409
  );
};

const sendValidationError = (res, result) => sendError(res, 400, fromValidation(result));
const sendScheduleConflictError = (res, check) =>
  res.status(409).json(buildScheduleConflictPayload(check));

const sendNotFound = (res, { code, message, reason, suggestions = [] }) =>
  sendError(res, 404, { errorCode: code, message, reason, suggestions });

module.exports = {
  fail,
  toHttpBody,
  sendError,
  fromValidation,
  sendValidationError,
  sendScheduleConflictError,
  sendNotFound,
  formatMinutes,
  sessionFromSlot,
  describeRecurrence,
  buildScheduleConflictPayload
};
