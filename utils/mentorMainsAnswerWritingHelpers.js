const mongoose = require('mongoose');
const Batch = require('../models/Batch');
const BatchEnrollment = require('../models/BatchEnrollment');
const Student = require('../models/Student');
const SubjectMainsAnswerWriting = require('../models/SubjectMainsAnswerWriting');
const MainsAnswerWritingSubmission = require('../models/MainsAnswerWritingSubmission');
const FacultySubject = require('../models/FacultySubject');
const { NOT_DELETED } = require('./contentMastersHelpers');
const { ACTIVE_STUDENT } = require('./studentService');
const {
  hydrateMainsTestsForStudent,
  formatTestSummaryForStudent
} = require('./mainsAnswerWritingListHelpers');

const formatMentorStudentProfile = (profile, user) => {
  const userId = profile?.userId || user?._id || user || null;
  if (profile) {
    return {
      _id: profile._id,
      studentId: profile.studentId || null,
      userId,
      studentName: profile.studentName,
      email: profile.email || user?.email || '',
      mobileNumber: profile.mobileNumber || user?.mobile || ''
    };
  }
  if (user && typeof user === 'object') {
    return {
      _id: null,
      studentId: null,
      userId: user._id,
      studentName: user.name || '',
      email: user.email || '',
      mobileNumber: user.mobile || ''
    };
  }
  return null;
};

const getMentorFacultySubjectIds = async (mentorId) => {
  const batches = await Batch.find({ mentor: mentorId, isDeleted: false })
    .select('facultySubjects')
    .lean();
  const ids = new Set();
  batches.forEach((b) => {
    (b.facultySubjects || []).forEach((id) => ids.add(String(id)));
  });
  return [...ids].map((id) => new mongoose.Types.ObjectId(id));
};

const assertMentorFacultySubjectAccess = async (mentorId, facultySubjectId) => {
  if (!mentorId) return { ok: false, status: 403, message: 'Not authenticated' };
  if (!facultySubjectId || !mongoose.Types.ObjectId.isValid(facultySubjectId)) {
    return { ok: false, status: 400, message: 'Invalid facultySubjectId' };
  }
  const exists = await Batch.exists({
    mentor: mentorId,
    facultySubjects: facultySubjectId,
    isDeleted: false
  });
  if (!exists) {
    return {
      ok: false,
      status: 403,
      message: 'Access denied. This faculty subject is not on your assigned batches.'
    };
  }
  return { ok: true };
};

const getStudentUserIdsForMentorBatch = async (mentorId, batchId) => {
  if (!batchId || !mongoose.Types.ObjectId.isValid(batchId)) return null;
  const batch = await Batch.findOne({ _id: batchId, mentor: mentorId, isDeleted: false }).lean();
  if (!batch) return [];

  const enrollments = await BatchEnrollment.find({
    batch: batchId,
    status: 'ACTIVE',
    ...NOT_DELETED
  })
    .populate('student', 'userId')
    .lean();

  return enrollments
    .map((e) => e.student?.userId)
    .filter((id) => id && mongoose.Types.ObjectId.isValid(id));
};

const enrichSubmissionsWithStudentProfile = async (submissions) => {
  const userIds = submissions
    .map((s) => s.studentId?._id || s.studentId)
    .filter((id) => id && mongoose.Types.ObjectId.isValid(id));

  const profileByUser = new Map();
  if (userIds.length) {
    const profiles = await Student.find({ userId: { $in: userIds }, ...ACTIVE_STUDENT })
      .select('studentId studentName email mobileNumber userId')
      .lean();
    profiles.forEach((p) => profileByUser.set(String(p.userId), p));
  }

  const emails = new Set();
  const mobiles = new Set();
  submissions.forEach((s) => {
    const user = s.studentId && typeof s.studentId === 'object' ? s.studentId : null;
    const userId = user?._id || s.studentId;
    if (userId && profileByUser.has(String(userId))) return;
    if (user?.email) emails.add(String(user.email).trim().toLowerCase());
    if (user?.mobile) mobiles.add(String(user.mobile).trim());
  });

  const profileByEmail = new Map();
  const profileByMobile = new Map();
  if (emails.size || mobiles.size) {
    const or = [];
    if (emails.size) or.push({ email: { $in: [...emails] } });
    if (mobiles.size) or.push({ mobileNumber: { $in: [...mobiles] } });
    const fallbackRows = await Student.find({ $or: or, ...ACTIVE_STUDENT })
      .select('studentId studentName email mobileNumber userId')
      .lean();
    fallbackRows.forEach((p) => {
      if (p.email) profileByEmail.set(String(p.email).toLowerCase(), p);
      if (p.mobileNumber) profileByMobile.set(String(p.mobileNumber).trim(), p);
    });
  }

  return submissions.map((s) => {
    const user = s.studentId && typeof s.studentId === 'object' ? s.studentId : null;
    const userId = user?._id || s.studentId;
    let profile = userId ? profileByUser.get(String(userId)) : null;

    if (!profile && user) {
      const emailKey = user.email ? String(user.email).trim().toLowerCase() : '';
      const mobileKey = user.mobile ? String(user.mobile).trim() : '';
      profile = (emailKey && profileByEmail.get(emailKey)) || (mobileKey && profileByMobile.get(mobileKey)) || null;
      if (profile?.userId && userId && String(profile.userId) !== String(userId)) {
        profile = null;
      }
    }

    return {
      ...s,
      studentProfile: formatMentorStudentProfile(profile, user)
    };
  });
};

const formatMentorSubmissionCore = (submission, test) => ({
  _id: submission._id,
  mainsAnswerWritingId: submission.mainsAnswerWritingId,
  facultySubjectId: submission.facultySubjectId,
  studentId: submission.studentId?._id || submission.studentId,
  submissionStatus: submission.submissionStatus,
  answerType: submission.answerType,
  answerText: submission.answerText || '',
  answerFile: submission.answerFile || null,
  evaluatorFeedback: submission.evaluatorFeedback || '',
  evaluatedAnswerType: submission.evaluatedAnswerType || null,
  evaluatedAnswerText: submission.evaluatedAnswerText || '',
  evaluatedAnswerFile: submission.evaluatedAnswerFile || null,
  evaluatedBy: submission.evaluatedBy || null,
  evaluatedAt: submission.evaluatedAt || null,
  marks: submission.marks ?? 0,
  createdAt: submission.createdAt,
  updatedAt: submission.updatedAt,
  student: submission.studentProfile || null,
  test: test ? formatTestSummaryForStudent(test) : null
});

/** List row — same core fields as detail (mentor evaluation queue) */
const formatMentorSubmissionListItem = (submission, test) => formatMentorSubmissionCore(submission, test);

const formatMentorSubmissionDetail = (submission, test) => formatMentorSubmissionCore(submission, test);

const buildMentorSubmissionFilter = async (mentorId, query) => {
  const allowedFsIds = await getMentorFacultySubjectIds(mentorId);
  if (!allowedFsIds.length) {
    return { ok: true, empty: true, filter: null };
  }

  const filter = {
    facultySubjectId: { $in: allowedFsIds }
  };

  if (query.facultySubjectId && mongoose.Types.ObjectId.isValid(query.facultySubjectId)) {
    const fsOid = new mongoose.Types.ObjectId(query.facultySubjectId);
    if (!allowedFsIds.some((id) => String(id) === String(fsOid))) {
      return { ok: false, status: 403, message: 'Access denied for this faculty subject' };
    }
    filter.facultySubjectId = fsOid;
  }

  if (query.mainsAnswerWritingId && mongoose.Types.ObjectId.isValid(query.mainsAnswerWritingId)) {
    filter.mainsAnswerWritingId = new mongoose.Types.ObjectId(query.mainsAnswerWritingId);
  }

  const status = String(query.status || '').trim().toLowerCase();
  if (status === 'submitted' || status === 'evaluated') {
    filter.submissionStatus = status;
  }

  if (query.batchId && mongoose.Types.ObjectId.isValid(query.batchId)) {
    const userIds = await getStudentUserIdsForMentorBatch(mentorId, query.batchId);
    if (userIds === null) {
      return { ok: false, status: 403, message: 'Access denied for this batch' };
    }
    if (!userIds.length) {
      return { ok: true, empty: true, filter: null };
    }
    filter.studentId = { $in: userIds };
  }

  return { ok: true, filter };
};

module.exports = {
  getMentorFacultySubjectIds,
  assertMentorFacultySubjectAccess,
  enrichSubmissionsWithStudentProfile,
  formatMentorSubmissionListItem,
  formatMentorSubmissionDetail,
  buildMentorSubmissionFilter,
  hydrateMainsTestsForStudent,
  formatTestSummaryForStudent,
  SubjectMainsAnswerWriting,
  MainsAnswerWritingSubmission,
  FacultySubject
};
