const dailyPracticeService = require('../services/dailyPracticeService');
const currentAffairCmsService = require('../services/currentAffairCmsService');
const { getCreatedById } = require('../utils/currentAffairHelpers');

const getMainsCategories = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      message: 'Mains categories fetched successfully',
      data: dailyPracticeService.getMainsCategories()
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to fetch mains categories'
    });
  }
};

const downloadBulkTemplate = async (req, res) => {
  try {
    const buffer = dailyPracticeService.downloadBulkTemplate();

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="daily-practice-questions-template.xlsx"'
    );

    return res.send(buffer);
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to download template'
    });
  }
};

const normalizeDailyPracticePayload = (body) => {
  const payload = { ...body };

  if (typeof payload.questions === 'string' && payload.questions.trim()) {
    try {
      payload.questions = JSON.parse(payload.questions);
    } catch {
      const error = new Error('Validation failed');
      error.statusCode = 400;
      error.errors = [{ field: 'questions', message: 'questions must be valid JSON' }];
      throw error;
    }
  }

  if (payload.year !== undefined && payload.year !== '') {
    payload.year = Number(payload.year);
  }
  if (payload.sectionFrom !== undefined && payload.sectionFrom !== '') {
    payload.sectionFrom = Number(payload.sectionFrom);
  }
  if (payload.sectionTo !== undefined && payload.sectionTo !== '') {
    payload.sectionTo = Number(payload.sectionTo);
  }
  if (payload.status !== undefined && payload.status !== '') {
    payload.status = payload.status === true || payload.status === 'true';
  }

  return payload;
};

const createDailyPracticePaper = async (req, res) => {
  try {
    const payload = normalizeDailyPracticePayload(req.body);

    const data = await dailyPracticeService.createDailyPracticePaper(
      payload,
      getCreatedById(req),
      req.file
    );

    return res.status(201).json({
      success: true,
      message: 'Daily practice set created successfully',
      data
    });
  } catch (error) {
    console.error('createDailyPracticePaper error:', error);

    if (error.errors) {
      return res.status(400).json({
        success: false,
        message: error.message,
        errors: error.errors
      });
    }

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to create daily practice paper'
    });
  }
};

const bulkUploadQuestions = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: [{ field: 'file', message: 'XLSX or CSV file is required' }]
      });
    }

    const replace = req.body.replace === 'true' || req.body.replace === true;
    const data = await dailyPracticeService.bulkUploadQuestions(
      req.params.id,
      req.file,
      replace
    );

    return res.status(201).json({
      success: true,
      message: `${data.count} question(s) imported successfully`,
      data
    });
  } catch (error) {
    console.error('bulkUploadQuestions error:', error);

    if (error.errors) {
      return res.status(400).json({
        success: false,
        message: error.message,
        errors: error.errors
      });
    }

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to import questions'
    });
  }
};

const getQuestionsByPaper = async (req, res) => {
  try {
    const data = await dailyPracticeService.getQuestionsByPaper(req.params.id);

    return res.status(200).json({
      success: true,
      message: 'Questions fetched successfully',
      count: data.length,
      data
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to fetch questions'
    });
  }
};

const addQuestionToPaper = async (req, res) => {
  try {
    const data = await dailyPracticeService.addQuestionToPaper(
      req.params.id,
      req.body,
      req.file
    );

    return res.status(201).json({
      success: true,
      message: 'Question added successfully',
      data
    });
  } catch (error) {
    if (error.errors) {
      return res.status(400).json({
        success: false,
        message: error.message,
        errors: error.errors
      });
    }

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to add question'
    });
  }
};

const updateQuestionOnPaper = async (req, res) => {
  try {
    const data = await dailyPracticeService.updateQuestionOnPaper(
      req.params.id,
      req.params.questionId,
      req.body,
      req.file
    );

    return res.status(200).json({
      success: true,
      message: 'Question updated successfully',
      data
    });
  } catch (error) {
    if (error.errors) {
      return res.status(400).json({
        success: false,
        message: error.message,
        errors: error.errors
      });
    }

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to update question'
    });
  }
};

const deleteDailyPracticeSet = async (req, res) => {
  try {
    await dailyPracticeService.assertDailyPracticePaper(req.params.id);
    const data = await currentAffairCmsService.deleteCurrentAffair(req.params.id);

    return res.status(200).json({
      success: true,
      message: 'Daily practice set permanently deleted',
      data
    });
  } catch (error) {
    console.error('deleteDailyPracticeSet error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to delete daily practice set'
    });
  }
};

const deleteQuestionFromPaper = async (req, res) => {
  try {
    const data = await dailyPracticeService.deleteQuestionFromPaper(
      req.params.id,
      req.params.questionId
    );

    return res.status(200).json({
      success: true,
      message: 'Question deleted successfully',
      data
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to delete question'
    });
  }
};

module.exports = {
  getMainsCategories,
  downloadBulkTemplate,
  createDailyPracticePaper,
  bulkUploadQuestions,
  getQuestionsByPaper,
  addQuestionToPaper,
  updateQuestionOnPaper,
  deleteDailyPracticeSet,
  deleteQuestionFromPaper
};
