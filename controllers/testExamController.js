const TestExam = require('../models/TestExam');
const TestResult = require('../models/TestResult');
const { assertEnrollmentAccess, getCourseForAdmin } = require('../utils/courseAccess');
const { assertSubjectBelongsToCourse } = require('../utils/answerWritingHelpers');
const {
  NOT_DELETED,
  validateQuestions,
  syncExamTotals,
  sanitizeExamForStudent,
  formatScheduleItem,
  isExamWindowOpen,
  resolveExamScheduleStatus
} = require('../utils/testExamHelpers');

const findActiveExam = (id) =>
  TestExam.findOne({ _id: id, ...NOT_DELETED, isActive: true });

const resolveCourseId = (body) => body.course || body.courseId;
const resolveSubjectId = (body) => body.subject || body.subjectId;

const buildExamPayload = async (body, { isUpdate = false } = {}) => {
  const course = resolveCourseId(body);
  const subject = resolveSubjectId(body);

  if (!isUpdate && (!course || !subject)) {
    return { error: 'course and subject are required' };
  }

  if (subject && course) {
    const subjectDoc = await assertSubjectBelongsToCourse(course, subject);
    if (!subjectDoc) {
      return { error: 'Subject does not belong to this course' };
    }
  }

  const payload = {};

  if (course) payload.course = course;
  if (subject) payload.subject = subject;
  if (body.title !== undefined) payload.title = String(body.title).trim();
  if (body.description !== undefined) payload.description = body.description;
  if (body.examDate !== undefined) payload.examDate = body.examDate;
  if (body.examEndDate !== undefined) payload.examEndDate = body.examEndDate || null;
  if (body.durationInMinutes !== undefined) payload.durationInMinutes = body.durationInMinutes;
  if (body.passMarks !== undefined) payload.passMarks = body.passMarks;
  if (body.negativeMarks !== undefined) payload.negativeMarks = body.negativeMarks;
  if (body.maxAttempts !== undefined) payload.maxAttempts = body.maxAttempts;
  if (body.isPublished !== undefined) payload.isPublished = body.isPublished;
  if (body.isActive !== undefined) payload.isActive = body.isActive;

  if (body.questions !== undefined) {
    const validationError = validateQuestions(body.questions);
    if (validationError) return { error: validationError };
    payload.questions = body.questions;
    payload.totalMarks = syncExamTotals(body.questions, body.totalMarks);
  } else if (body.totalMarks !== undefined) {
    payload.totalMarks = body.totalMarks;
  }

  return { payload, course, subject };
};

exports.createTestExam = async (req, res) => {
  try {
    const built = await buildExamPayload(req.body);
    if (built.error) {
      return res.status(400).json({ success: false, message: built.error });
    }

    const course = await getCourseForAdmin(req, res, built.course);
    if (!course) return;

    const exam = await TestExam.create({
      ...built.payload,
      createdBy: req.user._id
    });

    const populated = await TestExam.findById(exam._id)
      .populate('subject', 'title')
      .populate('course', 'title');

    res.status(201).json({
      success: true,
      message: 'Test exam created',
      data: populated
    });
  } catch (error) {
    console.error('Create test exam error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateTestExam = async (req, res) => {
  try {
    const exam = await findActiveExam(req.params.id);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Test exam not found' });
    }

    const course = await getCourseForAdmin(req, res, exam.course);
    if (!course) return;

    const built = await buildExamPayload(
      { ...req.body, course: resolveCourseId(req.body) || exam.course },
      { isUpdate: true }
    );
    if (built.error) {
      return res.status(400).json({ success: false, message: built.error });
    }

    Object.assign(exam, built.payload);
    await exam.save();

    const populated = await TestExam.findById(exam._id)
      .populate('subject', 'title')
      .populate('course', 'title');

    res.json({
      success: true,
      message: 'Test exam updated',
      data: populated
    });
  } catch (error) {
    console.error('Update test exam error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.deleteTestExam = async (req, res) => {
  try {
    const exam = await findActiveExam(req.params.id);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Test exam not found' });
    }

    const course = await getCourseForAdmin(req, res, exam.course);
    if (!course) return;

    exam.isDeleted = true;
    exam.isPublished = false;
    exam.isActive = false;
    await exam.save();

    res.json({
      success: true,
      message: 'Test exam deleted. Past results are preserved.'
    });
  } catch (error) {
    console.error('Delete test exam error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getCourseTestExamsAdmin = async (req, res) => {
  try {
    const { courseId } = req.params;
    const course = await getCourseForAdmin(req, res, courseId);
    if (!course) return;

    const exams = await TestExam.find({ course: courseId, ...NOT_DELETED })
      .populate('subject', 'title')
      .sort({ examDate: 1 })
      .lean();

    res.json({
      success: true,
      count: exams.length,
      data: exams.map((exam) => ({
        ...exam,
        scheduleStatus: resolveExamScheduleStatus(exam)
      }))
    });
  } catch (error) {
    console.error('Admin course test exams error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getCourseTestSchedule = async (req, res) => {
  try {
    const { courseId } = req.params;

    const enrollment = await assertEnrollmentAccess(req, res, courseId);
    if (!enrollment) return;

    const exams = await TestExam.find({
      course: courseId,
      isPublished: true,
      isActive: true,
      ...NOT_DELETED
    })
      .populate('subject', 'title')
      .sort({ examDate: 1 })
      .lean();

    const examIds = exams.map((e) => e._id);
    const attemptCounts = await TestResult.aggregate([
      {
        $match: {
          student: req.user._id,
          testExam: { $in: examIds }
        }
      },
      { $group: { _id: '$testExam', count: { $sum: 1 } } }
    ]);

    const countMap = new Map(attemptCounts.map((row) => [String(row._id), row.count]));

    res.json({
      success: true,
      count: exams.length,
      data: exams.map((exam) =>
        formatScheduleItem(exam, countMap.get(String(exam._id)) || 0)
      )
    });
  } catch (error) {
    console.error('Course test schedule error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getTestExamAdmin = async (req, res) => {
  try {
    const exam = await TestExam.findOne({ _id: req.params.id, ...NOT_DELETED })
      .populate('subject', 'title')
      .populate('course', 'title');

    if (!exam) {
      return res.status(404).json({ success: false, message: 'Test exam not found' });
    }

    const course = await getCourseForAdmin(req, res, exam.course._id || exam.course);
    if (!course) return;

    res.json({
      success: true,
      data: {
        ...exam.toObject(),
        scheduleStatus: resolveExamScheduleStatus(exam)
      }
    });
  } catch (error) {
    console.error('Get test exam admin error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.startTestExam = async (req, res) => {
  try {
    const exam = await TestExam.findOne({
      _id: req.params.id,
      isPublished: true,
      isActive: true,
      ...NOT_DELETED
    })
      .populate('subject', 'title')
      .lean();

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Test exam not found or not published'
      });
    }

    const enrollment = await assertEnrollmentAccess(req, res, exam.course);
    if (!enrollment) return;

    if (!isExamWindowOpen(exam)) {
      return res.status(403).json({
        success: false,
        message:
          resolveExamScheduleStatus(exam) === 'UPCOMING'
            ? 'This test is not available yet'
            : 'This test window has ended',
        scheduleStatus: resolveExamScheduleStatus(exam)
      });
    }

    const attemptCount = await TestResult.countDocuments({
      student: req.user._id,
      testExam: exam._id
    });

    if (attemptCount >= (exam.maxAttempts || 1)) {
      return res.status(400).json({
        success: false,
        message: `Maximum attempts (${exam.maxAttempts}) reached for this test`
      });
    }

    if (!exam.questions?.length) {
      return res.status(400).json({
        success: false,
        message: 'Test exam has no questions yet'
      });
    }

    res.json({
      success: true,
      message: 'Test ready to start',
      data: {
        ...sanitizeExamForStudent(exam),
        attemptNumber: attemptCount + 1,
        attemptsRemaining: (exam.maxAttempts || 1) - attemptCount
      }
    });
  } catch (error) {
    console.error('Start test exam error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
