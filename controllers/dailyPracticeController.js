const dailyPracticeService = require('../services/dailyPracticeService');
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

const createDailyPracticePaper = async (req, res) => {
  try {
    let payload = req.body;

    if (typeof payload.questions === 'string') {
      payload = {
        ...payload,
        questions: JSON.parse(payload.questions)
      };
    }

    const data = await dailyPracticeService.createDailyPracticePaper(
      payload,
      getCreatedById(req)
    );

    return res.status(201).json({
      success: true,
      message: 'Daily practice paper created successfully',
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

module.exports = {
  getMainsCategories,
  downloadBulkTemplate,
  createDailyPracticePaper,
  bulkUploadQuestions,
  getQuestionsByPaper,
  addQuestionToPaper
};
