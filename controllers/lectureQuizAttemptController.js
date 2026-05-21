const RecordedLecture = require('../models/RecordedLecture');
const LectureQuizAttempt = require('../models/LectureQuizAttempt');
const { assertEnrollmentAccess } = require('../utils/courseAccess');

exports.submitQuizAttempt = async (req, res) => {
  try {
    const { lectureId, answers } = req.body;

    if (!lectureId || !Array.isArray(answers)) {
      return res.status(400).json({
        success: false,
        message: 'lectureId and answers array are required'
      });
    }

    const lecture = await RecordedLecture.findById(lectureId);
    if (!lecture) {
      return res.status(404).json({ success: false, message: 'Lecture not found' });
    }

    const enrollment = await assertEnrollmentAccess(req, res, lecture.courseId);
    if (!enrollment) return;

    const questions = lecture.topicQuiz || [];
    if (!questions.length) {
      return res.status(400).json({ success: false, message: 'This lecture has no quiz' });
    }

    const evaluatedAnswers = answers.map((answer) => {
      const question = questions[answer.questionIndex];
      const isCorrect = question
        ? Number(answer.selectedOption) === Number(question.correctAnswer)
        : false;

      return {
        questionIndex: answer.questionIndex,
        selectedOption: answer.selectedOption,
        isCorrect
      };
    });

    const score = evaluatedAnswers.filter((a) => a.isCorrect).length;
    const totalQuestions = questions.length;

    const attempt = await LectureQuizAttempt.create({
      userId: req.user._id,
      lectureId,
      courseId: lecture.courseId,
      answers: evaluatedAnswers,
      score,
      totalQuestions
    });

    const explanations = questions.map((q, index) => ({
      questionIndex: index,
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      isCorrect: evaluatedAnswers.find((a) => a.questionIndex === index)?.isCorrect ?? false
    }));

    res.status(201).json({
      success: true,
      data: {
        attemptId: attempt._id,
        score,
        totalQuestions,
        percentage: Math.round((score / totalQuestions) * 100),
        explanations
      }
    });
  } catch (error) {
    console.error('Submit Quiz Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getQuizAttempts = async (req, res) => {
  try {
    const { lectureId } = req.params;

    const lecture = await RecordedLecture.findById(lectureId);
    if (!lecture) {
      return res.status(404).json({ success: false, message: 'Lecture not found' });
    }

    const enrollment = await assertEnrollmentAccess(req, res, lecture.courseId);
    if (!enrollment) return;

    const attempts = await LectureQuizAttempt.find({
      userId: req.user._id,
      lectureId
    }).sort({ createdAt: -1 });

    res.json({ success: true, count: attempts.length, data: attempts });
  } catch (error) {
    console.error('Get Quiz Attempts Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
