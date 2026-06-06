const mongoose = require('mongoose');
const SubjectPdf = require('../models/SubjectPdf');
const SubjectContentFolder = require('../models/SubjectContentFolder');
const FacultySubject = require('../models/FacultySubject');
const Batch = require('../models/Batch');
const cloudinary = require('../config/cloudinary');
const uploadToCloudinary = require('../utils/uploadToCloudinary');
const { generateSubjectPdfId, isValidObjectId } = require('../utils/contentIdGenerator');
const { NOT_DELETED, escapeRegex, parsePagination, parseSort } = require('../utils/contentMastersHelpers');
const {
  validateSubjectPdfPayload,
  PDF_VISIBILITY_STATUSES
} = require('../utils/facultyContentHelpers');
const { sendValidationError, sendNotFound, fail } = require('../utils/cmsApiErrors');

const formatSubjectPdf = (doc) => ({
  _id: doc._id,
  subjectPdfId: doc.subjectPdfId,
  facultySubjectId: doc.facultySubjectId,
  folderId: doc.folderId,
  batchId: doc.batchId,
  pdfTitle: doc.pdfTitle,
  tags: doc.tags || [],
  visibility: doc.visibility,
  pdf: doc.pdf,
  description: doc.description || '',
  viewCount: doc.viewCount ?? 0,
  folderName: doc.folderName || doc.folder?.folderName || '',
  facultySubjectName: doc.facultySubjectName || doc.facultySubject?.subjectName || '',
  batchName: doc.batchName || doc.batch?.batchName || '',
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt
});

const buildListPipeline = ({
  facultySubjectId,
  folderId,
  visibility,
  batchId,
  search = '',
  sort,
  skip,
  limit
}) => {
  const match = { isDeleted: false };

  if (facultySubjectId && isValidObjectId(facultySubjectId)) {
    match.facultySubjectId = new mongoose.Types.ObjectId(facultySubjectId);
  }
  if (folderId && isValidObjectId(folderId)) {
    match.folderId = new mongoose.Types.ObjectId(folderId);
  }
  if (visibility && PDF_VISIBILITY_STATUSES.includes(visibility)) {
    match.visibility = visibility;
  }
  if (batchId && isValidObjectId(batchId)) {
    match.batchId = new mongoose.Types.ObjectId(batchId);
  }

  const pipeline = [{ $match: match }];

  pipeline.push(
    {
      $lookup: {
        from: 'subjectcontentfolders',
        localField: 'folderId',
        foreignField: '_id',
        as: 'folderDoc'
      }
    },
    {
      $lookup: {
        from: 'facultysubjects',
        localField: 'facultySubjectId',
        foreignField: '_id',
        as: 'facultySubjectDoc'
      }
    },
    {
      $lookup: {
        from: 'batches',
        localField: 'batchId',
        foreignField: '_id',
        as: 'batchDoc'
      }
    },
    { $unwind: { path: '$folderDoc', preserveNullAndEmptyArrays: true } },
    { $unwind: { path: '$facultySubjectDoc', preserveNullAndEmptyArrays: true } },
    { $unwind: { path: '$batchDoc', preserveNullAndEmptyArrays: true } }
  );

  const trimmed = String(search).trim();
  if (trimmed) {
    const term = escapeRegex(trimmed);
    pipeline.push({
      $match: {
        $or: [
          { pdfTitle: { $regex: term, $options: 'i' } },
          { 'folderDoc.folderName': { $regex: term, $options: 'i' } },
          { 'facultySubjectDoc.subjectName': { $regex: term, $options: 'i' } },
          { 'batchDoc.batchName': { $regex: term, $options: 'i' } }
        ]
      }
    });
  }

  pipeline.push({
    $facet: {
      rows: [
        { $sort: sort },
        { $skip: skip },
        { $limit: limit },
        {
          $project: {
            _id: 1,
            subjectPdfId: 1,
            facultySubjectId: 1,
            folderId: 1,
            batchId: 1,
            pdfTitle: 1,
            tags: 1,
            visibility: 1,
            pdf: 1,
            description: 1,
            viewCount: 1,
            createdAt: 1,
            updatedAt: 1,
            folderName: '$folderDoc.folderName',
            facultySubjectName: '$facultySubjectDoc.subjectName',
            batchName: '$batchDoc.batchName'
          }
        }
      ],
      total: [{ $count: 'count' }]
    }
  });

  return pipeline;
};

const deletePdfFromCloudinary = async (publicId) => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
  } catch (err) {
    console.error('Cloudinary delete subject PDF error:', err.message);
  }
};

exports.createSubjectPdf = async (req, res) => {
  try {
    if (!req.file) {
      return sendValidationError(
        res,
        fail({
          code: 'PDF_FILE_REQUIRED',
          field: 'pdf',
          message: 'Upload PDF is required',
          suggestions: ['Multipart field name must be "pdf". PDF only, max 10 MB.']
        })
      );
    }

    const validation = await validateSubjectPdfPayload(req.body);
    if (!validation.ok) {
      return sendValidationError(res, validation);
    }

    const uploaded = await uploadToCloudinary(
      req.file,
      'faculty-subject/pdfs',
      'raw',
      'pdf'
    );

    const doc = await SubjectPdf.create({
      subjectPdfId: await generateSubjectPdfId(),
      facultySubjectId: validation.facultySubject._id,
      folderId: validation.folder._id,
      batchId: req.body.batchId,
      pdfTitle: String(req.body.pdfTitle).trim(),
      tags: validation.tags,
      visibility: validation.visibility,
      pdf: {
        url: uploaded.url,
        publicId: uploaded.public_id,
        format: uploaded.format || 'pdf',
        bytes: uploaded.bytes || 0
      },
      description:
        validation.description !== undefined
          ? validation.description
          : String(req.body.description || '').trim(),
      createdBy: req.user?._id || null,
      updatedBy: req.user?._id || null
    });

    res.status(201).json({
      success: true,
      message: 'PDF created successfully',
      data: formatSubjectPdf(doc.toObject())
    });
  } catch (error) {
    console.error('Create subject PDF error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getSubjectPdfs = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const sort = parseSort(req.query, ['createdAt', 'pdfTitle', 'subjectPdfId', 'viewCount']);

    const pipeline = buildListPipeline({
      facultySubjectId: req.query.facultySubjectId,
      folderId: req.query.folderId,
      visibility: req.query.visibility
        ? String(req.query.visibility).trim().toUpperCase()
        : undefined,
      batchId: req.query.batchId,
      search: req.query.search ?? '',
      sort,
      skip,
      limit
    });

    const [result] = await SubjectPdf.aggregate(pipeline);
    const rows = result?.rows || [];
    const total = result?.total?.[0]?.count || 0;

    res.json({
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 0,
      count: rows.length,
      data: rows.map((row) => formatSubjectPdf({ ...row, _id: row._id }))
    });
  } catch (error) {
    console.error('List subject PDFs error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getSubjectPdfById = async (req, res) => {
  try {
    const doc = await SubjectPdf.findOne({ _id: req.params.id, ...NOT_DELETED }).lean();
    if (!doc) {
      return sendNotFound(res, {
        code: 'SUBJECT_PDF_NOT_FOUND',
        message: 'PDF not found',
        reason: 'No active PDF exists for this id.'
      });
    }

    const [folder, facultySubject, batch] = await Promise.all([
      SubjectContentFolder.findById(doc.folderId).select('folderName').lean(),
      FacultySubject.findById(doc.facultySubjectId).select('subjectName').lean(),
      Batch.findById(doc.batchId).select('batchId batchName').lean()
    ]);

    res.json({
      success: true,
      data: formatSubjectPdf({
        ...doc,
        folderName: folder?.folderName,
        facultySubjectName: facultySubject?.subjectName,
        batchName: batch?.batchName
      })
    });
  } catch (error) {
    console.error('Get subject PDF error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateSubjectPdf = async (req, res) => {
  try {
    const existing = await SubjectPdf.findOne({ _id: req.params.id, ...NOT_DELETED });
    if (!existing) {
      return sendNotFound(res, {
        code: 'SUBJECT_PDF_NOT_FOUND',
        message: 'PDF not found'
      });
    }

    const merged = {
      facultySubjectId: req.body.facultySubjectId ?? existing.facultySubjectId,
      folderId: req.body.folderId ?? existing.folderId,
      batchId: req.body.batchId ?? existing.batchId,
      pdfTitle: req.body.pdfTitle ?? existing.pdfTitle,
      visibility: req.body.visibility ?? existing.visibility,
      tags: req.body.tags !== undefined ? req.body.tags : existing.tags,
      description: req.body.description !== undefined ? req.body.description : existing.description
    };

    const validation = await validateSubjectPdfPayload(merged, { partial: true });
    if (!validation.ok) {
      return sendValidationError(res, validation);
    }

    if (req.body.pdfTitle !== undefined) existing.pdfTitle = String(req.body.pdfTitle).trim();
    if (req.body.batchId !== undefined) existing.batchId = req.body.batchId;
    if (req.body.folderId !== undefined) existing.folderId = validation.folder._id;
    if (req.body.facultySubjectId !== undefined) {
      existing.facultySubjectId = validation.facultySubject._id;
    }
    if (req.body.visibility !== undefined) existing.visibility = validation.visibility;
    if (req.body.tags !== undefined) existing.tags = validation.tags;
    if (req.body.description !== undefined) {
      existing.description = String(req.body.description || '').trim();
    }

    if (req.file) {
      const uploaded = await uploadToCloudinary(
        req.file,
        'faculty-subject/pdfs',
        'raw',
        'pdf'
      );
      const oldPublicId = existing.pdf?.publicId;
      existing.pdf = {
        url: uploaded.url,
        publicId: uploaded.public_id,
        format: uploaded.format || 'pdf',
        bytes: uploaded.bytes || 0
      };
      if (oldPublicId) await deletePdfFromCloudinary(oldPublicId);
    }

    existing.updatedBy = req.user?._id || null;
    await existing.save();

    res.json({
      success: true,
      message: 'PDF updated successfully',
      data: formatSubjectPdf(existing.toObject())
    });
  } catch (error) {
    console.error('Update subject PDF error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateSubjectPdfVisibility = async (req, res) => {
  try {
    const visibility = String(req.body.visibility || '').trim().toUpperCase();
    if (!PDF_VISIBILITY_STATUSES.includes(visibility)) {
      return sendValidationError(
        res,
        fail({
          code: 'INVALID_VISIBILITY',
          field: 'visibility',
          message: `visibility must be one of: ${PDF_VISIBILITY_STATUSES.join(', ')}`
        })
      );
    }

    const doc = await SubjectPdf.findOneAndUpdate(
      { _id: req.params.id, ...NOT_DELETED },
      { visibility, updatedBy: req.user?._id || null },
      { new: true }
    ).lean();

    if (!doc) {
      return sendNotFound(res, {
        code: 'SUBJECT_PDF_NOT_FOUND',
        message: 'PDF not found'
      });
    }

    res.json({
      success: true,
      message: `PDF visibility set to ${visibility}`,
      data: formatSubjectPdf(doc)
    });
  } catch (error) {
    console.error('Update subject PDF visibility error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.downloadSubjectPdf = async (req, res) => {
  try {
    const doc = await SubjectPdf.findOneAndUpdate(
      { _id: req.params.id, ...NOT_DELETED },
      { $inc: { viewCount: 1 } },
      { new: true }
    ).lean();

    if (!doc) {
      return sendNotFound(res, {
        code: 'SUBJECT_PDF_NOT_FOUND',
        message: 'PDF not found'
      });
    }

    res.json({
      success: true,
      data: {
        subjectPdfId: doc.subjectPdfId,
        pdfTitle: doc.pdfTitle,
        pdfUrl: doc.pdf?.url,
        viewCount: doc.viewCount
      }
    });
  } catch (error) {
    console.error('Download subject PDF error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getSubjectPdfDashboardSummary = async (req, res) => {
  try {
    const match = { ...NOT_DELETED };
    const { facultySubjectId, folderId, batchId } = req.query;

    if (facultySubjectId && isValidObjectId(facultySubjectId)) {
      match.facultySubjectId = new mongoose.Types.ObjectId(facultySubjectId);
    }
    if (folderId && isValidObjectId(folderId)) {
      match.folderId = new mongoose.Types.ObjectId(folderId);
    }
    if (batchId && isValidObjectId(batchId)) {
      match.batchId = new mongoose.Types.ObjectId(batchId);
    }

    const counts = await Promise.all(
      PDF_VISIBILITY_STATUSES.map((status) =>
        SubjectPdf.countDocuments({ ...match, visibility: status })
      )
    );

    const totalPdfs = counts.reduce((a, b) => a + b, 0);
    const totalViews = await SubjectPdf.aggregate([
      { $match: match },
      { $group: { _id: null, views: { $sum: '$viewCount' } } }
    ]);

    const summary = {
      totalPdfs,
      totalViews: totalViews[0]?.views || 0
    };

    PDF_VISIBILITY_STATUSES.forEach((status, index) => {
      const key =
        status === 'VISIBILITY'
          ? 'visibilityCount'
          : `${status.charAt(0)}${status.slice(1).toLowerCase()}Count`;
      summary[key] = counts[index];
    });

    res.json({ success: true, data: summary });
  } catch (error) {
    console.error('Subject PDF dashboard summary error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const PDF_DEPENDENCY_FLOW = [
  { step: 1, field: 'facultySubjectId', api: 'GET /api/faculty-subjects/dropdown?category=PDF' },
  {
    step: 2,
    field: 'folderId',
    api: 'GET /api/folders?facultySubjectId={facultySubjectId}&category=PDF'
  },
  { step: 3, field: 'batchId', api: 'GET /api/batches/dropdown?facultySubjectId={facultySubjectId}' },
  { step: 4, field: 'create', api: 'POST /api/subject-pdfs (multipart pdf file)' }
];

exports.getSubjectPdfCreateForm = async (req, res) => {
  try {
    const { facultySubjectId, folderId } = req.query;

    const data = {
      defaults: {
        visibility: 'DRAFT',
        tags: []
      },
      enums: {
        visibility: PDF_VISIBILITY_STATUSES,
        visibilityLabels: [
          { value: 'VISIBILITY', label: 'Visibility' },
          { value: 'PUBLISHED', label: 'Published' },
          { value: 'DRAFT', label: 'Draft' },
          { value: 'PRIVATE', label: 'Private' }
        ]
      },
      allowedUpload: {
        fieldName: 'pdf',
        maxBytes: 10 * 1024 * 1024,
        mimeTypes: ['application/pdf']
      },
      dependencyFlow: PDF_DEPENDENCY_FLOW,
      dropdownApis: {
        facultySubjects: '/api/faculty-subjects/dropdown?category=PDF',
        folders: '/api/folders?facultySubjectId={facultySubjectId}&category=PDF',
        batches: '/api/batches/dropdown?facultySubjectId={facultySubjectId}'
      },
      folders: [],
      batches: []
    };

    if (facultySubjectId && isValidObjectId(facultySubjectId)) {
      const facultySubject = await FacultySubject.findOne({
        _id: facultySubjectId,
        status: 'ACTIVE',
        categories: { $in: ['PDF'] },
        ...NOT_DELETED
      })
        .select('_id facultySubjectId subjectName categories')
        .lean();

      if (!facultySubject) {
        return res.status(400).json({
          success: false,
          message: 'Invalid faculty subject or PDF category not enabled'
        });
      }

      const [folders, batches] = await Promise.all([
        SubjectContentFolder.find({
          facultySubjectId,
          category: 'PDF',
          status: 'ACTIVE',
          ...NOT_DELETED
        })
          .select('_id folderId folderName')
          .sort({ folderName: 1 })
          .lean(),
        Batch.find({
          facultySubjects: facultySubjectId,
          status: { $in: ['ACTIVE', 'UPCOMING'] },
          ...NOT_DELETED
        })
          .select('_id batchId batchName')
          .sort({ batchName: 1 })
          .lean()
      ]);

      data.facultySubject = {
        _id: facultySubject._id,
        facultySubjectId: facultySubject.facultySubjectId,
        subjectName: facultySubject.subjectName
      };
      data.folders = folders.map((f) => ({
        _id: f._id,
        folderId: f.folderId,
        folderName: f.folderName
      }));
      data.batches = batches.map((b) => ({
        _id: b._id,
        batchId: b.batchId,
        batchName: b.batchName
      }));
    }

    if (folderId && isValidObjectId(folderId)) {
      const folder = await SubjectContentFolder.findOne({
        _id: folderId,
        category: 'PDF',
        ...NOT_DELETED
      })
        .select('_id folderId folderName facultySubjectId')
        .lean();
      data.selectedFolder = folder || null;
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Subject PDF create form error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.deleteSubjectPdf = async (req, res) => {
  try {
    const doc = await SubjectPdf.findOne({ _id: req.params.id, ...NOT_DELETED });
    if (!doc) {
      return sendNotFound(res, {
        code: 'SUBJECT_PDF_NOT_FOUND',
        message: 'PDF not found'
      });
    }

    if (doc.pdf?.publicId) {
      await deletePdfFromCloudinary(doc.pdf.publicId);
    }

    doc.isDeleted = true;
    doc.deletedAt = new Date();
    doc.updatedBy = req.user?._id || null;
    await doc.save();

    res.json({
      success: true,
      message: 'PDF deleted successfully',
      data: { _id: doc._id }
    });
  } catch (error) {
    console.error('Delete subject PDF error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
