const {
  REPEAT_TYPES,
  WEEKDAYS,
  MONTHLY_PATTERNS
} = require('../utils/facultyContentConstants');

const WEEKDAY_INDEX = { SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6 };

const toDateOnly = (value) => {
  const d = value instanceof Date ? new Date(value) : new Date(String(value));
  if (Number.isNaN(d.getTime())) return null;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};

const sameDay = (a, b) =>
  a.getUTCFullYear() === b.getUTCFullYear() &&
  a.getUTCMonth() === b.getUTCMonth() &&
  a.getUTCDate() === b.getUTCDate();

const addDays = (date, days) => {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
};

const isExcluded = (date, excludedDates = []) =>
  excludedDates.some((ex) => {
    const e = toDateOnly(ex);
    return e && sameDay(date, e);
  });

const isPausedOn = (date, recurrence) => {
  if (!recurrence?.paused) return false;
  if (!recurrence.pausedUntil) return true;
  const until = toDateOnly(recurrence.pausedUntil);
  return until ? date <= until : true;
};

const inRange = (date, start, end) => {
  if (start && date < start) return false;
  if (end && date > end) return false;
  return true;
};

const getWeekdayCode = (date) => {
  const codes = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  return codes[date.getUTCDay()];
};

const getFirstWeekdayOfMonth = (year, month, weekdayCode) => {
  const target = WEEKDAY_INDEX[weekdayCode];
  const d = new Date(Date.UTC(year, month, 1));
  while (d.getUTCDay() !== target) {
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return d;
};

const getLastWeekdayOfMonth = (year, month, weekdayCode) => {
  const target = WEEKDAY_INDEX[weekdayCode];
  const d = new Date(Date.UTC(year, month + 1, 0));
  while (d.getUTCDay() !== target) {
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return d;
};

const buildOccurrence = (date, startTime) => ({
  date: date.toISOString().slice(0, 10),
  startTime: startTime || '00:00:00',
  weekday: getWeekdayCode(date)
});

const filterOccurrence = (date, recurrence, excludedDates) => {
  if (isExcluded(date, excludedDates)) return false;
  if (isPausedOn(date, recurrence)) return false;
  return true;
};

const generateDailyOccurrences = ({
  startDate,
  endDate,
  repeatEvery = 1,
  startTime,
  recurrence = {},
  excludedDates = [],
  maxOccurrences = 500
}) => {
  const start = toDateOnly(startDate);
  const end = toDateOnly(endDate);
  if (!start || !end || end < start) return [];

  const occurrences = [];
  let cursor = new Date(start);
  const step = Math.max(1, Number(repeatEvery) || 1);

  while (cursor <= end && occurrences.length < maxOccurrences) {
    if (inRange(cursor, start, end) && filterOccurrence(cursor, recurrence, excludedDates)) {
      occurrences.push(buildOccurrence(cursor, startTime));
    }
    cursor = addDays(cursor, step);
  }
  return occurrences;
};

const generateWeeklyOccurrences = ({
  startDate,
  endDate,
  weekdays = [],
  startTime,
  recurrence = {},
  excludedDates = [],
  maxOccurrences = 500
}) => {
  const start = toDateOnly(startDate);
  const end = toDateOnly(endDate);
  if (!start || !end || end < start) return [];

  const allowed = new Set(
    (weekdays.length ? weekdays : ['MON']).map((d) => String(d).toUpperCase())
  );

  const occurrences = [];
  let cursor = new Date(start);

  while (cursor <= end && occurrences.length < maxOccurrences) {
    if (allowed.has(getWeekdayCode(cursor)) && filterOccurrence(cursor, recurrence, excludedDates)) {
      occurrences.push(buildOccurrence(cursor, startTime));
    }
    cursor = addDays(cursor, 1);
  }
  return occurrences;
};

const generateMonthlyOccurrences = ({
  startDate,
  endDate,
  monthlyPattern = 'SAME_DATE',
  startTime,
  recurrence = {},
  excludedDates = [],
  maxOccurrences = 500
}) => {
  const start = toDateOnly(startDate);
  const end = toDateOnly(endDate);
  if (!start || !end || end < start) return [];

  const pattern = MONTHLY_PATTERNS.includes(monthlyPattern) ? monthlyPattern : 'SAME_DATE';
  const anchorDay = start.getUTCDate();
  const anchorWeekday = getWeekdayCode(start);
  const occurrences = [];

  let year = start.getUTCFullYear();
  let month = start.getUTCMonth();

  while (occurrences.length < maxOccurrences) {
    let occ = null;

    if (pattern === 'SAME_DATE') {
      const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
      const day = Math.min(anchorDay, lastDay);
      occ = new Date(Date.UTC(year, month, day));
    } else if (pattern === 'FIRST_WEEKDAY') {
      occ = getFirstWeekdayOfMonth(year, month, anchorWeekday);
    } else if (pattern === 'LAST_WEEKDAY') {
      occ = getLastWeekdayOfMonth(year, month, anchorWeekday);
    }

    if (occ && occ >= start && occ <= end && filterOccurrence(occ, recurrence, excludedDates)) {
      occurrences.push(buildOccurrence(occ, startTime));
    }

    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
    if (new Date(Date.UTC(year, month, 1)) > end) break;
  }

  return occurrences;
};

const generateCustomOccurrences = ({
  startDate,
  endDate,
  repeatEvery = 15,
  startTime,
  recurrence = {},
  excludedDates = [],
  maxOccurrences = 500
}) =>
  generateDailyOccurrences({
    startDate,
    endDate,
    repeatEvery,
    startTime,
    recurrence,
    excludedDates,
    maxOccurrences
  });

const generateRecurrenceOccurrences = (input = {}) => {
  const recurrence = input.recurrence || {};
  if (!recurrence.enabled) {
    const single = toDateOnly(input.scheduledDate || input.startDate);
    if (!single) return [];
    if (!filterOccurrence(single, recurrence, recurrence.excludedDates || [])) return [];
    return [buildOccurrence(single, input.startTime)];
  }

  const startDate = recurrence.startDate || input.scheduledDate;
  const endDate = recurrence.endDate;
  const repeatType = String(recurrence.repeatType || 'DAILY').toUpperCase();

  if (!REPEAT_TYPES.includes(repeatType)) {
    return [];
  }

  const base = {
    startDate,
    endDate,
    startTime: input.startTime,
    recurrence,
    excludedDates: recurrence.excludedDates || [],
    maxOccurrences: input.maxOccurrences || 500
  };

  switch (repeatType) {
    case 'DAILY':
      return generateDailyOccurrences({
        ...base,
        repeatEvery: recurrence.repeatEvery || 1
      });
    case 'WEEKLY':
      return generateWeeklyOccurrences({
        ...base,
        weekdays: recurrence.weekdays || []
      });
    case 'MONTHLY':
      return generateMonthlyOccurrences({
        ...base,
        monthlyPattern: recurrence.monthlyPattern || 'SAME_DATE'
      });
    case 'CUSTOM':
      return generateCustomOccurrences({
        ...base,
        repeatEvery: recurrence.repeatEvery || 1
      });
    default:
      return [];
  }
};

const previewRecurrence = (payload) => {
  const occurrences = generateRecurrenceOccurrences(payload);
  return {
    totalSessions: occurrences.length,
    occurrences
  };
};

module.exports = {
  generateDailyOccurrences,
  generateWeeklyOccurrences,
  generateMonthlyOccurrences,
  generateCustomOccurrences,
  generateRecurrenceOccurrences,
  previewRecurrence,
  WEEKDAYS
};
