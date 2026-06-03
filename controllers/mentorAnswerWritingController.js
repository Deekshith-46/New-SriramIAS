const { sanitizeOptionalText } = require('../utils/sanitizeText');
const { uploadAnswerFile } = require('../utils/answerWritingHelpers');
const uploadToCloudinary = require('../utils/uploadToCloudinary');
const { parsePagination } = require('../utils/contentMastersHelpers');
const { NOT_DELETED } = require('../utils/contentMastersHelpers');
const {
  getMentorFacultySubjectIds,
  assertMentorFacultySubjectAccess,
  enrichSubmissionsWithStudentProfile,
  formatMentorSubmissionListItem,
  formatMentorSubmissionDetail,
  buildMentorSubmissionFilter,
  hydrateMainsTestsForStudent,
  SubjectMainsAnswerWriting,
  MainsAnswerWritingSubmission,
  FacultySubject
} = require('../utils/mentorMainsAnswerWritingHelpers');

const buildStudentSearch = (search) => {
  const trimmed = String(search || '').trim();
  if (!trimmed) return null;
  const term = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(term, 'i');
};

/** Faculty subjects on mentor batches (for filters) */
exports.getMentorMainsFacultySubjectsDropdown = async (req, res) => {
  try {
    const fsIds = await getMentorFacultySubjectIds(req.adminAccess._id);
    if (!fsIds.length) {
      return res.json({ success: true, count: 0, data: [] });
    }

    const rows = await FacultySubject.find({
      _id: { $in: fsIds },
      status: 'ACTIVE',
      categories: { $in: ['MAINS_ANSWER_WRITING'] },
      ...NOT_DELETED
    })
      .select('_id facultySubjectId subjectName')
      .sort({ subjectName: 1 })
      .lean();

    res.json({
      success: true,
      count: rows.length,
      data: rows.map((r) => ({
        _id: r._id,
        facultySubjectId: r.facultySubjectId,
        subjectName: r.subjectName
      }))
    });
  } catch (error) {
    console.error('Mentor mains faculty subjects dropdown error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/** Published tests mentor can review (by faculty subject) */
exports.getMentorMainsTestsDropdown = async (req, res) => {
  try {
    const { facultySubjectId } = req.query;
    if (!facultySubjectId) {
      return res.status(400).json({
        success: false,
        message: 'facultySubjectId query parameter is required'
      });
    }

    const access = await assertMentorFacultySubjectAccess(req.adminAccess._id, facultySubjectId);
    if (!access.ok) return res.status(access.status).json({ success: false, message: access.message });

    const tests = await SubjectMainsAnswerWriting.find({
      facultySubjectId,
      publishStatus: 'PUBLISHED',
      isDeleted: false
    })
      .select('_id mainsAnswerWritingId testName scheduleDate resultDate totalMarks')
      .sort({ scheduleDate: -1 })
      .lean();

    const hydrated = await hydrateMainsTestsForStudent(tests);

    res.json({
      success: true,
      count: tests.length,
      data: tests.map((t) => {
        const row = hydrated.get(String(t._id)) || t;
        return {
          _id: row._id,
          mainsAnswerWritingId: row.mainsAnswerWritingId,
          testName: row.testName,
          facultySubjectName: row.facultySubjectName || '',
          topicName: row.topicName || '',
          scheduleDate: row.scheduleDate,
          resultDate: row.resultDate,
          totalMarks: row.totalMarks
        };
      })
    });
  } catch (error) {
    console.error('Mentor mains tests dropdown error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * List student mains submissions (replaces legacy courseId filter).
 * Query: status=submitted|evaluated, facultySubjectId, batchId, mainsAnswerWritingId, search
 */
exports.getMentorSubmissions = async (req, res) => {
  try {
    const built = await buildMentorSubmissionFilter(req.adminAccess._id, req.query);
    if (!built.ok) {
      return res.status(built.status).json({ success: false, message: built.message });
    }
    if (built.empty) {
      return res.json({ success: true, total: 0, count: 0, data: [] });
    }

    const { page, limit, skip } = parsePagination(req.query);
    const studentRegex = buildStudentSearch(req.query.search);

    const [rows, total] = await Promise.all([
      MainsAnswerWritingSubmission.find(built.filter)
        .populate('studentId', 'name email mobile')
        .populate('evaluatedBy', 'fullName officialEmail employeeId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      MainsAnswerWritingSubmission.countDocuments(built.filter)
    ]);

    const testIds = [...new Set(rows.map((r) => String(r.mainsAnswerWritingId)))];
    const tests = await SubjectMainsAnswerWriting.find({ _id: { $in: testIds }, isDeleted: false }).lean();
    const testMap = await hydrateMainsTestsForStudent(tests);

    let enriched = await enrichSubmissionsWithStudentProfile(rows);

    if (studentRegex) {
      enriched = enriched.filter((r) => {
        const s = r.studentProfile || {};
        const u = r.studentId || {};
        return (
          studentRegex.test(String(s.studentName || u.name || '')) ||
          studentRegex.test(String(s.email || u.email || '')) ||
          studentRegex.test(String(s.mobileNumber || u.mobile || '')) ||
          studentRegex.test(String(s.studentId || '')) ||
          studentRegex.test(String(r._id || ''))
        );
      });
    }

    const data = enriched.map((s) =>
      formatMentorSubmissionListItem(s, testMap.get(String(s.mainsAnswerWritingId)) || null)
    );

    res.json({
      success: true,
      total: studentRegex ? data.length : total,
      page,
      limit,
      totalPages: Math.ceil((studentRegex ? data.length : total) / limit) || 0,
      count: data.length,
      data
    });
  } catch (error) {
    console.error('Mentor mains submissions list error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/** Full submission + test + student for evaluation screen */
exports.getMentorSubmissionById = async (req, res) => {
  try {
    const submission = await MainsAnswerWritingSubmission.findById(req.params.id)
      .populate('studentId', 'name email mobile')
      .populate('evaluatedBy', 'fullName officialEmail employeeId')
      .lean();

    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    const access = await assertMentorFacultySubjectAccess(
      req.adminAccess._id,
      submission.facultySubjectId
    );
    if (!access.ok) return res.status(access.status).json({ success: false, message: access.message });

    const test = await SubjectMainsAnswerWriting.findOne({
      _id: submission.mainsAnswerWritingId,
      isDeleted: false
    }).lean();

    const testMap = test ? await hydrateMainsTestsForStudent([test]) : new Map();
    const [enriched] = await enrichSubmissionsWithStudentProfile([submission]);

    res.json({
      success: true,
      data: formatMentorSubmissionDetail(
        enriched,
        testMap.get(String(submission.mainsAnswerWritingId)) || null
      )
    });
  } catch (error) {
    console.error('Mentor get mains submission error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.evaluateMentorSubmission = async (req, res) => {
  try {
    const submission = await MainsAnswerWritingSubmission.findById(req.params.id);
    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    const access = await assertMentorFacultySubjectAccess(
      req.adminAccess._id,
      submission.facultySubjectId
    );
    if (!access.ok) return res.status(access.status).json({ success: false, message: access.message });

    const { evaluatedAnswerType, evaluatedAnswerText, evaluatorFeedback, feedback, marks: marksRaw } =
      req.body;

    if (!evaluatedAnswerType || !['text', 'file'].includes(evaluatedAnswerType)) {
      return res.status(400).json({ success: false, message: 'evaluatedAnswerType must be text or file' });
    }

    const marks = marksRaw !== undefined ? Number(marksRaw) : submission.marks;
    if (Number.isNaN(marks) || marks < 0) {
      return res.status(400).json({ success: false, message: 'marks must be a valid number >= 0' });
    }

    const test = await SubjectMainsAnswerWriting.findOne({
      _id: submission.mainsAnswerWritingId,
      isDeleted: false
    }).lean();
    if (marks > (test?.totalMarks || 0) && test?.totalMarks) {
      return res.status(400).json({
        success: false,
        message: `marks cannot exceed test totalMarks (${test.totalMarks})`
      });
    }

    const remarks = sanitizeOptionalText(feedback || evaluatorFeedback);

    if (evaluatedAnswerType === 'text') {
      const text = sanitizeOptionalText(evaluatedAnswerText);
      if (!text) {
        return res.status(400).json({
          success: false,
          message: 'evaluatedAnswerText is required when evaluatedAnswerType is text'
        });
      }
      submission.evaluatedAnswerType = 'text';
      submission.evaluatedAnswerText = text;
      submission.evaluatedAnswerFile = undefined;
    } else {
      const file = req.files?.evaluatedAnswerFile?.[0];
      if (!file) {
        return res.status(400).json({
          success: false,
          message: 'evaluatedAnswerFile is required when evaluatedAnswerType is file'
        });
      }
      const uploaded = await uploadAnswerFile(
        file,
        'mains-answer-writing/evaluations',
        uploadToCloudinary
      );
      submission.evaluatedAnswerType = 'file';
      submission.evaluatedAnswerText = '';
      submission.evaluatedAnswerFile = { url: uploaded.url, publicId: uploaded.public_id };
    }

    submission.evaluatorFeedback = remarks;
    submission.marks = marks;
    submission.submissionStatus = 'evaluated';
    submission.evaluatedBy = req.adminAccess._id;
    submission.evaluatedAt = new Date();

    await submission.save();

    const populated = await MainsAnswerWritingSubmission.findById(submission._id)
      .populate('studentId', 'name email mobile')
      .populate('evaluatedBy', 'fullName officialEmail employeeId')
      .lean();

    const testMap = test ? await hydrateMainsTestsForStudent([test]) : new Map();
    const [enriched] = await enrichSubmissionsWithStudentProfile([populated]);

    res.json({
      success: true,
      message: 'Submission evaluated successfully. Student can view results.',
      data: formatMentorSubmissionDetail(
        enriched,
        testMap.get(String(submission.mainsAnswerWritingId)) || null
      )
    });
  } catch (error) {
    console.error('Mentor evaluate mains submission error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.deleteMentorEvaluation = async (req, res) => {
  try {
    const submission = await MainsAnswerWritingSubmission.findById(req.params.id);
    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    const access = await assertMentorFacultySubjectAccess(
      req.adminAccess._id,
      submission.facultySubjectId
    );
    if (!access.ok) return res.status(access.status).json({ success: false, message: access.message });

    submission.submissionStatus = 'submitted';
    submission.evaluatorFeedback = '';
    submission.evaluatedAnswerType = null;
    submission.evaluatedAnswerText = '';
    submission.evaluatedAnswerFile = undefined;
    submission.evaluatedBy = null;
    submission.evaluatedAt = null;
    submission.marks = 0;

    await submission.save();

    res.json({
      success: true,
      message: 'Evaluation removed. Submission is pending again.',
      data: { _id: submission._id, submissionStatus: 'submitted' }
    });
  } catch (error) {
    console.error('Mentor delete mains evaluation error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
