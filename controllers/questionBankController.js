const questionBankService = require('../services/questionBankService');

const getUserId = (req) => req.user?._id || req.adminAccess?._id || null;

exports.getAnalytics = async (req, res) => {
  try {
    const data = await questionBankService.getAnalytics(req.query);
    return res.json({ success: true, message: 'Analytics fetched successfully', data });
  } catch (error) {
    console.error('getAnalytics error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to fetch analytics'
    });
  }
};

exports.getFilterOptions = async (req, res) => {
  try {
    const data = await questionBankService.getFilterOptions(req.query);
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getTypes = async (req, res) => {
  try {
    const data = await questionBankService.getFilterOptions();
    return res.json({ success: true, count: data.types.length, data: data.types });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSubjects = async (req, res) => {
  try {
    const data = await questionBankService.getFilterOptions();
    return res.json({ success: true, count: data.subjects.length, data: data.subjects });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getTopics = async (req, res) => {
  try {
    const data = await questionBankService.getFilterOptions(req.query);
    return res.json({ success: true, count: data.topics.length, data: data.topics });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getTags = async (req, res) => {
  try {
    const data = await questionBankService.getFilterOptions(req.query);
    return res.json({ success: true, count: data.tags.length, data: data.tags });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getDifficulties = async (req, res) => {
  try {
    const data = await questionBankService.getFilterOptions();
    return res.json({
      success: true,
      count: data.difficulties.length,
      data: data.difficulties
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getCategories = async (req, res) => {
  try {
    const data = await questionBankService.getFilterOptions();
    return res.json({ success: true, count: data.categories.length, data: data.categories });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.listQuestions = async (req, res) => {
  try {
    const result = await questionBankService.listQuestions(
      req.query,
      req.pagination,
      req.sort
    );
    return res.json({
      success: true,
      message: 'Questions fetched successfully',
      ...result
    });
  } catch (error) {
    console.error('listQuestions error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getQuestionById = async (req, res) => {
  try {
    const data = await questionBankService.getQuestionById(req.params.id);
    return res.json({ success: true, message: 'Question fetched successfully', data });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to fetch question'
    });
  }
};

exports.createQuestion = async (req, res) => {
  try {
    const data = await questionBankService.createQuestion(
      req.body,
      req.file,
      getUserId(req)
    );
    return res.status(201).json({
      success: true,
      message: 'Question created successfully',
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
      message: error.message || 'Failed to create question'
    });
  }
};

exports.getEditableFields = async (req, res) => {
  try {
    const data = await questionBankService.getEditableFieldsForType(req.params.type);
    return res.json({
      success: true,
      message: 'Editable fields fetched successfully',
      data
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to fetch editable fields'
    });
  }
};

exports.updateQuestion = async (req, res) => {
  try {
    const data = await questionBankService.updateQuestion(
      req.params.id,
      req.body,
      req.file,
      getUserId(req)
    );
    return res.json({ success: true, message: 'Question updated successfully', data });
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

exports.deleteQuestion = async (req, res) => {
  try {
    const data = await questionBankService.deleteQuestion(req.params.id);
    return res.json({
      success: true,
      message: 'Question permanently deleted',
      data
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to delete question'
    });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const data = await questionBankService.updateStatus(
      req.params.id,
      req.body.status,
      getUserId(req)
    );
    return res.json({ success: true, message: 'Status updated successfully', data });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to update status'
    });
  }
};

exports.duplicateQuestion = async (req, res) => {
  try {
    const data = await questionBankService.duplicateQuestion(req.params.id);
    return res.json({
      success: true,
      message: 'Duplicate prefill generated — save as new question',
      data
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to duplicate question'
    });
  }
};

exports.downloadTemplate = async (req, res) => {
  try {
    const buffer = questionBankService.buildTemplate(req.params.type);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="question-bank-${req.params.type}-template.xlsx"`
    );
    return res.send(buffer);
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to download template'
    });
  }
};

exports.validateBulkFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: [{ field: 'file', message: 'XLSX or CSV file is required' }]
      });
    }

    const data = await questionBankService.validateBulkFile(req.file);
    return res.json({
      success: true,
      message: data.canImport
        ? 'File is valid and ready to import'
        : 'File has validation errors',
      data
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to validate file'
    });
  }
};

exports.importBulkFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: [{ field: 'file', message: 'XLSX or CSV file is required' }]
      });
    }

    const duplicateMode = (req.body.duplicateMode || 'SKIP').toUpperCase();
    const data = await questionBankService.importBulkFile(
      req.file,
      duplicateMode,
      getUserId(req)
    );

    return res.status(201).json({
      success: true,
      message: `${data.insertedCount} question(s) imported successfully`,
      data
    });
  } catch (error) {
    if (error.data) {
      return res.status(error.statusCode || 400).json({
        success: false,
        message: error.message,
        data: error.data
      });
    }
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to import file'
    });
  }
};
