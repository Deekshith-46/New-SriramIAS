const currentAffairCmsService = require('../services/currentAffairCmsService');
const { getCreatedById } = require('../utils/currentAffairHelpers');

const createCurrentAffair = async (req, res) => {
  try {
    const data = await currentAffairCmsService.createCurrentAffair(
      req.body,
      req.file,
      getCreatedById(req)
    );

    return res.status(201).json({
      success: true,
      message: 'Current affairs created successfully',
      data
    });
  } catch (error) {
    console.error('createCurrentAffair error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to create current affair'
    });
  }
};

const getAllCurrentAffairs = async (req, res) => {
  try {
    const result = await currentAffairCmsService.getAllCurrentAffairs(
      req.query,
      req.pagination,
      req.sort
    );

    return res.status(200).json({
      success: true,
      message: 'Current affairs fetched successfully',
      ...result
    });
  } catch (error) {
    console.error('getAllCurrentAffairs error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to fetch current affairs'
    });
  }
};

const getCurrentAffairById = async (req, res) => {
  try {
    const data = await currentAffairCmsService.getCurrentAffairById(req.params.id);

    return res.status(200).json({
      success: true,
      message: 'Current affair fetched successfully',
      data
    });
  } catch (error) {
    console.error('getCurrentAffairById error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to fetch current affair'
    });
  }
};

const updateCurrentAffair = async (req, res) => {
  try {
    const data = await currentAffairCmsService.updateCurrentAffair(
      req.params.id,
      req.body,
      req.file
    );

    return res.status(200).json({
      success: true,
      message: 'Current affair updated successfully',
      data
    });
  } catch (error) {
    console.error('updateCurrentAffair error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to update current affair'
    });
  }
};

const deleteCurrentAffair = async (req, res) => {
  try {
    const data = await currentAffairCmsService.deleteCurrentAffair(req.params.id);

    return res.status(200).json({
      success: true,
      message: 'Current affair deleted successfully',
      data
    });
  } catch (error) {
    console.error('deleteCurrentAffair error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to delete current affair'
    });
  }
};

const updateStatus = async (req, res) => {
  try {
    const data = await currentAffairCmsService.updateStatus(
      req.params.id,
      req.body.status
    );

    return res.status(200).json({
      success: true,
      message: 'Current affair status updated successfully',
      data
    });
  } catch (error) {
    console.error('updateStatus error:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to update current affair status'
    });
  }
};

module.exports = {
  createCurrentAffair,
  getAllCurrentAffairs,
  getCurrentAffairById,
  updateCurrentAffair,
  deleteCurrentAffair,
  updateStatus
};
