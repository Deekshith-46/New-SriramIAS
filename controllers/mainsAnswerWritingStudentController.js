const mongoose = require('mongoose');
const cloudinary = require('../config/cloudinary');
const SubjectMainsAnswerWriting = require('../models/SubjectMainsAnswerWriting');
const MainsAnswerWritingSubmission = require('../models/MainsAnswerWritingSubmission');
const uploadToCloudinary = require('../utils/uploadToCloudinary');
const { uploadAnswerFile } = require('../utils/answerWritingHelpers');
const { sanitizeOptionalText } = require('../utils/sanitizeText');

const ensureObjectId = (id) => (mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null);

const destroySubmissionFile = async (fileMeta) => {
  const publicId = fileMeta?.publicId;
  if (!publicId) return;
  for (const resourceType of ['raw', 'image']) {
    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
      return;
    } catch {
      // try next resource type
    }
  }
};

const {
  runMainsAnswerWritingList,
  formatMainsAnswerWritingRow,
  hydrateMainsTestsForStudent,
  formatTestSummaryForStudent
} = require('../utils/mainsAnswerWritingListHelpers');
const { trackPdfDownload } = require('../utils/mainsManagementService');
const { parsePagination, parseSort } = require('../utils/contentMastersHelpers');

const formatTest = (doc) => ({
  _id: doc._id,
  mainsAnswerWritingId: doc.mainsAnswerWritingId,
  facultySubjectId: doc.facultySubjectId,
  folderId: doc.folderId,
  topicId: doc.topicId || null,
  testName: doc.testName,
  scheduleDate: doc.scheduleDate,
  durationPreset: doc.durationPreset,
  durationMinutes: doc.durationMinutes,
  totalMarks: doc.totalMarks,
  resultDate: doc.resultDate,
  questionsText: doc.questionsText,
  pdf: doc.pdf,
  publishStatus: doc.publishStatus,
  facultySubjectName: doc.facultySubjectName || '',
  topicName: doc.topicName || '',
  folderName: doc.folderName || '',
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt
});

// Student can only see PUBLISHED tests
exports.listPublishedMainsTests = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const sort = parseSort(req.query, ['scheduleDate', 'createdAt', 'testName'], 'scheduleDate');

    const { rows, total } = await runMainsAnswerWritingList(
      {
        facultySubjectId: req.query.facultySubjectId,
        folderId: req.query.folderId,
        topicId: req.query.topicId,
        topicName: req.query.topicName,
        subjectId: req.query.subjectId,
        subjectName: req.query.subjectName,
        search: req.query.search ?? '',
        publishStatus: 'PUBLISHED'
      },
      { sort, skip, limit }
    );

    res.json({
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 0,
      count: rows.length,
      data: rows.map((row) => formatTest(formatMainsAnswerWritingRow(row)))
    });
  } catch (error) {
    console.error('List published mains tests error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/** Track unique PDF download (student) */
exports.trackMainsPdfDownload = async (req, res) => {
  try {
    const result = await trackPdfDownload(req.params.id, req.user._id);
    if (!result.ok) {
      return res.status(result.status).json({ success: false, message: result.message });
    }
    res.json({
      success: true,
      message: 'PDF download recorded',
      data: {
        pdfUrl: result.pdfUrl,
        totalDownloads: result.totalDownloads
      }
    });
  } catch (error) {
    console.error('Track mains PDF download error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getPublishedMainsTestById = async (req, res) => {
  try {
    const doc = await SubjectMainsAnswerWriting.findOne({
      _id: req.params.id,
      isDeleted: false,
      publishStatus: 'PUBLISHED'
    }).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'Test not found' });
    const hydrated = await hydrateMainsTestsForStudent([doc]);
    const test = hydrated.get(String(doc._id)) || doc;
    res.json({ success: true, data: formatTestSummaryForStudent(test) });
  } catch (error) {
    console.error('Get published mains test by id error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.submitMainsAnswer = async (req, res) => {
  try {
    const test = await SubjectMainsAnswerWriting.findOne({
      _id: req.params.id,
      isDeleted: false,
      publishStatus: 'PUBLISHED'
    }).lean();
    if (!test) return res.status(404).json({ success: false, message: 'Test not found' });

    const { answerType, answerText } = req.body;
    if (!answerType || !['text', 'file'].includes(answerType)) {
      return res.status(400).json({ success: false, message: 'answerType must be text or file' });
    }

    const existing = await MainsAnswerWritingSubmission.findOne({
      mainsAnswerWritingId: test._id,
      studentId: req.user._id
    }).lean();
    if (existing) {
      return res.status(400).json({ success: false, message: 'You have already submitted for this test' });
    }

    const payload = {
      mainsAnswerWritingId: test._id,
      facultySubjectId: test.facultySubjectId,
      studentId: req.user._id,
      answerType,
      submissionStatus: 'submitted'
    };

    if (answerType === 'text') {
      const text = sanitizeOptionalText(answerText);
      if (!text) return res.status(400).json({ success: false, message: 'answerText is required for text answers' });
      payload.answerText = text;
    } else {
      const file = req.files?.answerFile?.[0];
      if (!file) return res.status(400).json({ success: false, message: 'answerFile is required for file answers' });
      const uploaded = await uploadAnswerFile(file, 'mains-answer-writing/submissions', uploadToCloudinary);
      payload.answerFile = { url: uploaded.url, publicId: uploaded.public_id };
    }

    const submission = await MainsAnswerWritingSubmission.create(payload);
    res.status(201).json({
      success: true,
      message: 'Answer submitted successfully',
      data: formatSubmissionForStudent(
        submission.toObject(),
        formatTestSummaryForStudent(
          (await hydrateMainsTestsForStudent([test])).get(String(test._id)) || test
        )
      )
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Submission already exists for this test' });
    }
    console.error('Submit mains answer error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const formatSubmissionForStudent = (submission, test = null) => ({
  _id: submission._id,
  mainsAnswerWritingId: submission.mainsAnswerWritingId,
  facultySubjectId: submission.facultySubjectId,
  studentId: submission.studentId?._id || submission.studentId,
  submittedAt: submission.createdAt,
  answerType: submission.answerType,
  answerText: submission.answerText || '',
  answerFile: submission.answerFile || null,
  submissionStatus: submission.submissionStatus,
  evaluatorFeedback: submission.evaluatorFeedback || '',
  evaluatedAnswerType: submission.evaluatedAnswerType || null,
  evaluatedAnswerText: submission.evaluatedAnswerText || '',
  evaluatedAnswerFile: submission.evaluatedAnswerFile || null,
  evaluatedBy: submission.evaluatedBy || null,
  evaluatedAt: submission.evaluatedAt || null,
  marks: submission.marks ?? 0,
  createdAt: submission.createdAt,
  updatedAt: submission.updatedAt,
  test: test ? formatTestSummaryForStudent(test) : null
});

/**
 * List all mains answer submissions for logged-in student.
 * GET /api/mains-answer-writing/my-submissions (alias: /submissions)
 * Query: status=submitted|evaluated (optional), facultySubjectId, page, limit
 */
exports.listMyMainsSubmissions = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = { studentId: req.user._id };

    const status = String(req.query.status || '').trim().toLowerCase();
    if (status === 'submitted' || status === 'evaluated') {
      filter.submissionStatus = status;
    }

    if (req.query.facultySubjectId && ensureObjectId(req.query.facultySubjectId)) {
      filter.facultySubjectId = ensureObjectId(req.query.facultySubjectId);
    }

    const [submissions, total] = await Promise.all([
      MainsAnswerWritingSubmission.find(filter)
        .populate('evaluatedBy', 'fullName officialEmail employeeId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      MainsAnswerWritingSubmission.countDocuments(filter)
    ]);

    const testIds = submissions.map((s) => s.mainsAnswerWritingId);
    const tests = await SubjectMainsAnswerWriting.find({
      _id: { $in: testIds },
      isDeleted: false
    }).lean();
    const testMap = await hydrateMainsTestsForStudent(tests);

    res.json({
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 0,
      count: submissions.length,
      data: submissions.map((s) =>
        formatSubmissionForStudent(
          s,
          testMap.get(String(s.mainsAnswerWritingId)) || null
        )
      )
    });
  } catch (error) {
    console.error('List my mains submissions error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/** Hard delete own submission (testing — allows re-submit) */
exports.deleteMyMainsSubmission = async (req, res) => {
  try {
    const submission = await MainsAnswerWritingSubmission.findOne({
      mainsAnswerWritingId: req.params.id,
      studentId: req.user._id
    });

    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    await destroySubmissionFile(submission.answerFile);
    await destroySubmissionFile(submission.evaluatedAnswerFile);

    await MainsAnswerWritingSubmission.deleteOne({ _id: submission._id });

    res.json({
      success: true,
      message: 'Submission deleted permanently. You can submit again for this test.',
      data: {
        _id: submission._id,
        mainsAnswerWritingId: submission.mainsAnswerWritingId
      }
    });
  } catch (error) {
    console.error('Delete my mains submission error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/** Single submission by submission document id */
exports.getMyMainsSubmissionById = async (req, res) => {
  try {
    const submissionId = req.params.submissionId || req.params.id;
    if (!ensureObjectId(submissionId)) {
      return res.status(400).json({ success: false, message: 'Invalid submission id' });
    }

    const submission = await MainsAnswerWritingSubmission.findOne({
      _id: submissionId,
      studentId: req.user._id
    })
      .populate('evaluatedBy', 'fullName officialEmail employeeId')
      .lean();

    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    const test = await SubjectMainsAnswerWriting.findOne({
      _id: submission.mainsAnswerWritingId,
      isDeleted: false
    }).lean();

    const hydratedTest = test
      ? (await hydrateMainsTestsForStudent([test])).get(String(test._id)) || test
      : null;

    res.json({
      success: true,
      data: formatSubmissionForStudent(submission, hydratedTest)
    });
  } catch (error) {
    console.error('Get my mains submission by id error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/** Single submission by published test id */
exports.getMyMainsSubmission = async (req, res) => {
  try {
    const submission = await MainsAnswerWritingSubmission.findOne({
      mainsAnswerWritingId: req.params.id,
      studentId: req.user._id
    })
      .populate('evaluatedBy', 'fullName officialEmail employeeId')
      .lean();

    if (!submission) return res.status(404).json({ success: false, message: 'Submission not found' });

    const test = await SubjectMainsAnswerWriting.findOne({
      _id: submission.mainsAnswerWritingId,
      isDeleted: false
    }).lean();

    const hydratedTest = test
      ? (await hydrateMainsTestsForStudent([test])).get(String(test._id)) || test
      : null;

    res.json({
      success: true,
      data: formatSubmissionForStudent(submission, hydratedTest)
    });
  } catch (error) {
    console.error('Get my mains submission error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

