const MockTest = require('../models/MockTest');
const Question = require('../models/Question');
const Result = require('../models/Result');
const { buildPaginationResponse } = require('../middleware/resourceMiddleware');

// ==================== MOCK TEST CONTROLLERS ====================

exports.createMockTest = async (req, res) => {
  try {
    const {
      title,
      description,
      categoryId,
      subCategoryId,
      subjectId,
      paperId,
      yearId,
      duration,
      passingMarks,
      questions
    } = req.body;

    // Validate questions array
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one question is required'
      });
    }

    // Validate each question
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question || !q.options || q.options.length !== 4 || !q.correctAnswer) {
        return res.status(400).json({
          success: false,
          message: `Question ${i + 1} is invalid. Must have question text, 4 options, and correct answer`
        });
      }
    }

    // Step 1: Save questions to Question collection
    const createdQuestions = await Question.insertMany(
      questions.map(q => ({
        ...q,
        createdBy: req.user._id
      }))
    );

    // Step 2: Extract question IDs
    const questionIds = createdQuestions.map(q => q._id);

    // Step 3: Create mock test with question IDs
    const mockTest = new MockTest({
      title,
      description,
      categoryId,
      subCategoryId: subCategoryId || null,
      subjectId: subjectId || null,
      paperId: paperId || null,
      yearId: yearId || null,
      questionIds,
      duration,
      passingMarks: passingMarks || null,
      createdBy: req.user._id,
      centerId: req.user.center || null
    });

    await mockTest.save();

    // Step 4: Return with populated questions for API consistency
    const populatedTest = await MockTest.findById(mockTest._id)
      .populate('questionIds')
      .populate('categoryId', 'name')
      .populate('subCategoryId', 'name');

    res.status(201).json({
      success: true,
      message: 'Mock test created successfully',
      data: {
        ...populatedTest.toObject(),
        questions: populatedTest.questionIds,
        questionIds: undefined
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getMockTests = async (req, res) => {
  try {
    const { 
      categoryId, 
      subCategoryId, 
      subjectId, 
      paperId, 
      yearId, 
      isActive,
      search,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const filter = {};

    // Enforce center-based filtering for Center Admin
    if (req.user && req.user.role === 'center_admin') {
      filter.centerId = req.user.center;
    }

    // Apply module-specific filters
    if (categoryId) filter.categoryId = categoryId;
    if (subCategoryId) filter.subCategoryId = subCategoryId;
    if (subjectId) filter.subjectId = subjectId;
    if (paperId) filter.paperId = paperId;
    if (yearId) filter.yearId = yearId;
    
    // Always filter active by default
    filter.isActive = isActive !== undefined ? isActive === 'true' : true;

    // Search by title or description
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const [mockTests, total] = await Promise.all([
      MockTest.find(filter)
        .populate('categoryId', 'name')
        .populate('subCategoryId', 'name')
        .populate('subjectId', 'value type')
        .populate('paperId', 'value type')
        .populate('yearId', 'value type')
        .select('-questionIds') // Don't send questions in list view
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      MockTest.countDocuments(filter)
    ]);

    res.json(buildPaginationResponse(mockTests, total, parseInt(page), parseInt(limit)));
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getMockTestById = async (req, res) => {
  try {
    const { includeQuestions } = req.query;
    
    // Always populate questions by default
    let query = MockTest.findById(req.params.id)
      .populate('categoryId', 'name')
      .populate('subCategoryId', 'name')
      .populate('questionIds');

    const mockTest = await query;

    if (!mockTest) {
      return res.status(404).json({
        success: false,
        message: 'Mock test not found'
      });
    }

    // Transform response to show 'questions' instead of 'questionIds'
    const responseData = mockTest.toObject();
    
    // SECURITY: Filter questions based on user role
    if (mockTest.questionIds && Array.isArray(mockTest.questionIds)) {
      responseData.questions = mockTest.questionIds.map(q => {
        // Base fields everyone can see
        const questionObj = {
          _id: q._id,
          question: q.question,
          options: q.options,
          marks: q.marks,
          negativeMarks: q.negativeMarks,
          isActive: q.isActive,
          createdBy: q.createdBy,
          createdAt: q.createdAt,
          updatedAt: q.updatedAt,
          __v: q.__v
        };

        // ONLY admins can see correctAnswer and explanation
        const isAdmin = req.user && (req.user.role === 'super_admin' || req.user.role === 'center_admin');
        
        if (isAdmin) {
          questionObj.correctAnswer = q.correctAnswer;
          questionObj.explanation = q.explanation;
        }

        return questionObj;
      });
    }
    
    delete responseData.questionIds;

    res.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.updateMockTest = async (req, res) => {
  try {
    const mockTest = await MockTest.findById(req.params.id);

    if (!mockTest) {
      return res.status(404).json({
        success: false,
        message: 'Mock test not found'
      });
    }

    const updates = {
      title: req.body.title || mockTest.title,
      description: req.body.description || mockTest.description,
      // Module-specific filter IDs
      subjectId: req.body.subjectId !== undefined ? req.body.subjectId : mockTest.subjectId,
      paperId: req.body.paperId !== undefined ? req.body.paperId : mockTest.paperId,
      yearId: req.body.yearId !== undefined ? req.body.yearId : mockTest.yearId,
      duration: req.body.duration || mockTest.duration,
      passingMarks: req.body.passingMarks || mockTest.passingMarks,
      isActive: req.body.isActive !== undefined ? req.body.isActive : mockTest.isActive
    };

    // Update questions if provided
    if (req.body.questions && Array.isArray(req.body.questions)) {
      const questions = req.body.questions;
      
      // Validate each question
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        if (!q.question || !q.options || q.options.length !== 4 || !q.correctAnswer) {
          return res.status(400).json({
            success: false,
            message: `Question ${i + 1} is invalid. Must have question text, 4 options, and correct answer`
          });
        }
      }

      updates.questions = questions;
    }

    Object.assign(mockTest, updates);
    await mockTest.save();

    res.json({
      success: true,
      message: 'Mock test updated successfully',
      data: mockTest
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.deleteMockTest = async (req, res) => {
  try {
    const mockTest = await MockTest.findById(req.params.id);

    if (!mockTest) {
      return res.status(404).json({
        success: false,
        message: 'Mock test not found'
      });
    }

    // Check if test has results
    const results = await Result.countDocuments({ testId: req.params.id });
    if (results > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete mock test. It has associated results.'
      });
    }

    await mockTest.deleteOne();

    res.json({
      success: true,
      message: 'Mock test deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ==================== QUESTION MANAGEMENT ====================

exports.addQuestion = async (req, res) => {
  try {
    const { id: testId } = req.params;
    const questionData = req.body;

    // Validate question
    if (!questionData.question || !questionData.options || questionData.options.length !== 4 || !questionData.correctAnswer) {
      return res.status(400).json({
        success: false,
        message: 'Invalid question. Must have question text, 4 options, and correct answer'
      });
    }

    // Check if mock test exists
    const mockTest = await MockTest.findById(testId);
    if (!mockTest) {
      return res.status(404).json({
        success: false,
        message: 'Mock test not found'
      });
    }

    // Create question
    const question = new Question({
      ...questionData,
      createdBy: req.user._id
    });

    await question.save();

    // Add question ID to mock test
    mockTest.questionIds.push(question._id);
    await mockTest.save();

    res.status(201).json({
      success: true,
      message: 'Question added successfully',
      data: question
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.addQuestions = async (req, res) => {
  try {
    const { id: testId } = req.params;
    const { questions } = req.body;

    // Validate questions array
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Questions array is required'
      });
    }

    // Validate each question
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question || !q.options || q.options.length !== 4 || !q.correctAnswer) {
        return res.status(400).json({
          success: false,
          message: `Question ${i + 1} is invalid. Must have question text, 4 options, and correct answer`
        });
      }
    }

    // Check if mock test exists
    const mockTest = await MockTest.findById(testId);
    if (!mockTest) {
      return res.status(404).json({
        success: false,
        message: 'Mock test not found'
      });
    }

    // Create questions
    const createdQuestions = await Question.insertMany(
      questions.map(q => ({
        ...q,
        createdBy: req.user._id
      }))
    );

    // Add question IDs to mock test
    const questionIds = createdQuestions.map(q => q._id);
    mockTest.questionIds.push(...questionIds);
    await mockTest.save();

    res.status(201).json({
      success: true,
      message: `${createdQuestions.length} questions added successfully`,
      data: createdQuestions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.removeQuestion = async (req, res) => {
  try {
    const { id: testId, questionId } = req.params;

    // Check if mock test exists
    const mockTest = await MockTest.findById(testId);
    if (!mockTest) {
      return res.status(404).json({
        success: false,
        message: 'Mock test not found'
      });
    }

    // Remove question ID from mock test
    mockTest.questionIds = mockTest.questionIds.filter(
      qId => qId.toString() !== questionId
    );
    await mockTest.save();

    // Optionally delete the question itself
    await Question.findByIdAndDelete(questionId);

    res.json({
      success: true,
      message: 'Question removed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ==================== TEST ATTEMPT & EVALUATION ====================

exports.attemptTest = async (req, res) => {
  try {
    // Get testId from URL params instead of body
    const testId = req.params.id;
    const { answers, timeTaken, startedAt } = req.body;

    // SECURITY CHECK 1: Validate answers format
    if (!answers || typeof answers !== 'object' || Object.keys(answers).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Answers are required in format { questionId: selectedAnswer }'
      });
    }

    // SECURITY CHECK 2: Prevent multiple attempts
    const existingResult = await Result.findOne({
      userId: req.user._id,
      testId
    });

    if (existingResult) {
      return res.status(400).json({
        success: false,
        message: 'You have already attempted this test. Multiple attempts are not allowed.'
      });
    }

    // SECURITY CHECK 3: Get the mock test with questions
    const mockTest = await MockTest.findById(testId)
      .populate('questionIds');
    
    if (!mockTest) {
      return res.status(404).json({
        success: false,
        message: 'Mock test not found'
      });
    }

    // SECURITY CHECK 4: Verify test is active
    if (!mockTest.isActive) {
      return res.status(400).json({
        success: false,
        message: 'This test is no longer active'
      });
    }

    // SECURITY CHECK 5: Validate that all question IDs belong to this test
    const submittedQuestionIds = Object.keys(answers);
    const testQuestionIds = mockTest.questionIds.map(q => q._id.toString());
    
    const invalidQuestions = submittedQuestionIds.filter(
      qId => !testQuestionIds.includes(qId)
    );

    if (invalidQuestions.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid question IDs detected'
      });
    }

    // SECURITY CHECK 6: Evaluate answers with case-insensitive comparison
    let score = 0;
    let correctAnswers = 0;
    let wrongAnswers = 0;
    let skippedQuestions = 0;

    const evaluatedAnswers = mockTest.questionIds.map(question => {
      const selectedAnswer = answers[question._id.toString()];
      
      // Skipped question
      if (!selectedAnswer || selectedAnswer.trim() === '') {
        skippedQuestions++;
        return {
          questionId: question._id,
          selectedAnswer: null,
          isCorrect: false,
          marksObtained: 0
        };
      }

      // Case-insensitive comparison to avoid mismatch issues
      const isCorrect = selectedAnswer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
      let marksObtained = 0;
      
      if (isCorrect) {
        marksObtained = question.marks || 1;
        score += marksObtained;
        correctAnswers++;
      } else {
        marksObtained = -(question.negativeMarks || 0);
        score += marksObtained; // Could be negative
        wrongAnswers++;
      }

      return {
        questionId: question._id,
        selectedAnswer: selectedAnswer.trim(),
        isCorrect,
        marksObtained
      };
    });

    // SECURITY CHECK 7: Calculate percentage safely
    const percentage = mockTest.totalMarks > 0 
      ? parseFloat(((score / mockTest.totalMarks) * 100).toFixed(2)) 
      : 0.00;

    // SECURITY CHECK 8: Determine pass/fail
    const passed = mockTest.passingMarks ? score >= mockTest.passingMarks : null;

    // Create result record
    const result = new Result({
      userId: req.user._id,
      testId,
      answers: evaluatedAnswers,
      score,
      totalMarks: mockTest.totalMarks,
      correctAnswers,
      wrongAnswers,
      skippedQuestions,
      percentage,
      passed,
      timeTaken: timeTaken || null,
      startedAt: startedAt || new Date(),
      completedAt: new Date()
    });

    await result.save();

    // Return immediate results
    res.status(201).json({
      success: true,
      message: 'Test submitted successfully',
      data: {
        resultId: result._id,
        score,
        totalMarks: mockTest.totalMarks,
        correctAnswers,
        wrongAnswers,
        skippedQuestions,
        percentage,
        passed
      }
    });
  } catch (error) {
    console.error('Error in attemptTest:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getUserResults = async (req, res) => {
  try {
    const results = await Result.find({ userId: req.user._id })
      .populate('testId', 'title subject paper year')
      .sort({ completedAt: -1 });

    res.json({
      success: true,
      count: results.length,
      data: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getResultById = async (req, res) => {
  try {
    const result = await Result.findById(req.params.id)
      .populate('testId', 'title subject paper year questions')
      .populate('userId', 'name email');

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Result not found'
      });
    }

    // Check if user is authorized to view this result
    if (req.user.role === 'student' && result.userId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this result'
      });
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
