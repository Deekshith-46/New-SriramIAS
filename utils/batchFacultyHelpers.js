const mongoose = require('mongoose');
const Subject = require('../models/Subject');
const Topic = require('../models/Topic');
const Teacher = require('../models/Teacher');
const FacultySubject = require('../models/FacultySubject');
const Course = require('../models/Course');
const { isValidObjectId } = require('./contentIdGenerator');
const { NOT_DELETED } = require('./contentMastersHelpers');
const { FACULTY_CATEGORIES, BATCH_STATUSES, FEE_CURRENCIES } = require('./batchFacultyConstants');
const { safeParseJson } = require('./coursePayloadHelpers');

const parseObjectIdList = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String);
  const parsed = safeParseJson(raw, null);
  if (Array.isArray(parsed)) return parsed.map(String);
  return [];
};

const parseBulletPoints = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((p) => String(p).trim()).filter(Boolean);
  }
  const parsed = safeParseJson(raw, null);
  if (Array.isArray(parsed)) {
    return parsed.map((p) => String(p).trim()).filter(Boolean);
  }
  if (typeof raw === 'string' && raw.trim()) {
    return raw
      .split('\n')
      .map((p) => p.trim())
      .filter(Boolean);
  }
  return [];
};

const parseFees = (body) => {
  const raw = body.fees ?? safeParseJson(body.feesJson, {});
  const fees = typeof raw === 'object' && raw !== null ? raw : {};

  const currency = FEE_CURRENCIES.includes(fees.currency) ? fees.currency : 'INR';

  const toNum = (v) => {
    if (v === undefined || v === null || v === '') return 0;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : NaN;
  };

  const onlineAmount = toNum(fees.onlineAmount);
  const offlineAmount = toNum(fees.offlineAmount);
  const discountAmount = toNum(fees.discountAmount);

  if ([onlineAmount, offlineAmount, discountAmount].some((n) => Number.isNaN(n))) {
    return { ok: false, message: 'Fee amounts must be valid non-negative numbers' };
  }

  return {
    ok: true,
    value: {
      currency,
      onlineAmount,
      offlineAmount,
      discountAmount,
      onlineBulletPoints: parseBulletPoints(fees.onlineBulletPoints),
      offlineBulletPoints: parseBulletPoints(fees.offlineBulletPoints)
    }
  };
};

const parseDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const validateBatchDates = ({ commencementDate, batchStartDate, batchEndDate }) => {
  const comm = parseDate(commencementDate);
  const start = parseDate(batchStartDate);
  const end = parseDate(batchEndDate);

  if (comm && start && start < comm) {
    return { ok: false, message: 'batchStartDate must be on or after commencementDate' };
  }
  if (start && end && end <= start) {
    return { ok: false, message: 'batchEndDate must be after batchStartDate' };
  }
  return { ok: true, commencementDate: comm, batchStartDate: start, batchEndDate: end };
};

const validateDurationInMonths = (value) => {
  if (value === undefined || value === null || value === '') {
    return { ok: true, value: null };
  }
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    return { ok: false, message: 'durationInMonths must be a non-negative number' };
  }
  return { ok: true, value: Math.floor(n) };
};

const validateCategories = (categories) => {
  if (!Array.isArray(categories) || categories.length === 0) {
    return { ok: false, message: 'At least one category is required' };
  }
  const normalized = categories.map((c) => String(c).trim().toUpperCase());
  const invalid = normalized.filter((c) => !FACULTY_CATEGORIES.includes(c));
  if (invalid.length) {
    return {
      ok: false,
      message: `Invalid categories. Allowed: ${FACULTY_CATEGORIES.join(', ')}`
    };
  }
  return { ok: true, value: [...new Set(normalized)] };
};

const validateFacultySubjectPayload = async ({
  subjectName,
  subjectId,
  topicIds = [],
  teacherId,
  categories = []
}) => {
  if (!subjectName?.trim()) {
    return { ok: false, message: 'subjectName is required' };
  }
  if (!isValidObjectId(subjectId)) {
    return { ok: false, message: 'Invalid subject id' };
  }
  if (!isValidObjectId(teacherId)) {
    return { ok: false, message: 'Invalid teacher id' };
  }

  const subject = await Subject.findOne({
    _id: subjectId,
    status: 'ACTIVE',
    ...NOT_DELETED
  }).lean();
  if (!subject) {
    return { ok: false, message: 'Invalid or inactive subject' };
  }

  const teacher = await Teacher.findOne({
    _id: teacherId,
    status: 'ACTIVE',
    ...NOT_DELETED
  }).lean();
  if (!teacher) {
    return { ok: false, message: 'Invalid or inactive teacher' };
  }

  const topicIdList = parseObjectIdList(topicIds);
  if (topicIdList.length) {
    for (const tid of topicIdList) {
      if (!isValidObjectId(tid)) {
        return { ok: false, message: 'Invalid topic id in topics array' };
      }
    }
    const topics = await Topic.find({
      _id: { $in: topicIdList },
      subject: subject._id,
      status: 'ACTIVE',
      ...NOT_DELETED
    }).lean();
    if (topics.length !== topicIdList.length) {
      return {
        ok: false,
        message: 'One or more topics are invalid, inactive, or do not belong to the selected subject'
      };
    }
  }

  const cat = validateCategories(categories);
  if (!cat.ok) return cat;

  return {
    ok: true,
    subject,
    teacher,
    topics: topicIdList,
    categories: cat.value
  };
};

const validateFacultySubjectIds = async (ids) => {
  const list = parseObjectIdList(ids);
  if (!list.length) {
    return { ok: false, message: 'At least one faculty subject is required for the batch' };
  }
  for (const id of list) {
    if (!isValidObjectId(id)) {
      return { ok: false, message: 'Invalid facultySubject id in facultySubjects array' };
    }
  }
  const unique = [...new Set(list)];
  const rows = await FacultySubject.find({
    _id: { $in: unique },
    status: 'ACTIVE',
    ...NOT_DELETED
  }).lean();
  if (rows.length !== unique.length) {
    return {
      ok: false,
      message: 'One or more faculty subjects are invalid or inactive'
    };
  }
  return { ok: true, facultySubjects: rows.map((r) => r._id) };
};

const validateActiveCourse = async (courseId) => {
  if (!isValidObjectId(courseId)) {
    return { ok: false, message: 'Invalid course id' };
  }
  const course = await Course.findOne({
    _id: courseId,
    status: 'ACTIVE',
    ...NOT_DELETED
  }).lean();
  if (!course) {
    return { ok: false, message: 'Invalid or inactive course' };
  }
  return { ok: true, course };
};

const validateBatchStatus = (status, fallback = 'UPCOMING') => {
  if (status === undefined || status === null || status === '') {
    return { ok: true, value: fallback };
  }
  if (!BATCH_STATUSES.includes(status)) {
    return {
      ok: false,
      message: `status must be one of: ${BATCH_STATUSES.join(', ')}`
    };
  }
  return { ok: true, value: status };
};

const parseBannerImage = (raw) => {
  if (!raw) return null;
  if (typeof raw === 'object' && raw !== null && raw.url) {
    return { url: String(raw.url), publicId: String(raw.publicId || '') };
  }
  const parsed = safeParseJson(raw, null);
  if (parsed && typeof parsed === 'object' && parsed.url) {
    return { url: String(parsed.url), publicId: String(parsed.publicId || '') };
  }
  return null;
};

module.exports = {
  parseObjectIdList,
  parseBulletPoints,
  parseFees,
  parseDate,
  parseBannerImage,
  validateBatchDates,
  validateDurationInMonths,
  validateFacultySubjectPayload,
  validateFacultySubjectIds,
  validateActiveCourse,
  validateBatchStatus,
  BATCH_STATUSES
};
