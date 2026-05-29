const {
  FACULTY_CATEGORIES
} = require('./batchFacultyConstants');

const FOLDER_STATUSES = ['ACTIVE', 'INACTIVE'];

const PUBLISH_STATUSES = ['DRAFT', 'PUBLISHED', 'UNPUBLISHED'];

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

module.exports = {
  FACULTY_CATEGORIES,
  FOLDER_STATUSES,
  PUBLISH_STATUSES,
  LIVE_CLASS_TIMEZONES,
  CLASS_STATUSES,
  REPEAT_TYPES,
  WEEKDAYS,
  MONTHLY_PATTERNS
};
