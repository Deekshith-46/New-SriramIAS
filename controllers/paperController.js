const Paper = require('../models/Paper');

// @desc    Create paper
// @route   POST /api/papers
// @access  Private (Admin)
exports.createPaper = async (req, res) => {
  try {
    const { name, isActive } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Paper name is required'
      });
    }

    const paper = await Paper.create({
      name,
      isActive: isActive !== undefined ? isActive : true
    });

    res.status(201).json({
      success: true,
      message: 'Paper created successfully',
      data: paper
    });

  } catch (err) {
    console.error('Create Paper Error:', err);
    res.status(500).json({
      success: false,
      message: 'Error creating paper',
      error: err.message
    });
  }
};

// @desc    Get all papers
// @route   GET /api/papers
// @access  Public
exports.getPapers = async (req, res) => {
  try {
    const papers = await Paper.find({ isActive: true }).sort({ name: 1 });

    res.json({
      success: true,
      count: papers.length,
      data: papers
    });

  } catch (err) {
    console.error('Get Papers Error:', err);
    res.status(500).json({
      success: false,
      message: 'Error fetching papers',
      error: err.message
    });
  }
};

// @desc    Update paper
// @route   PUT /api/papers/:id
// @access  Private (Admin)
exports.updatePaper = async (req, res) => {
  try {
    const paper = await Paper.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!paper) {
      return res.status(404).json({
        success: false,
        message: 'Paper not found'
      });
    }

    res.json({
      success: true,
      message: 'Paper updated successfully',
      data: paper
    });

  } catch (err) {
    console.error('Update Paper Error:', err);
    res.status(500).json({
      success: false,
      message: 'Error updating paper',
      error: err.message
    });
  }
};

// @desc    Delete paper
// @route   DELETE /api/papers/:id
// @access  Private (Admin)
exports.deletePaper = async (req, res) => {
  try {
    const paper = await Paper.findById(req.params.id);

    if (!paper) {
      return res.status(404).json({
        success: false,
        message: 'Paper not found'
      });
    }

    await Paper.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Paper deleted successfully'
    });

  } catch (err) {
    console.error('Delete Paper Error:', err);
    res.status(500).json({
      success: false,
      message: 'Error deleting paper',
      error: err.message
    });
  }
};
