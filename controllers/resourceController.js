const Resource = require('../models/Resource');
const uploadToCloudinary = require('../utils/uploadToCloudinary');
const cloudinary = require('../config/cloudinary');
const { paginate, buildPaginationResponse } = require('../middleware/resourceMiddleware');

// ==================== RESOURCE CONTROLLERS ====================

exports.createResource = async (req, res) => {
  try {
    const { 
      title, 
      description, 
      categoryId, 
      subCategoryId, 
      subjectId, 
      classId, 
      paperId, 
      yearId,
      fileSize,
      fileType
    } = req.body;

    // Validate required fields
    if (!title || !categoryId) {
      return res.status(400).json({
        success: false,
        message: 'Title and categoryId are required'
      });
    }

    // Validate file
    if (!req.files || !req.files.file) {
      return res.status(400).json({
        success: false,
        message: 'File is required'
      });
    }

    // Module-specific validation
    const ResourceCategory = require('../models/ResourceCategory');
    const category = await ResourceCategory.findById(categoryId);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Validate filter combinations based on category
    const categoryName = category.name.toLowerCase();
    
    if (categoryName.includes('ncert')) {
      // NCERT should only have subjectId and classId
      if (paperId || yearId) {
        return res.status(400).json({
          success: false,
          message: 'NCERT resources should not have paperId or yearId'
        });
      }
    } else if (categoryName.includes('previous year') || categoryName.includes('pyq')) {
      // PYQ should have subCategoryId, paperId, and yearId
      if (!subCategoryId) {
        return res.status(400).json({
          success: false,
          message: 'PYQ resources require subCategoryId (Prelims/Mains)'
        });
      }
      if (!paperId || !yearId) {
        return res.status(400).json({
          success: false,
          message: 'PYQ resources require paperId and yearId'
        });
      }
      if (subjectId || classId) {
        return res.status(400).json({
          success: false,
          message: 'PYQ resources should not have subjectId or classId'
        });
      }
    } else if (categoryName.includes('study material')) {
      // Study Material should only have subCategoryId
      if (subjectId || classId || paperId || yearId) {
        return res.status(400).json({
          success: false,
          message: 'Study materials should only have subCategoryId'
        });
      }
    }

    // Upload file to Cloudinary (PDFs use 'raw' resource type)
    const fileResult = await uploadToCloudinary(
      req.files.file[0],
      'resources/files',
      'raw',
      'pdf'
    );

    let thumbnailData = {};
    if (req.files.thumbnail) {
      const thumbnailResult = await uploadToCloudinary(
        req.files.thumbnail[0],
        'resources/thumbnails'
      );
      thumbnailData = {
        url: thumbnailResult.url,
        public_id: thumbnailResult.public_id
      };
    }

    const resource = new Resource({
      title,
      description,
      categoryId,
      subCategoryId: subCategoryId || null,
      // Module-specific filter IDs
      subjectId: subjectId || null,  // For NCERT
      classId: classId || null,       // For NCERT
      paperId: paperId || null,       // For PYQ
      yearId: yearId || null,         // For PYQ
      fileUrl: {
        url: fileResult.url,
        public_id: fileResult.public_id
      },
      thumbnail: thumbnailData,
      fileSize: fileSize || null,
      fileType: fileType || 'pdf',
      createdBy: req.user._id,
      centerId: req.user.center || null
    });

    await resource.save();

    res.status(201).json({
      success: true,
      message: 'Resource created successfully',
      data: resource
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getResources = async (req, res) => {
  try {
    const { 
      categoryId, 
      subCategoryId, 
      subjectId, 
      classId, 
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
    if (subjectId) filter.subjectId = subjectId;  // NCERT
    if (classId) filter.classId = classId;         // NCERT
    if (paperId) filter.paperId = paperId;         // PYQ
    if (yearId) filter.yearId = yearId;            // PYQ
    
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
    const [resources, total] = await Promise.all([
      Resource.find(filter)
        .populate('categoryId', 'name slug')
        .populate('subCategoryId', 'name')
        .populate('subjectId', 'value type')
        .populate('classId', 'value type')
        .populate('paperId', 'value type')
        .populate('yearId', 'value type')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Resource.countDocuments(filter)
    ]);

    res.json(buildPaginationResponse(resources, total, parseInt(page), parseInt(limit)));
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getResourceById = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id)
      .populate('categoryId', 'name slug')
      .populate('subCategoryId', 'name');

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found'
      });
    }

    // Increment download count
    resource.downloads += 1;
    await resource.save();

    res.json({
      success: true,
      data: resource
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.updateResource = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found'
      });
    }

    const updates = {
      title: req.body.title || resource.title,
      description: req.body.description || resource.description,
      // Module-specific filter IDs
      subjectId: req.body.subjectId !== undefined ? req.body.subjectId : resource.subjectId,
      classId: req.body.classId !== undefined ? req.body.classId : resource.classId,
      paperId: req.body.paperId !== undefined ? req.body.paperId : resource.paperId,
      yearId: req.body.yearId !== undefined ? req.body.yearId : resource.yearId,
      fileSize: req.body.fileSize || resource.fileSize,
      fileType: req.body.fileType || resource.fileType,
      isActive: req.body.isActive !== undefined ? req.body.isActive : resource.isActive
    };

    // Upload new file if provided
    if (req.files && req.files.file) {
      // Delete old file from Cloudinary
      if (resource.fileUrl && resource.fileUrl.public_id) {
        await cloudinary.uploader.destroy(resource.fileUrl.public_id, {
          resource_type: 'raw'
        });
      }

      const fileResult = await uploadToCloudinary(
        req.files.file[0],
        'resources/files',
        'raw',
        'pdf'
      );
      updates.fileUrl = {
        url: fileResult.url,
        public_id: fileResult.public_id
      };
    }

    // Upload new thumbnail if provided
    if (req.files && req.files.thumbnail) {
      if (resource.thumbnail && resource.thumbnail.public_id) {
        await cloudinary.uploader.destroy(resource.thumbnail.public_id);
      }

      const thumbnailResult = await uploadToCloudinary(
        req.files.thumbnail[0],
        'resources/thumbnails'
      );
      updates.thumbnail = {
        url: thumbnailResult.url,
        public_id: thumbnailResult.public_id
      };
    }

    Object.assign(resource, updates);
    await resource.save();

    res.json({
      success: true,
      message: 'Resource updated successfully',
      data: resource
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.deleteResource = async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found'
      });
    }

    // Delete files from Cloudinary
    if (resource.fileUrl && resource.fileUrl.public_id) {
      await cloudinary.uploader.destroy(resource.fileUrl.public_id, {
        resource_type: 'raw'
      });
    }

    if (resource.thumbnail && resource.thumbnail.public_id) {
      await cloudinary.uploader.destroy(resource.thumbnail.public_id);
    }

    await resource.deleteOne();

    res.json({
      success: true,
      message: 'Resource deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
