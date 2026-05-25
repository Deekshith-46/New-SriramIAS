const resourceService = require('../services/resourceService');
const { MODULE_TYPES } = require('../utils/resourceConstants');

const getRequestUserId = (user) => user?._id || user?.id || null;

exports.getFilters = async (req, res) => {
  try {
    const data = await resourceService.getFreeResourcesFilters(req.query);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Free resources filters error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getDynamicFilters = async (req, res) => {
  try {
    const { typeId } = req.query;
    if (!typeId) {
      return res.status(400).json({
        success: false,
        message: 'typeId query parameter is required (categoryId: NCERT, PYQ, etc.)'
      });
    }

    const data = await resourceService.getFreeResourcesDynamicFilters(typeId);
    if (data === null) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Free resources dynamic filters error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getResources = async (req, res) => {
  try {
    const result = await resourceService.getFreeResourcesResources(req.query);

    if (result?.error === 'typeId is required (this is the categoryId)') {
      return res.status(400).json({ success: false, message: result.error });
    }
    if (result?.error) {
      return res.status(404).json({ success: false, message: result.error });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Free resources list error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const data = await resourceService.getFreeResourceById(req.params.id);
    if (!data) {
      return res.status(404).json({ success: false, message: 'Resource not found' });
    }
    res.json({ success: true, data });
  } catch (error) {
    console.error('Free resource detail error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.viewResource = async (req, res) => {
  try {
    const data = await resourceService.trackResourceView(
      req.params.id,
      MODULE_TYPES.FREE_RESOURCES,
      getRequestUserId(req.user)
    );
    if (!data) {
      return res.status(404).json({ success: false, message: 'Resource not found' });
    }
    res.json({ success: true, data });
  } catch (error) {
    console.error('Free resource view error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.downloadResource = async (req, res) => {
  try {
    const data = await resourceService.recordResourceDownload(
      req.params.id,
      MODULE_TYPES.FREE_RESOURCES,
      getRequestUserId(req.user)
    );
    if (!data) {
      return res.status(404).json({ success: false, message: 'Resource not found' });
    }
    res.json({ success: true, message: 'Download tracked', data });
  } catch (error) {
    console.error('Free resource download error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
