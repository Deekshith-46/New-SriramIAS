const TestQuestion = require('../models/TestQuestion');
const TestPaper = require('../models/TestPaper');

// @desc    Create single question
// @route   POST /api/test-questions
// @access  Private (Super Admin, Center Admin)
exports.createQuestion = async (req, res) => {
  try {
    const { paperId, questionNumber, question, options, correctAnswer, explanation, marks } = req.body;

    if (!paperId || !question || !options || correctAnswer === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Paper ID, question, options, and correctAnswer are required'
      });
    }

    // Validate options length
    if (!Array.isArray(options) || options.length !== 4) {
      return res.status(400).json({
        success: false,
        message: 'Must have exactly 4 options'
      });
    }

    // Validate correctAnswer range
    if (correctAnswer < 0 || correctAnswer > 3) {
      return res.status(400).json({
        success: false,
        message: 'correctAnswer must be between 0 and 3'
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

    // Check if question number already exists
    const existingQuestion = await TestQuestion.findOne({
      paperId,
      questionNumber
    });

    if (existingQuestion) {
      return res.status(400).json({
        success: false,
        message: `Question number ${questionNumber} already exists in this paper`
      });
    }

    const newQuestion = await TestQuestion.create({
      paperId,
      questionNumber,
      question,
      options,
      correctAnswer,
      explanation: explanation || '',
      marks: marks || 1
    });

    res.status(201).json({
      success: true,
      message: 'Question created successfully',
      data: newQuestion
    });
  } catch (error) {
    console.error('Create Question Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating question',
      error: error.message
    });
  }
};

// @desc    Bulk create questions
// @route   POST /api/test-questions/bulk
// @access  Private (Super Admin, Center Admin)
exports.bulkCreateQuestions = async (req, res) => {
  try {
    const { paperId, questions } = req.body;

    if (!paperId || !questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Paper ID and questions array are required'
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

    // Add paperId and questionNumber to each question
    const questionsWithData = questions.map((q, index) => ({
      paperId,
      questionNumber: q.questionNumber || index + 1,
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation || '',
      marks: q.marks || 1
    }));

    // Insert all questions
    const createdQuestions = await TestQuestion.insertMany(questionsWithData);

    res.status(201).json({
      success: true,
      message: `${createdQuestions.length} questions created successfully`,
      count: createdQuestions.length,
      data: createdQuestions
    });
  } catch (error) {
    console.error('Bulk Create Questions Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating questions',
      error: error.message
    });
  }
};

// @desc    Get questions for a paper (with correct answers - for admin)
// @route   GET /api/test-questions/paper/:paperId
// @access  Private (Super Admin, Center Admin)
exports.getQuestionsByPaper = async (req, res) => {
  try {
    const questions = await TestQuestion.find({ paperId: req.params.paperId })
      .sort({ questionNumber: 1 });

    res.status(200).json({
      success: true,
      count: questions.length,
      data: questions
    });
  } catch (error) {
    console.error('Get Questions Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching questions',
      error: error.message
    });
  }
};

// @desc    Get questions for a paper (without correct answers - for students)
// @route   GET /api/test-questions/view/:paperId
// @access  Private (Student)
exports.getQuestionsForStudent = async (req, res) => {
  try {
    const questions = await TestQuestion.find({ paperId: req.params.paperId })
      .select('-correctAnswer -explanation') // Exclude correct answers and explanations
      .sort({ questionNumber: 1 });

    if (questions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No questions found for this paper'
      });
    }

    res.status(200).json({
      success: true,
      count: questions.length,
      data: questions
    });
  } catch (error) {
    console.error('Get Questions for Student Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching questions',
      error: error.message
    });
  }
};

// @desc    Update question
// @route   PUT /api/test-questions/:id
// @access  Private (Super Admin, Center Admin)
exports.updateQuestion = async (req, res) => {
  try {
    const question = await TestQuestion.findById(req.params.id);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    const updatedQuestion = await TestQuestion.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Question updated successfully',
      data: updatedQuestion
    });
  } catch (error) {
    console.error('Update Question Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating question',
      error: error.message
    });
  }
};

// @desc    Delete question
// @route   DELETE /api/test-questions/:id
// @access  Private (Super Admin, Center Admin)
exports.deleteQuestion = async (req, res) => {
  try {
    const question = await TestQuestion.findById(req.params.id);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    await TestQuestion.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Question deleted successfully'
    });
  } catch (error) {
    console.error('Delete Question Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting question',
      error: error.message
    });
  }
};
