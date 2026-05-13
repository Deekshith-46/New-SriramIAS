const Language = require('../models/Language');

// @desc    Create language
// @route   POST /api/languages
// @access  Private (Admin)
exports.createLanguage = async (req, res) => {
  try {
    const { name, code, isActive } = req.body;

    if (!name || !code) {
      return res.status(400).json({
        success: false,
        message: 'Name and code are required'
      });
    }

    const language = await Language.create({
      name,
      code,
      isActive: isActive !== undefined ? isActive : true
    });

    res.status(201).json({
      success: true,
      message: 'Language created successfully',
      data: language
    });

  } catch (err) {
    console.error('Create Language Error:', err);
    res.status(500).json({
      success: false,
      message: 'Error creating language',
      error: err.message
    });
  }
};

// @desc    Get all languages
// @route   GET /api/languages
// @access  Public
exports.getLanguages = async (req, res) => {
  try {
    const languages = await Language.find({ isActive: true }).sort({ name: 1 });

    res.json({
      success: true,
      count: languages.length,
      data: languages
    });

  } catch (err) {
    console.error('Get Languages Error:', err);
    res.status(500).json({
      success: false,
      message: 'Error fetching languages',
      error: err.message
    });
  }
};

// @desc    Update language
// @route   PUT /api/languages/:id
// @access  Private (Admin)
exports.updateLanguage = async (req, res) => {
  try {
    const language = await Language.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!language) {
      return res.status(404).json({
        success: false,
        message: 'Language not found'
      });
    }

    res.json({
      success: true,
      message: 'Language updated successfully',
      data: language
    });

  } catch (err) {
    console.error('Update Language Error:', err);
    res.status(500).json({
      success: false,
      message: 'Error updating language',
      error: err.message
    });
  }
};

// @desc    Delete language
// @route   DELETE /api/languages/:id
// @access  Private (Admin)
exports.deleteLanguage = async (req, res) => {
  try {
    const language = await Language.findById(req.params.id);

    if (!language) {
      return res.status(404).json({
        success: false,
        message: 'Language not found'
      });
    }

    await Language.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Language deleted successfully'
    });

  } catch (err) {
    console.error('Delete Language Error:', err);
    res.status(500).json({
      success: false,
      message: 'Error deleting language',
      error: err.message
    });
  }
};
