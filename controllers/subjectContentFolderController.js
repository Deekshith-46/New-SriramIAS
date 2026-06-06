const SubjectContentFolder = require('../models/SubjectContentFolder');
const SubjectLiveClass = require('../models/SubjectLiveClass');
const SubjectRecording = require('../models/SubjectRecording');
const SubjectMainsAnswerWriting = require('../models/SubjectMainsAnswerWriting');
const SubjectPdf = require('../models/SubjectPdf');
const { RECORDING_VISIBILITY_STATUSES, PDF_VISIBILITY_STATUSES } = require('../utils/facultyContentConstants');
const { assertFolderCanBeDeleted } = require('../services/scheduleConflictService');
const {
  generateSubjectContentFolderId,
  isValidObjectId
} = require('../utils/contentIdGenerator');
const { NOT_DELETED, escapeRegex, parsePagination } = require('../utils/contentMastersHelpers');
const {
  validateFolderPayload,
  validateCategory
} = require('../utils/facultyContentHelpers');
const { sendValidationError, sendError } = require('../utils/cmsApiErrors');
const { listFolderContent } = require('../services/folderContentListService');

const formatFolder = (doc) => ({
  _id: doc._id,
  folderId: doc.folderId,
  facultySubjectId: doc.facultySubjectId,
  category: doc.category,
  folderName: doc.folderName,
  description: doc.description || '',
  status: doc.status,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt
});

exports.createFolder = async (req, res) => {
  try {
    const { facultySubjectId, category, folderName, description = '' } = req.body;

    const validation = await validateFolderPayload({ facultySubjectId, category, folderName });
    if (!validation.ok) {
      return sendValidationError(res, validation);
    }

    const duplicate = await SubjectContentFolder.findOne({
      facultySubjectId: validation.facultySubject._id,
      category: validation.category,
      folderName: folderName.trim(),
      ...NOT_DELETED
    }).lean();

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: 'Folder with this name already exists for this category'
      });
    }

    const folder = await SubjectContentFolder.create({
      folderId: await generateSubjectContentFolderId(),
      facultySubjectId: validation.facultySubject._id,
      category: validation.category,
      folderName: folderName.trim(),
      description: String(description || '').trim(),
      createdBy: req.user?._id || null,
      updatedBy: req.user?._id || null
    });

    res.status(201).json({
      success: true,
      message: 'Folder created successfully',
      data: formatFolder(folder.toObject())
    });
  } catch (error) {
    console.error('Create folder error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateFolder = async (req, res) => {
  try {
    const folder = await SubjectContentFolder.findOne({ _id: req.params.id, ...NOT_DELETED });
    if (!folder) {
      return res.status(404).json({ success: false, message: 'Folder not found' });
    }

    if (req.body.folderName !== undefined) {
      const nextName = String(req.body.folderName).trim();
      if (!nextName) {
        return res.status(400).json({ success: false, message: 'folderName cannot be empty' });
      }

      if (nextName !== folder.folderName) {
        const duplicate = await SubjectContentFolder.findOne({
          _id: { $ne: folder._id },
          facultySubjectId: folder.facultySubjectId,
          category: folder.category,
          folderName: nextName,
          ...NOT_DELETED
        }).lean();

        if (duplicate) {
          return res.status(409).json({
            success: false,
            message: 'Folder with this name already exists for this category'
          });
        }
      }

      folder.folderName = nextName;
    }

    if (req.body.description !== undefined) {
      folder.description = String(req.body.description || '').trim();
    }

    if (req.body.status !== undefined) {
      if (!['ACTIVE', 'INACTIVE'].includes(req.body.status)) {
        return res.status(400).json({ success: false, message: 'status must be ACTIVE or INACTIVE' });
      }
      folder.status = req.body.status;
    }

    folder.updatedBy = req.user?._id || null;
    await folder.save();

    res.json({
      success: true,
      message: 'Folder updated successfully',
      data: formatFolder(folder.toObject())
    });
  } catch (error) {
    console.error('Update folder error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.deleteFolder = async (req, res) => {
  try {
    const folder = await SubjectContentFolder.findOne({ _id: req.params.id, ...NOT_DELETED });
    if (!folder) {
      return res.status(404).json({ success: false, message: 'Folder not found' });
    }

    const canDelete = await assertFolderCanBeDeleted(folder._id);
    if (!canDelete.ok) {
      return sendError(res, 409, {
        errorCode: canDelete.errorCode,
        message: canDelete.message,
        reason: canDelete.reason,
        field: canDelete.field,
        details: canDelete.details,
        suggestions: canDelete.suggestions
      });
    }

    folder.isDeleted = true;
    folder.deletedAt = new Date();
    folder.status = 'INACTIVE';
    folder.updatedBy = req.user?._id || null;
    await folder.save();

    res.json({
      success: true,
      message: 'Folder deleted successfully',
      data: { _id: folder._id }
    });
  } catch (error) {
    console.error('Delete folder error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * List all content items inside a folder scoped to facultySubjectId + category + folderId.
 * GET /api/folders/content?facultySubjectId=&category=&folderId=
 */
exports.listFolderContent = async (req, res) => {
  try {
    const { facultySubjectId, category, folderId } = req.query;

    const result = await listFolderContent({
      facultySubjectId,
      category,
      folderId,
      query: req.query
    });

    if (!result.ok) {
      return res.status(result.status || 400).json({
        success: false,
        message: result.message
      });
    }

    res.json({
      success: true,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
      count: result.count,
      facultySubjectId: result.facultySubjectId,
      category: result.category,
      facultySubjectName: result.facultySubjectName,
      teacherName: result.teacherName,
      folder: result.folder,
      ...(result.note ? { note: result.note } : {}),
      data: result.data
    });
  } catch (error) {
    console.error('List folder content error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.listFolders = async (req, res) => {
  try {
    const { facultySubjectId, category, search = '', status } = req.query;

    if (!facultySubjectId || !isValidObjectId(facultySubjectId)) {
      return res.status(400).json({ success: false, message: 'Valid facultySubjectId is required' });
    }

    const query = {
      facultySubjectId,
      ...NOT_DELETED
    };

    if (category) {
      const cat = validateCategory(category);
      if (!cat.ok) return res.status(400).json({ success: false, message: cat.message });
      query.category = cat.value;
    }

    if (status && ['ACTIVE', 'INACTIVE'].includes(String(status).toUpperCase())) {
      query.status = String(status).toUpperCase();
    }

    const trimmed = String(search).trim();
    if (trimmed) {
      query.folderName = { $regex: escapeRegex(trimmed), $options: 'i' };
    }

    const { page, limit, skip } = parsePagination(req.query);

    const [rows, total] = await Promise.all([
      SubjectContentFolder.find(query).sort({ folderName: 1 }).skip(skip).limit(limit).lean(),
      SubjectContentFolder.countDocuments(query)
    ]);

    res.json({
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 0,
      count: rows.length,
      data: rows.map(formatFolder)
    });
  } catch (error) {
    console.error('List folders error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getFolderById = async (req, res) => {
  try {
    const folder = await SubjectContentFolder.findOne({ _id: req.params.id, ...NOT_DELETED }).lean();
    if (!folder) {
      return res.status(404).json({ success: false, message: 'Folder not found' });
    }
    res.json({ success: true, data: formatFolder(folder) });
  } catch (error) {
    console.error('Get folder error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getFolderContentSummary = async (req, res) => {
  try {
    const folder = await SubjectContentFolder.findOne({ _id: req.params.id, ...NOT_DELETED }).lean();
    if (!folder) {
      return res.status(404).json({ success: false, message: 'Folder not found' });
    }

    const baseMatch = { folderId: folder._id, ...NOT_DELETED };

    if (folder.category === 'RECORDING') {
      const counts = await Promise.all(
        RECORDING_VISIBILITY_STATUSES.map((visibility) =>
          SubjectRecording.countDocuments({ ...baseMatch, visibility })
        )
      );
      const recordingCount = counts.reduce((a, b) => a + b, 0);
      const viewsAgg = await SubjectRecording.aggregate([
        { $match: baseMatch },
        { $group: { _id: null, totalViews: { $sum: '$viewCount' } } }
      ]);

      const data = {
        folderId: folder.folderId,
        folderName: folder.folderName,
        category: folder.category,
        recordingCount,
        totalViews: viewsAgg[0]?.totalViews || 0
      };
      RECORDING_VISIBILITY_STATUSES.forEach((status, index) => {
        const key =
          status === 'VISIBILITY'
            ? 'visibilityCount'
            : `${status.charAt(0)}${status.slice(1).toLowerCase()}Count`;
        data[key] = counts[index];
      });

      return res.json({ success: true, data });
    }

    if (folder.category === 'MAINS_ANSWER_WRITING') {
      const [total, published, draft, unpublished] = await Promise.all([
        SubjectMainsAnswerWriting.countDocuments(baseMatch),
        SubjectMainsAnswerWriting.countDocuments({ ...baseMatch, publishStatus: 'PUBLISHED' }),
        SubjectMainsAnswerWriting.countDocuments({ ...baseMatch, publishStatus: 'DRAFT' }),
        SubjectMainsAnswerWriting.countDocuments({ ...baseMatch, publishStatus: 'UNPUBLISHED' })
      ]);

      return res.json({
        success: true,
        data: {
          folderId: folder.folderId,
          folderName: folder.folderName,
          category: folder.category,
          mainsAnswerWritingCount: total,
          publishedCount: published,
          draftCount: draft,
          unpublishedCount: unpublished
        }
      });
    }

    if (folder.category === 'PDF') {
      const counts = await Promise.all(
        PDF_VISIBILITY_STATUSES.map((visibility) =>
          SubjectPdf.countDocuments({ ...baseMatch, visibility })
        )
      );
      const pdfCount = counts.reduce((a, b) => a + b, 0);
      const viewsAgg = await SubjectPdf.aggregate([
        { $match: baseMatch },
        { $group: { _id: null, totalViews: { $sum: '$viewCount' } } }
      ]);

      const data = {
        folderId: folder.folderId,
        folderName: folder.folderName,
        category: folder.category,
        pdfCount,
        totalViews: viewsAgg[0]?.totalViews || 0
      };
      PDF_VISIBILITY_STATUSES.forEach((status, index) => {
        const key =
          status === 'VISIBILITY'
            ? 'visibilityCount'
            : `${status.charAt(0)}${status.slice(1).toLowerCase()}Count`;
        data[key] = counts[index];
      });

      return res.json({ success: true, data });
    }

    const [total, published, draft, unpublished] = await Promise.all([
      SubjectLiveClass.countDocuments(baseMatch),
      SubjectLiveClass.countDocuments({ ...baseMatch, publishStatus: 'PUBLISHED' }),
      SubjectLiveClass.countDocuments({ ...baseMatch, publishStatus: 'DRAFT' }),
      SubjectLiveClass.countDocuments({ ...baseMatch, publishStatus: 'UNPUBLISHED' })
    ]);

    res.json({
      success: true,
      data: {
        folderId: folder.folderId,
        folderName: folder.folderName,
        category: folder.category,
        liveClassCount: total,
        publishedCount: published,
        draftCount: draft,
        unpublishedCount: unpublished
      }
    });
  } catch (error) {
    console.error('Folder content summary error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
