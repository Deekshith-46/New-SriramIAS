const {
  getLatestEvaluationProgress,
  listMainsFacultySubjects,
  getFacultySubjectDetails,
  getTopicTests,
  getTestResults
} = require('../utils/mainsManagementService');
const { getPagination, paginatedResponse } = require('../utils/pagination');

/** Level 1 — dashboard cards + optional faculty subjects preview */
exports.getMainsManagementDashboard = async (req, res) => {
  try {
    const limit = Math.min(10, Math.max(1, parseInt(req.query.progressLimit, 10) || 5));
    const evaluationProgress = await getLatestEvaluationProgress(limit);

    res.json({
      success: true,
      message: 'Mains management dashboard',
      data: { evaluationProgress }
    });
  } catch (error) {
    console.error('Mains management dashboard error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/** Level 1 — faculty subjects table */
exports.listMainsFacultySubjects = async (req, res) => {
  try {
    const { page, limit } = getPagination(req.query, 20, 100);
    const { rows, total } = await listMainsFacultySubjects({
      search: req.query.search ?? '',
      page,
      limit,
      sort: req.query.sort ?? 'lastUpdated'
    });

    res.json({
      message: 'Mains faculty subjects',
      ...paginatedResponse(rows, total, page, limit)
    });
  } catch (error) {
    console.error('List mains faculty subjects error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/** Level 2 — faculty subject details + topics */
exports.getMainsFacultySubjectDetails = async (req, res) => {
  try {
    const data = await getFacultySubjectDetails(req.params.facultySubjectId);
    if (!data) {
      return res.status(404).json({ success: false, message: 'Faculty subject not found' });
    }

    res.json({
      success: true,
      message: 'Faculty subject details',
      data
    });
  } catch (error) {
    console.error('Get mains faculty subject details error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/** Level 3 — tests under topic */
exports.getMainsTopicTests = async (req, res) => {
  try {
    const { page, limit } = getPagination(req.query, 10, 50);
    const result = await getTopicTests(req.params.topicId, {
      search: req.query.search ?? '',
      page,
      limit
    });

    if (!result) {
      return res.status(400).json({ success: false, message: 'Invalid topic id' });
    }
    if (result.notFound) {
      return res.status(404).json({ success: false, message: 'Topic not found' });
    }

    res.json({
      message: 'Topic tests',
      topic: result.topic,
      ...paginatedResponse(result.rows, result.total, result.page, result.limit)
    });
  } catch (error) {
    console.error('Get mains topic tests error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/** Level 4 — test results */
exports.getMainsTestResults = async (req, res) => {
  try {
    const { page, limit } = getPagination(req.query, 20, 100);
    const result = await getTestResults(req.params.testId, {
      search: req.query.search ?? '',
      statusFilter: req.query.status ?? req.query.filter ?? 'all',
      page,
      limit
    });

    if (!result) {
      return res.status(400).json({ success: false, message: 'Invalid test id' });
    }
    if (result.notFound) {
      return res.status(404).json({ success: false, message: 'Test not found' });
    }

    res.json({
      success: true,
      message: 'Test results',
      data: {
        test: result.test,
        evaluationSummary: result.evaluationSummary,
        resultCards: result.resultCards,
        analytics: result.analytics,
        passMarks: result.passMarks,
        totalMarks: result.totalMarks,
        students: result.students
      }
    });
  } catch (error) {
    console.error('Get mains test results error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
