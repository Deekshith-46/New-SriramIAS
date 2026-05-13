const TestAttempt = require('../models/TestAttempt');
const TestPaper = require('../models/TestPaper');
const TestQuestion = require('../models/TestQuestion');
const mongoose = require('mongoose');

// @desc    Submit test attempt
// @route   POST /api/test-attempts/:paperId
// @access  Private (Student)
exports.submitAttempt = async (req, res) => {
  try {
    const { paperId } = req.params;
    const { answers, timeTaken } = req.body;
    const studentId = req.user.id;

    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({
        success: false,
        message: 'Answers are required'
      });
    }

    // Check if student already attempted this paper
    const existingAttempt = await TestAttempt.findOne({
      studentId,
      paperId
    });

    if (existingAttempt) {
      return res.status(400).json({
        success: false,
        message: 'You have already attempted this test'
      });
    }

    // Verify paper exists
    const paper = await TestPaper.findById(paperId);
    if (!paper) {
      return res.status(404).json({
        success: false,
        message: 'Paper not found'
      });
    }

    // Get all questions for this paper
    const questions = await TestQuestion.find({ paperId });

    if (questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No questions found for this paper'
      });
    }

    // Calculate score
    let score = 0;
    let correctAnswers = 0;
    let wrongAnswers = 0;

    const processedAnswers = answers.map(answer => {
      const question = questions.find(q => q._id.toString() === answer.questionId);
      
      if (!question) return answer;

      const isCorrect = question.correctAnswer === answer.selectedOption;
      
      if (isCorrect) {
        score += question.marks || 1;
        correctAnswers++;
      } else {
        wrongAnswers++;
        // Deduct negative marks if applicable
        if (paper.negativeMarks > 0) {
          score -= paper.negativeMarks;
        }
      }

      return answer;
    });

    const unattempted = questions.length - answers.length;

    // Fix score precision
    score = parseFloat(score.toFixed(2));

    // Create attempt
    const attempt = await TestAttempt.create({
      studentId,
      paperId,
      answers: processedAnswers,
      score: Math.max(0, score), // Score cannot be negative
      totalQuestions: questions.length,
      correctAnswers,
      wrongAnswers,
      unattempted,
      timeTaken: timeTaken || 0
    });

    res.status(201).json({
      success: true,
      message: 'Test submitted successfully',
      data: {
        attemptId: attempt._id,
        score: attempt.score,
        totalQuestions: attempt.totalQuestions,
        correctAnswers: attempt.correctAnswers,
        wrongAnswers: attempt.wrongAnswers,
        unattempted: attempt.unattempted
      }
    });
  } catch (error) {
    console.error('Submit Attempt Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting test',
      error: error.message
    });
  }
};

// @desc    Get result for a specific paper
// @route   GET /api/test-results/:paperId
// @access  Private (Student)
exports.getResult = async (req, res) => {
  try {
    const { paperId } = req.params;
    const studentId = req.user.id;

    // Get student's attempt
    const attempt = await TestAttempt.findOne({
      studentId,
      paperId
    }).populate('paperId', 'title totalMarks negativeMarks');

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'No attempt found for this paper'
      });
    }

    // Calculate rank
    const rankData = await TestAttempt.aggregate([
      { $match: { paperId: attempt.paperId._id } },
      {
        $group: {
          _id: '$studentId',
          maxScore: { $max: '$score' }
        }
      },
      { $sort: { maxScore: -1 } }
    ]);

    const rank = rankData.findIndex(r => r._id.toString() === studentId) + 1;

    res.status(200).json({
      success: true,
      data: {
        score: attempt.score,
        totalQuestions: attempt.totalQuestions,
        correctAnswers: attempt.correctAnswers,
        wrongAnswers: attempt.wrongAnswers,
        unattempted: attempt.unattempted,
        rank,
        totalParticipants: rankData.length,
        submittedAt: attempt.submittedAt
      }
    });
  } catch (error) {
    console.error('Get Result Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching result',
      error: error.message
    });
  }
};

// @desc    Get detailed review of test attempt (with all question details)
// @route   GET /api/test-attempts/review/:paperId
// @access  Private (Student)
exports.getDetailedReview = async (req, res) => {
  try {
    const { paperId } = req.params;
    const studentId = req.user.id;

    // Get student's attempt
    const attempt = await TestAttempt.findOne({
      studentId,
      paperId
    });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'No attempt found for this paper'
      });
    }

    // Get all questions for this paper with full details
    const questions = await TestQuestion.find({ paperId }).sort({ questionNumber: 1 });

    // Create a map of student's answers
    const studentAnswersMap = {};
    attempt.answers.forEach(answer => {
      studentAnswersMap[answer.questionId.toString()] = answer.selectedOption;
    });

    // Build detailed review for each question
    const detailedReview = questions.map(question => {
      const selectedOption = studentAnswersMap[question._id.toString()];
      const isAnswered = selectedOption !== undefined;
      const isCorrect = isAnswered && question.correctAnswer === selectedOption;

      return {
        questionId: question._id,
        questionNumber: question.questionNumber,
        question: question.question,
        options: question.options,
        marks: question.marks,
        selectedOption: isAnswered ? selectedOption : null,
        selectedOptionText: isAnswered ? question.options[selectedOption] : 'Not Answered',
        correctAnswer: question.correctAnswer,
        correctOptionText: question.options[question.correctAnswer],
        isCorrect: isCorrect,
        isAnswered: isAnswered,
        explanation: question.explanation
      };
    });

    // Get paper details for negative marks calculation
    const paper = await TestPaper.findById(paperId);

    // Recalculate marks with paper's negative marks
    const finalReview = detailedReview.map(item => {
      let marksAwarded = 0;
      if (item.isCorrect) {
        marksAwarded = item.marks;
      } else if (item.isAnswered && paper && paper.negativeMarks > 0) {
        marksAwarded = -paper.negativeMarks;
      }
      
      return {
        ...item,
        marksAwarded: parseFloat(marksAwarded.toFixed(2))
      };
    });

    res.status(200).json({
      success: true,
      data: {
        paperId: paper._id,
        paperTitle: paper.title,
        totalQuestions: attempt.totalQuestions,
        correctAnswers: attempt.correctAnswers,
        wrongAnswers: attempt.wrongAnswers,
        unattempted: attempt.unattempted,
        score: attempt.score,
        timeTaken: attempt.timeTaken,
        submittedAt: attempt.submittedAt,
        questions: finalReview
      }
    });
  } catch (error) {
    console.error('Get Detailed Review Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching detailed review',
      error: error.message
    });
  }
};

// @desc    Get top performers for a paper
// @route   GET /api/test-top-performers/:paperId
// @access  Public
exports.getTopPerformers = async (req, res) => {
  try {
    const { paperId } = req.params;
    const limit = parseInt(req.query.limit) || 10;

    const topPerformers = await TestAttempt.aggregate([
      { $match: { paperId: new mongoose.Types.ObjectId(paperId) } },
      {
        $group: {
          _id: '$studentId',
          maxScore: { $max: '$score' },
          attemptData: { $first: '$$ROOT' }
        }
      },
      { $sort: { maxScore: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'student'
        }
      },
      { $unwind: '$student' },
      {
        $project: {
          studentName: '$student.name',
          studentEmail: '$student.email',
          profileImage: '$student.profileImage',
          score: '$maxScore',
          correctAnswers: '$attemptData.correctAnswers',
          wrongAnswers: '$attemptData.wrongAnswers',
          submittedAt: '$attemptData.submittedAt'
        }
      }
    ]);

    // Add rank manually
    const rankedPerformers = topPerformers.map((performer, index) => ({
      rank: index + 1,
      studentName: performer.studentName,
      studentEmail: performer.studentEmail,
      profileImage: performer.profileImage,
      score: performer.score,
      correctAnswers: performer.correctAnswers,
      wrongAnswers: performer.wrongAnswers,
      submittedAt: performer.submittedAt
    }));

    res.status(200).json({
      success: true,
      count: rankedPerformers.length,
      data: rankedPerformers
    });
  } catch (error) {
    console.error('Get Top Performers Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching top performers',
      error: error.message
    });
  }
};

// @desc    Get all attempts by student
// @route   GET /api/test-attempts/my-attempts
// @access  Private (Student)
exports.getMyAttempts = async (req, res) => {
  try {
    const studentId = req.user.id;

    const attempts = await TestAttempt.find({ studentId })
      .populate('paperId', 'title date totalMarks')
      .sort({ submittedAt: -1 });

    res.status(200).json({
      success: true,
      count: attempts.length,
      data: attempts
    });
  } catch (error) {
    console.error('Get My Attempts Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching attempts',
      error: error.message
    });
  }
};
