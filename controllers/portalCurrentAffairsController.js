const currentAffairsService = require('../services/currentAffairsService');

const getRequestUserId = (user) => user?._id || user?.id || null;

exports.getFilters = async (req, res) => {
  try {
    const data = await currentAffairsService.getCurrentAffairsFilters();
    res.json({ success: true, data });
  } catch (error) {
    console.error('Current affairs filters error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getResources = async (req, res) => {
  try {
    const data = await currentAffairsService.getCurrentAffairsResources(req.query);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Current affairs resources error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const data = await currentAffairsService.getCurrentAffairsById(req.params.id);
    if (!data) {
      return res.status(404).json({ success: false, message: 'Resource not found' });
    }
    res.json({ success: true, data });
  } catch (error) {
    console.error('Current affairs detail error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.viewResource = async (req, res) => {
  try {
    const data = await currentAffairsService.trackCurrentAffairsView(
      req.params.id,
      getRequestUserId(req.user)
    );
    if (!data) {
      return res.status(404).json({ success: false, message: 'Resource not found' });
    }
    res.json({ success: true, data });
  } catch (error) {
    console.error('Current affairs view error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.downloadResource = async (req, res) => {
  try {
    const data = await currentAffairsService.recordCurrentAffairsDownload(
      req.params.id,
      getRequestUserId(req.user)
    );
    if (!data) {
      return res.status(404).json({ success: false, message: 'Resource not found' });
    }
    res.json({ success: true, message: 'Download tracked', data });
  } catch (error) {
    console.error('Current affairs download error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
