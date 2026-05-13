const Question = require('../models/Question');

// ==================== QUESTION CONTROLLERS ====================

exports.getQuestionById = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    res.json({
      success: true,
      data: question
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.updateQuestion = async (req, res) => {
  try {
    const {
      question,
      options,
      correctAnswer,
      explanation,
      marks,
      negativeMarks,
      isActive
    } = req.body;

    // Find question
    const existingQuestion = await Question.findById(req.params.id);
    if (!existingQuestion) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    // Validate options if provided
    if (options && options.length !== 4) {
      return res.status(400).json({
        success: false,
        message: 'Must have exactly 4 options'
      });
    }

    // Validate correctAnswer matches one of the options
    if (correctAnswer && options && !options.includes(correctAnswer)) {
      return res.status(400).json({
        success: false,
        message: 'Correct answer must match one of the options'
      });
    }

    // Update question
    const updatedQuestion = await Question.findByIdAndUpdate(
      req.params.id,
      {
        question: question || existingQuestion.question,
        options: options || existingQuestion.options,
        correctAnswer: correctAnswer || existingQuestion.correctAnswer,
        explanation: explanation !== undefined ? explanation : existingQuestion.explanation,
        marks: marks !== undefined ? marks : existingQuestion.marks,
        negativeMarks: negativeMarks !== undefined ? negativeMarks : existingQuestion.negativeMarks,
        isActive: isActive !== undefined ? isActive : existingQuestion.isActive
      },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Question updated successfully',
      data: updatedQuestion
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.deleteQuestion = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    await question.deleteOne();

    res.json({
      success: true,
      message: 'Question deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
