const Resource = require('../models/Resource');
const mongoose = require('mongoose');
const Filter = require('../models/Filter');
const SubCategory = require('../models/SubCategory');
const uploadToCloudinary = require('../utils/uploadToCloudinary');
const cloudinary = require('../config/cloudinary');
const { paginate, buildPaginationResponse } = require('../middleware/resourceMiddleware');
const { normalizeResourceStatus } = require('../utils/resourceConstants');
const {
  formatCmsResourceResponse,
  getCategoryKind,
  resolveResourceKind,
  getTitleFieldKey,
  resolveResourceTitle,
  toRefId
} = require('../utils/resourceResponseFormatter');

const escapeRegex = (value) => String(value).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const textEqualsFilter = (value) => ({
  $regex: new RegExp(`^${escapeRegex(value)}$`, 'i')
});

/** NCERT list: support text (subject, class) or legacy filter IDs (subjectId, classId). */
const applyNcertListFilters = async (filter, query = {}) => {
  const { subjectId, classId, subject, class: className } = query;

  if (subject) {
    filter.subject = textEqualsFilter(subject);
  } else if (subjectId && mongoose.Types.ObjectId.isValid(subjectId)) {
    const row = await Filter.findById(subjectId).select('value type').lean();
    if (row?.type === 'SUBJECT' && row.value) {
      filter.subject = textEqualsFilter(row.value);
    }
  }

  if (className) {
    filter.class = textEqualsFilter(className);
  } else if (classId && mongoose.Types.ObjectId.isValid(classId)) {
    const row = await Filter.findById(classId).select('value type').lean();
    if (row?.type === 'CLASS' && row.value) {
      filter.class = textEqualsFilter(row.value);
    }
  }
};

const normalizeBodyId = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = String(raw).trim();
  return trimmed || null;
};

const populateCmsResource = (query) =>
  query
    .populate('categoryId', 'name slug moduleType')
    .populate('subCategoryId', 'name')
    .populate('paperId', 'value type')
    .populate('yearId', 'value type')
    .populate('monthId', 'value type')
    .populate('currentAffairsTypeId', 'value type');

const isPopulatedRef = (field) =>
  field && typeof field === 'object' && (field.name != null || field.value != null);

const ensureCmsResourceRefs = async (doc) => {
  if (!doc) return doc;

  const lookups = [];

  if (doc.subCategoryId && !isPopulatedRef(doc.subCategoryId)) {
    lookups.push(
      SubCategory.findById(doc.subCategoryId)
        .select('name')
        .then((row) => {
          if (row) doc.subCategoryId = row;
        })
    );
  }
  if (doc.paperId && !isPopulatedRef(doc.paperId)) {
    lookups.push(
      Filter.findById(doc.paperId)
        .select('value type')
        .then((row) => {
          if (row) doc.paperId = row;
        })
    );
  }
  if (doc.yearId && !isPopulatedRef(doc.yearId)) {
    lookups.push(
      Filter.findById(doc.yearId)
        .select('value type')
        .then((row) => {
          if (row) doc.yearId = row;
        })
    );
  }
  if (doc.monthId && !isPopulatedRef(doc.monthId)) {
    lookups.push(
      Filter.findById(doc.monthId)
        .select('value type')
        .then((row) => {
          if (row) doc.monthId = row;
        })
    );
  }
  if (doc.currentAffairsTypeId && !isPopulatedRef(doc.currentAffairsTypeId)) {
    lookups.push(
      Filter.findById(doc.currentAffairsTypeId)
        .select('value type')
        .then((row) => {
          if (row) doc.currentAffairsTypeId = row;
        })
    );
  }

  await Promise.all(lookups);
  return doc;
};

const loadCmsResourceById = async (id) => {
  const doc = await populateCmsResource(Resource.findById(id));
  return ensureCmsResourceRefs(doc);
};

/** Read form-data id fields (multer / Postman key variants). */
const readFormId = (body, ...keys) => {
  for (const key of keys) {
    const value = normalizeBodyId(body[key]);
    if (value) return value;
  }
  const entries = Object.entries(body || {});
  for (const key of keys) {
    const match = entries.find(([k]) => k.toLowerCase() === key.toLowerCase());
    if (match) {
      const value = normalizeBodyId(match[1]);
      if (value) return value;
    }
  }
  return null;
};

/** Always add paperId, paper, yearId, year to CMS create/update response for PYQ. */
const attachPyqFieldsToResponse = async (data, resource, extras = {}) => {
  const paperOid = resource?.paperId || extras.paperId;
  const yearOid = resource?.yearId || extras.yearId;
  if (!paperOid && !yearOid && !extras.paper && !extras.year) return data;

  const next = { ...data };

  const resolveLabel = async (field, id, preset) => {
    if (preset) return preset;
    if (isPopulatedRef(field)) return field.value;
    const idStr = toRefId(id);
    if (!idStr) return undefined;
    const row = await Filter.findById(idStr).select('value type').lean();
    return row?.value;
  };

  if (paperOid) {
    const paperIdStr = toRefId(paperOid) || toRefId(extras.paperId);
    if (paperIdStr) next.paperId = paperIdStr;
    const paper = await resolveLabel(resource?.paperId, paperOid, extras.paper);
    if (paper) next.paper = paper;
  }

  if (yearOid) {
    const yearIdStr = toRefId(yearOid) || toRefId(extras.yearId);
    if (yearIdStr) next.yearId = yearIdStr;
    const year = await resolveLabel(resource?.yearId, yearOid, extras.year);
    if (year) next.year = year;
  }

  return next;
};

/** Study Material — subCategoryId + subCategory label. */
const attachStudyMaterialFieldsToResponse = async (data, resource, extras = {}) => {
  const subOid = resource?.subCategoryId || extras.subCategoryId;
  if (!subOid && !extras.subCategory) return data;

  const next = { ...data };
  const subIdStr = toRefId(subOid) || toRefId(extras.subCategoryId);
  if (subIdStr) next.subCategoryId = subIdStr;

  if (extras.subCategory) {
    next.subCategory = extras.subCategory;
  } else if (isPopulatedRef(resource?.subCategoryId)) {
    next.subCategory = resource.subCategoryId.name;
  } else if (subIdStr) {
    const row = await SubCategory.findById(subIdStr).select('name').lean();
    if (row?.name) next.subCategory = row.name;
  }

  return next;
};

// ==================== RESOURCE CONTROLLERS ====================

exports.createResource = async (req, res) => {
  try {
    const body = req.body || {};
    const {
      bookName,
      paperName,
      materialName,
      title,
      description,
      categoryId,
      subCategoryId,
      subject,
      class: className,
      paperId,
      yearId,
      monthId,
      typeId,
      resourceType,
      fileSize,
      fileType,
      status
    } = body;

    let ncertSubject = null;
    let ncertClass = null;
    let pyqPaperLabel = null;
    let pyqYearLabel = null;
    let studyMainsCategoryLabel = null;
    const resolvedStatus = normalizeResourceStatus(status);

    if (status !== undefined && status !== null && status !== '' && !resolvedStatus) {
      return res.status(400).json({
        success: false,
        message: 'status must be Active, In Active, or Draft'
      });
    }

    if (!categoryId) {
      return res.status(400).json({
        success: false,
        message: 'categoryId is required'
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

    const kind = getCategoryKind(category);
    const resolvedSubCategoryId = readFormId(body, 'subCategoryId', 'subcategoryId');
    const resolvedPaperId = readFormId(body, 'paperId', 'paper_id');
    const resolvedYearId = readFormId(body, 'yearId', 'year_id');
    const resolvedMonthId = readFormId(body, 'monthId', 'month_id');
    const resolvedTypeId = readFormId(body, 'typeId', 'type_id');

    const isPyqUpload = Boolean(
      resolvedSubCategoryId && resolvedPaperId && resolvedYearId
    );
    const effectiveKind = isPyqUpload ? 'PYQ' : kind;
    const resolvedTitle = resolveResourceTitle(body, effectiveKind);

    if (kind === 'PYQ' && !isPyqUpload) {
      return res.status(400).json({
        success: false,
        message:
          'PYQ upload requires subCategoryId, paperId, and yearId in form-data (check all three are enabled in Postman)'
      });
    }

    if (!resolvedTitle) {
      return res.status(400).json({
        success: false,
        message: `${getTitleFieldKey(effectiveKind)} is required`
      });
    }

    if (effectiveKind === 'CURRENT_AFFAIRS') {
      if (!resolvedYearId) {
        return res.status(400).json({
          success: false,
          message: 'Current affairs resources require yearId'
        });
      }
    } else if (effectiveKind === 'NCERT') {
      if (resolvedPaperId || resolvedYearId) {
        return res.status(400).json({
          success: false,
          message: 'NCERT resources should not have paperId or yearId'
        });
      }
      ncertSubject = (subject || '').trim();
      ncertClass = (className || '').trim();

      if (!ncertSubject || !ncertClass) {
        return res.status(400).json({
          success: false,
          message: 'NCERT resources require subject and class text values'
        });
      }
    } else if (effectiveKind === 'PYQ') {
      if (!resolvedSubCategoryId) {
        return res.status(400).json({
          success: false,
          message: 'PYQ resources require subCategoryId (Prelims/Mains)'
        });
      }
      if (!resolvedPaperId || !resolvedYearId) {
        return res.status(400).json({
          success: false,
          message: 'PYQ resources require paperId and yearId'
        });
      }
      if (resolvedPaperId === resolvedYearId) {
        return res.status(400).json({
          success: false,
          message:
            'paperId and yearId must be different — use _id from Create Papers API for paperId and Create Years API for yearId'
        });
      }
      if (subject || className) {
        return res.status(400).json({
          success: false,
          message: 'PYQ resources should not have subject or class fields'
        });
      }

      const [paperFilter, yearFilter] = await Promise.all([
        Filter.findById(resolvedPaperId).select('value type').lean(),
        Filter.findById(resolvedYearId).select('value type').lean()
      ]);

      if (!paperFilter) {
        return res.status(400).json({
          success: false,
          message:
            'Invalid paperId — create a PAPER filter first (Create Papers for Prelims and Mains) and use its _id'
        });
      }
      if (!yearFilter) {
        return res.status(400).json({
          success: false,
          message:
            'Invalid yearId — create a YEAR filter first (Create Years for PYQ) and use its _id'
        });
      }

      pyqPaperLabel = paperFilter.value;
      pyqYearLabel = yearFilter.value;
    } else if (kind === 'STUDY_MATERIAL' || effectiveKind === 'STUDY_MATERIAL') {
      if (!resolvedSubCategoryId) {
        return res.status(400).json({
          success: false,
          message: 'Study material requires subCategoryId (Mains Category)'
        });
      }
      if (subject || className || resolvedPaperId || resolvedYearId) {
        return res.status(400).json({
          success: false,
          message: 'Study materials should only have subCategoryId'
        });
      }

      const subCategoryRow = await SubCategory.findById(resolvedSubCategoryId).select('name').lean();
      if (!subCategoryRow) {
        return res.status(400).json({
          success: false,
          message: 'Invalid subCategoryId — create Mains Category first and use its _id'
        });
      }
      studyMainsCategoryLabel = subCategoryRow.name;
    } else if (resolvedSubCategoryId && (resolvedPaperId || resolvedYearId)) {
      return res.status(400).json({
        success: false,
        message: 'PYQ upload requires subCategoryId, paperId, and yearId together'
      });
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
      title: resolvedTitle,
      description,
      categoryId,
      subCategoryId: resolvedSubCategoryId,
      subject: ncertSubject,
      class: ncertClass,
      paperId:
        resolvedPaperId && mongoose.Types.ObjectId.isValid(resolvedPaperId)
          ? resolvedPaperId
          : null,
      yearId:
        resolvedYearId && mongoose.Types.ObjectId.isValid(resolvedYearId)
          ? resolvedYearId
          : null,
      monthId:
        resolvedMonthId && mongoose.Types.ObjectId.isValid(resolvedMonthId)
          ? resolvedMonthId
          : null,
      currentAffairsTypeId:
        resolvedTypeId && mongoose.Types.ObjectId.isValid(resolvedTypeId)
          ? resolvedTypeId
          : null,
      resourceType: resourceType || 'PDF',
      fileUrl: {
        url: fileResult.url,
        public_id: fileResult.public_id
      },
      thumbnail: thumbnailData,
      fileSize: fileSize || null,
      fileType: fileType || 'pdf',
      status: resolvedStatus,
      createdBy: req.user._id,
      centerId: req.user.center || null
    });

    await resource.save();

    const populated = await loadCmsResourceById(resource._id);
    let data = formatCmsResourceResponse(populated, category);

    if (effectiveKind === 'PYQ' || kind === 'PYQ') {
      data = await attachPyqFieldsToResponse(data, populated, {
        paperId: resolvedPaperId,
        yearId: resolvedYearId,
        paper: pyqPaperLabel,
        year: pyqYearLabel
      });
    }

    if (effectiveKind === 'STUDY_MATERIAL' || kind === 'STUDY_MATERIAL') {
      data = await attachStudyMaterialFieldsToResponse(data, populated, {
        subCategoryId: resolvedSubCategoryId,
        subCategory: studyMainsCategoryLabel
      });
    }

    res.status(201).json({
      success: true,
      message: 'Resource created successfully',
      data
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
      paperId,
      yearId,
      status: statusQuery,
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
    await applyNcertListFilters(filter, req.query);
    if (paperId) filter.paperId = paperId;
    if (yearId) filter.yearId = yearId;

    if (statusQuery) {
      const normalized = String(statusQuery).trim().toUpperCase();
      if (normalized === 'ALL') {
        // admin: no status filter
      } else {
        const resolved = normalizeResourceStatus(statusQuery);
        if (!resolved) {
          return res.status(400).json({
            success: false,
            message: 'status must be Active, In Active, Draft, or ALL'
          });
        }
        filter.status = resolved;
      }
    } else if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    } else {
      filter.isActive = true;
    }

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
      populateCmsResource(Resource.find(filter))
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Resource.countDocuments(filter)
    ]);

    await Promise.all(resources.map((resource) => ensureCmsResourceRefs(resource)));

    res.json(
      buildPaginationResponse(
        resources.map((resource) => formatCmsResourceResponse(resource)),
        total,
        parseInt(page),
        parseInt(limit)
      )
    );
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getResourceById = async (req, res) => {
  try {
    const resource = await loadCmsResourceById(req.params.id);

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
      data: formatCmsResourceResponse(resource)
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

    const ResourceCategory = require('../models/ResourceCategory');
    const category = await ResourceCategory.findById(resource.categoryId);
    const categoryName = (category?.name || '').toLowerCase();
    const kind = getCategoryKind(category);
    const isNcert = categoryName.includes('ncert');

    const titleFieldKey = getTitleFieldKey(kind);
    const hasTitleUpdate =
      req.body.bookName !== undefined ||
      req.body.paperName !== undefined ||
      req.body.materialName !== undefined ||
      req.body.title !== undefined;

    const resolvedTitle = hasTitleUpdate
      ? resolveResourceTitle(req.body, kind)
      : resource.title;

    if (hasTitleUpdate && !resolvedTitle) {
      return res.status(400).json({
        success: false,
        message: `${titleFieldKey} is required`
      });
    }

    const updates = {
      title: resolvedTitle || resource.title,
      description: req.body.description || resource.description,
      paperId: req.body.paperId !== undefined ? req.body.paperId : resource.paperId,
      yearId: req.body.yearId !== undefined ? req.body.yearId : resource.yearId,
      monthId: req.body.monthId !== undefined ? req.body.monthId : resource.monthId,
      currentAffairsTypeId:
        req.body.typeId !== undefined ? req.body.typeId : resource.currentAffairsTypeId,
      resourceType: req.body.resourceType || resource.resourceType,
      fileSize: req.body.fileSize || resource.fileSize,
      fileType: req.body.fileType || resource.fileType
    };

    if (req.body.status !== undefined) {
      const resolvedStatus = normalizeResourceStatus(req.body.status, null);
      if (!resolvedStatus) {
        return res.status(400).json({
          success: false,
          message: 'status must be Active, In Active, or Draft'
        });
      }
      updates.status = resolvedStatus;
    } else if (req.body.isActive !== undefined) {
      updates.status = req.body.isActive === true || req.body.isActive === 'true' ? 'ACTIVE' : 'INACTIVE';
    }

    if (isNcert) {
      updates.subject =
        req.body.subject !== undefined ? String(req.body.subject).trim() : resource.subject;
      updates.class =
        req.body.class !== undefined ? String(req.body.class).trim() : resource.class;
    }

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

    const updated = await loadCmsResourceById(resource._id);
    const updatedCategory = await ResourceCategory.findById(resource.categoryId);
    const updatedKind = getCategoryKind(updatedCategory);

    let data = formatCmsResourceResponse(updated, updatedCategory);

    if (updatedKind === 'PYQ') {
      data = await attachPyqFieldsToResponse(data, updated, {
        paperId: readFormId(req.body || {}, 'paperId', 'paper_id'),
        yearId: readFormId(req.body || {}, 'yearId', 'year_id')
      });
    }

    if (updatedKind === 'STUDY_MATERIAL') {
      data = await attachStudyMaterialFieldsToResponse(data, updated, {
        subCategoryId: readFormId(req.body || {}, 'subCategoryId', 'subcategoryId')
      });
    }

    res.json({
      success: true,
      message: 'Resource updated successfully',
      data
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
