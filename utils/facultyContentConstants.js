const {
  FACULTY_CATEGORIES
} = require('./batchFacultyConstants');

const FOLDER_STATUSES = ['ACTIVE', 'INACTIVE'];

const PUBLISH_STATUSES = ['DRAFT', 'PUBLISHED', 'UNPUBLISHED'];

/** Recording visibility (Faculty Subject CMS — RECORDING category only) */
const RECORDING_VISIBILITY_STATUSES = ['VISIBILITY', 'PUBLISHED', 'DRAFT', 'PRIVATE'];

const RECORDING_MAX_BYTES = 100 * 1024 * 1024; // 100 MB

const RECORDING_ALLOWED_MIMES = [
  'video/mp4',
  'video/quicktime',
  'video/x-matroska',
  'video/x-msvideo',
  'video/avi'
];

/** IANA timezone ids allowed on SubjectLiveClass */
const LIVE_CLASS_TIMEZONES = [
  'Asia/Kolkata',
  'Asia/Dubai',
  'Asia/Singapore',
  'UTC'
];

const CLASS_STATUSES = ['UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED'];

const REPEAT_TYPES = ['DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM'];

const WEEKDAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

const MONTHLY_PATTERNS = ['SAME_DATE', 'FIRST_WEEKDAY', 'LAST_WEEKDAY'];

/** Mains Answer Writing duration presets (minutes) */
const MAINS_DURATION_PRESETS = [30, 60, 90, 120, 180];
const MAINS_DURATION_PRESET_OPTIONS = ['30', '60', '90', '120', '180', 'CUSTOM'];

const MAINS_ANSWER_PDF_MAX_BYTES = 20 * 1024 * 1024; // 20 MB

const MAINS_ANSWER_PDF_ALLOWED_MIMES = ['application/pdf'];

/** PDF module visibility (Faculty Subject CMS — PDF category) */
const PDF_VISIBILITY_STATUSES = ['VISIBILITY', 'PUBLISHED', 'DRAFT', 'PRIVATE'];

const SUBJECT_PDF_MAX_BYTES = 10 * 1024 * 1024; // 10 MB

const SUBJECT_PDF_ALLOWED_MIMES = ['application/pdf'];

module.exports = {
  FACULTY_CATEGORIES,
  FOLDER_STATUSES,
  PUBLISH_STATUSES,
  RECORDING_VISIBILITY_STATUSES,
  RECORDING_MAX_BYTES,
  RECORDING_ALLOWED_MIMES,
  LIVE_CLASS_TIMEZONES,
  CLASS_STATUSES,
  REPEAT_TYPES,
  WEEKDAYS,
  MONTHLY_PATTERNS,
  MAINS_DURATION_PRESETS,
  MAINS_DURATION_PRESET_OPTIONS,
  MAINS_ANSWER_PDF_MAX_BYTES,
  MAINS_ANSWER_PDF_ALLOWED_MIMES,
  PDF_VISIBILITY_STATUSES,
  SUBJECT_PDF_MAX_BYTES,
  SUBJECT_PDF_ALLOWED_MIMES
};
