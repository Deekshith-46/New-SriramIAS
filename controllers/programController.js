const mongoose = require('mongoose');
const Program = require('../models/Program');
const Course = require('../models/Course');
const Center = require('../models/Center');
const {
  ACTIVE_CENTER_FILTER,
  findActiveCenter,
  getCreatedByFromRequest,
  escapeRegex
} = require('../utils/academicHierarchyHelpers');
const { generateProgramId, isValidObjectId } = require('../utils/academicIdGenerator');

const formatProgramListItem = (doc, linkedCourses = 0) => ({
  _id: doc._id,
  programId: doc.programId,
  programName: doc.programName,
  centers: (doc.centers || []).map((c) => ({
    _id: c._id || c,
    centerName: c.centerName || c.name
  })),
  linkedCourses,
  status: doc.status,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt
});

const validateCentersInput = async (centerIds) => {
  if (!Array.isArray(centerIds) || centerIds.length === 0) {
    return { ok: false, message: 'At least one center is required' };
  }

  const unique = [...new Set(centerIds.map(String))];
  for (const id of unique) {
    if (!isValidObjectId(id)) {
      return { ok: false, message: 'Invalid center id in centers array' };
    }
  }

  const centers = await Center.find({
    _id: { $in: unique },
    ...ACTIVE_CENTER_FILTER
  }).select('_id centerName');

  if (centers.length !== unique.length) {
    return { ok: false, message: 'One or more centers are invalid or inactive' };
  }

  return { ok: true, centers: centers.map((c) => c._id) };
};

const buildProgramBaseMatch = ({ center, status }) => {
  const match = {};

  if (status && ['ACTIVE', 'INACTIVE'].includes(status)) {
    match.status = status;
  }

  if (center && isValidObjectId(center)) {
    match.centers = new mongoose.Types.ObjectId(center);
  }

  return match;
};

/**
 * Search rules:
 * - programName: contains term anywhere (e.g. "UPSC" in "2 years UPSC Complete Program")
 * - centerName / centerCode / state: must START with term (avoids "De" matching Hy**de**rabad)
 * - city: starts with term OR word after space (e.g. "Delhi" in "New Delhi")
 */
const buildProgramSearchMatch = (searchTerm) => {
  const term = escapeRegex(String(searchTerm).trim());
  if (!term) return null;

  const centerStartsWith = `^${term}`;
  const cityOrWordStart = `(^|\\s)${term}`;

  return {
    $or: [
      { programName: { $regex: term, $options: 'i' } },
      { 'centerDocs.centerName': { $regex: centerStartsWith, $options: 'i' } },
      { 'centerDocs.name': { $regex: centerStartsWith, $options: 'i' } },
      { 'centerDocs.centerCode': { $regex: centerStartsWith, $options: 'i' } },
      { 'centerDocs.state': { $regex: centerStartsWith, $options: 'i' } },
      { 'centerDocs.city': { $regex: cityOrWordStart, $options: 'i' } }
    ]
  };
};

const buildProgramListPipeline = ({ search = '', center, status, sort, skip, limit }) => {
  const pipeline = [];
  const baseMatch = buildProgramBaseMatch({ center, status });

  if (Object.keys(baseMatch).length) {
    pipeline.push({ $match: baseMatch });
  }

  pipeline.push({
    $lookup: {
      from: 'centers',
      localField: 'centers',
      foreignField: '_id',
      as: 'centerDocs'
    }
  });

  const searchMatch = buildProgramSearchMatch(search);
  if (searchMatch) {
    pipeline.push({ $match: searchMatch });
  }

  pipeline.push({ $sort: sort });

  if (typeof skip === 'number' && skip > 0) {
    pipeline.push({ $skip: skip });
  }
  if (typeof limit === 'number' && limit > 0) {
    pipeline.push({ $limit: limit });
  }

  return pipeline;
};

const buildProgramCountPipeline = ({ search = '', center, status }) => {
  const pipeline = [];
  const baseMatch = buildProgramBaseMatch({ center, status });

  if (Object.keys(baseMatch).length) {
    pipeline.push({ $match: baseMatch });
  }

  pipeline.push({
    $lookup: {
      from: 'centers',
      localField: 'centers',
      foreignField: '_id',
      as: 'centerDocs'
    }
  });

  const searchMatch = buildProgramSearchMatch(search);
  if (searchMatch) {
    pipeline.push({ $match: searchMatch });
  }

  pipeline.push({ $count: 'total' });
  return pipeline;
};

const mapProgramFromAggregation = (doc) => {
  const centers = (doc.centerDocs || []).map((c) => ({
    _id: c._id,
    centerName: c.centerName || c.name
  }));

  return formatProgramListItem({ ...doc, centers });
};

const attachLinkedCourseCounts = async (programs) => {
  if (!programs.length) return [];

  const ids = programs.map((p) => p._id);
  const counts = await Course.aggregate([
    { $match: { program: { $in: ids } } },
    { $group: { _id: '$program', count: { $sum: 1 } } }
  ]);

  const countMap = new Map(counts.map((row) => [String(row._id), row.count]));

  return programs.map((p) => {
    const linkedCourses = countMap.get(String(p._id)) || 0;
    if (p.programId && p.programName && Array.isArray(p.centers)) {
      return { ...p, linkedCourses };
    }
    return formatProgramListItem(p, linkedCourses);
  });
};

exports.createProgram = async (req, res) => {
  try {
    const { programName, centers, status = 'ACTIVE' } = req.body;

    if (!programName?.trim()) {
      return res.status(400).json({ success: false, message: 'Program name is required' });
    }

    const centerCheck = await validateCentersInput(centers);
    if (!centerCheck.ok) {
      return res.status(400).json({ success: false, message: centerCheck.message });
    }

    const program = await Program.create({
      programId: await generateProgramId(),
      programName: programName.trim(),
      centers: centerCheck.centers,
      status: status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
      createdBy: getCreatedByFromRequest(req)
    });

    const populated = await Program.findById(program._id).populate('centers', 'centerName name');

    res.status(201).json({
      success: true,
      message: 'Program created successfully',
      data: formatProgramListItem(populated.toObject(), 0)
    });
  } catch (error) {
    console.error('Create program error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getPrograms = async (req, res) => {
  try {
    const {
      search = '',
      center,
      status,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const sort = {};
    const allowedSort = ['createdAt', 'programName', 'programId', 'status'];
    sort[allowedSort.includes(sortBy) ? sortBy : 'createdAt'] = sortOrder === 'asc' ? 1 : -1;

    const listPipeline = buildProgramListPipeline({
      search,
      center,
      status,
      sort,
      skip,
      limit: limitNum
    });
    const countPipeline = buildProgramCountPipeline({ search, center, status });

    const [programs, countResult] = await Promise.all([
      Program.aggregate(listPipeline),
      Program.aggregate(countPipeline)
    ]);

    const total = countResult[0]?.total ?? 0;
    const data = await attachLinkedCourseCounts(
      programs.map((doc) => mapProgramFromAggregation(doc))
    );

    res.json({
      success: true,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum) || 0,
      count: data.length,
      data
    });
  } catch (error) {
    console.error('Get programs error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getProgramById = async (req, res) => {
  try {
    const program = await Program.findById(req.params.id).populate('centers', 'centerName name centerCode city');

    if (!program) {
      return res.status(404).json({ success: false, message: 'Program not found' });
    }

    const [formatted] = await attachLinkedCourseCounts([program.toObject()]);

    res.json({ success: true, data: formatted });
  } catch (error) {
    console.error('Get program by id error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getProgramsByCenter = async (req, res) => {
  try {
    const { centerId } = req.params;
    const center = await findActiveCenter(centerId);
    if (!center) {
      return res.status(404).json({ success: false, message: 'Center not found' });
    }

    const programs = await Program.find({
      centers: centerId,
      status: 'ACTIVE'
    })
      .select('_id programId programName')
      .sort({ programName: 1 })
      .lean();

    res.json({
      success: true,
      count: programs.length,
      data: programs
    });
  } catch (error) {
    console.error('Get programs by center error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateProgram = async (req, res) => {
  try {
    const program = await Program.findById(req.params.id);
    if (!program) {
      return res.status(404).json({ success: false, message: 'Program not found' });
    }

    if (req.body.programName !== undefined) {
      if (!String(req.body.programName).trim()) {
        return res.status(400).json({ success: false, message: 'Program name cannot be empty' });
      }
      program.programName = String(req.body.programName).trim();
    }

    if (req.body.centers !== undefined) {
      const centerCheck = await validateCentersInput(req.body.centers);
      if (!centerCheck.ok) {
        return res.status(400).json({ success: false, message: centerCheck.message });
      }
      program.centers = centerCheck.centers;
    }

    if (req.body.status !== undefined) {
      if (!['ACTIVE', 'INACTIVE'].includes(req.body.status)) {
        return res.status(400).json({ success: false, message: 'Status must be ACTIVE or INACTIVE' });
      }
      program.status = req.body.status;
    }

    await program.save();
    const populated = await Program.findById(program._id).populate('centers', 'centerName name');
    const [data] = await attachLinkedCourseCounts([populated.toObject()]);

    res.json({
      success: true,
      message: 'Program updated successfully',
      data
    });
  } catch (error) {
    console.error('Update program error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateProgramStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['ACTIVE', 'INACTIVE'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be ACTIVE or INACTIVE' });
    }

    const program = await Program.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('centers', 'centerName name');

    if (!program) {
      return res.status(404).json({ success: false, message: 'Program not found' });
    }

    const [data] = await attachLinkedCourseCounts([program.toObject()]);

    res.json({
      success: true,
      message: 'Program status updated',
      data
    });
  } catch (error) {
    console.error('Update program status error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.deleteProgram = async (req, res) => {
  try {
    const program = await Program.findByIdAndDelete(req.params.id);

    if (!program) {
      return res.status(404).json({ success: false, message: 'Program not found' });
    }

    res.json({
      success: true,
      message: 'Program deleted successfully',
      data: { _id: program._id }
    });
  } catch (error) {
    console.error('Delete program error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
