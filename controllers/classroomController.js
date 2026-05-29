const mongoose = require('mongoose');
const Classroom = require('../models/Classroom');
const { generateClassroomId, isValidObjectId } = require('../utils/contentIdGenerator');
const {
  NOT_DELETED,
  escapeRegex,
  parsePagination,
  parseSort
} = require('../utils/contentMastersHelpers');
const {
  resolveCenterId,
  resolveCityId,
  validateCityBelongsToCenter,
  validateCapacity
} = require('../utils/classroomHelpers');

const formatClassroom = (doc) => ({
  _id: doc._id,
  classroomId: doc.classroomId,
  center: doc.center?._id || doc.center,
  centerName: doc.center?.centerName || doc.center?.name || doc.centerName || '',
  city: doc.city?._id || doc.city,
  cityAddress: doc.city?.cityAddress || doc.cityAddress || '',
  classroomName: doc.classroomName,
  classroomCode: doc.classroomCode,
  capacity: doc.capacity ?? 0,
  status: doc.status,
  usage: doc.usage || { upcoming: 0, totalBookings: 0 },
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt
});

const buildClassroomBaseMatch = ({ center, city, status }) => {
  const match = { ...NOT_DELETED };

  if (status && ['ACTIVE', 'INACTIVE'].includes(status)) {
    match.status = status;
  }
  if (center && isValidObjectId(center)) {
    match.center = new mongoose.Types.ObjectId(center);
  }
  if (city && isValidObjectId(city)) {
    match.city = new mongoose.Types.ObjectId(city);
  }

  return match;
};

const buildClassroomListPipeline = ({ search = '', center, city, status, sort, skip, limit }) => {
  const pipeline = [{ $match: buildClassroomBaseMatch({ center, city, status }) }];

  pipeline.push({
    $lookup: {
      from: 'centers',
      localField: 'center',
      foreignField: '_id',
      as: 'centerDoc'
    }
  });
  pipeline.push({
    $lookup: {
      from: 'cities',
      localField: 'city',
      foreignField: '_id',
      as: 'cityDoc'
    }
  });
  pipeline.push({
    $unwind: { path: '$centerDoc', preserveNullAndEmptyArrays: true }
  });
  pipeline.push({
    $unwind: { path: '$cityDoc', preserveNullAndEmptyArrays: true }
  });

  const trimmed = String(search).trim();
  if (trimmed) {
    const term = escapeRegex(trimmed);
    pipeline.push({
      $match: {
        $or: [
          { classroomName: { $regex: term, $options: 'i' } },
          { classroomCode: { $regex: term, $options: 'i' } },
          { 'centerDoc.centerName': { $regex: term, $options: 'i' } },
          { 'centerDoc.name': { $regex: term, $options: 'i' } },
          { 'cityDoc.cityAddress': { $regex: term, $options: 'i' } }
        ]
      }
    });
  }

  const countPipeline = [...pipeline, { $count: 'total' }];

  pipeline.push({ $sort: sort });
  if (typeof skip === 'number' && skip > 0) pipeline.push({ $skip: skip });
  if (typeof limit === 'number' && limit > 0) pipeline.push({ $limit: limit });

  pipeline.push({
    $project: {
      _id: 1,
      classroomId: 1,
      center: 1,
      city: 1,
      classroomName: 1,
      classroomCode: 1,
      capacity: 1,
      status: 1,
      createdAt: 1,
      updatedAt: 1,
      centerName: { $ifNull: ['$centerDoc.centerName', '$centerDoc.name'] },
      cityAddress: '$cityDoc.cityAddress',
      usage: { upcoming: { $literal: 0 }, totalBookings: { $literal: 0 } }
    }
  });

  return { dataPipeline: pipeline, countPipeline };
};

exports.getClassroomsDropdown = async (req, res) => {
  try {
    const { centerId, city, status = 'ACTIVE' } = req.query;
    const query = buildClassroomBaseMatch({
      center: centerId,
      city,
      status: status || 'ACTIVE'
    });

    const rows = await Classroom.find(query)
      .select('_id classroomId classroomName classroomCode center capacity')
      .sort({ classroomName: 1 })
      .lean();

    res.json({
      success: true,
      count: rows.length,
      data: rows.map((row) => ({
        _id: row._id,
        classroomId: row.classroomId || '',
        classroomName: row.classroomName || '',
        classroomCode: row.classroomCode || '',
        centerId: row.center,
        capacity: row.capacity ?? 0
      }))
    });
  } catch (error) {
    console.error('Classrooms dropdown error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.createClassroom = async (req, res) => {
  try {
    const centerId = resolveCenterId(req.body);
    const cityId = resolveCityId(req.body);
    const { classroomName, classroomCode, status = 'ACTIVE' } = req.body;

    if (!centerId || !cityId) {
      return res.status(400).json({
        success: false,
        message: 'center and city are required'
      });
    }
    if (!classroomName?.trim()) {
      return res.status(400).json({ success: false, message: 'classroomName is required' });
    }
    if (!classroomCode?.trim()) {
      return res.status(400).json({ success: false, message: 'classroomCode is required' });
    }

    const chain = await validateCityBelongsToCenter(centerId, cityId);
    if (!chain.ok) {
      return res.status(400).json({ success: false, message: chain.message });
    }

    const cap = validateCapacity(req.body.capacity);
    if (!cap.ok) {
      return res.status(400).json({ success: false, message: cap.message });
    }

    const classroom = await Classroom.create({
      classroomId: await generateClassroomId(),
      center: chain.center._id,
      city: chain.city._id,
      classroomName: classroomName.trim(),
      classroomCode: classroomCode.trim().toUpperCase(),
      capacity: cap.value,
      status: status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE'
    });

    const populated = await Classroom.findById(classroom._id)
      .populate('center', 'centerName name centerCode')
      .populate('city', 'cityAddress')
      .lean();

    res.status(201).json({
      success: true,
      message: 'Classroom created successfully',
      data: formatClassroom(populated)
    });
  } catch (error) {
    console.error('Create classroom error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'classroomCode already exists'
      });
    }
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getClassrooms = async (req, res) => {
  try {
    const { search = '', center, city, status, sortBy = 'createdAt', sortOrder = 'desc' } =
      req.query;
    const { page, limit, skip } = parsePagination(req.query);

    let sortStage = parseSort(
      { sortBy, sortOrder },
      ['createdAt', 'classroomName', 'classroomCode', 'capacity', 'status'],
      'createdAt'
    );
    if (sortBy === 'centerName') {
      sortStage = { centerName: sortOrder === 'asc' ? 1 : -1 };
    } else if (sortBy === 'cityAddress') {
      sortStage = { cityAddress: sortOrder === 'asc' ? 1 : -1 };
    }

    const { dataPipeline, countPipeline } = buildClassroomListPipeline({
      search,
      center,
      city,
      status,
      sort: sortStage,
      skip,
      limit
    });

    const [rows, countResult] = await Promise.all([
      Classroom.aggregate(dataPipeline),
      Classroom.aggregate(countPipeline)
    ]);

    const total = countResult[0]?.total || 0;

    res.json({
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 0,
      count: rows.length,
      data: rows.map((row) => formatClassroom(row))
    });
  } catch (error) {
    console.error('Get classrooms error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getClassroomById = async (req, res) => {
  try {
    const classroom = await Classroom.findOne({ _id: req.params.id, ...NOT_DELETED })
      .populate('center', 'centerName name centerCode city state')
      .populate('city', 'cityAddress status')
      .lean();

    if (!classroom) {
      return res.status(404).json({ success: false, message: 'Classroom not found' });
    }

    res.json({
      success: true,
      data: formatClassroom({ ...classroom, usage: { upcoming: 0, totalBookings: 0 } })
    });
  } catch (error) {
    console.error('Get classroom by id error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateClassroom = async (req, res) => {
  try {
    const classroom = await Classroom.findOne({ _id: req.params.id, ...NOT_DELETED });
    if (!classroom) {
      return res.status(404).json({ success: false, message: 'Classroom not found' });
    }

    const nextCenter = resolveCenterId(req.body) || String(classroom.center);
    const nextCity = resolveCityId(req.body) || String(classroom.city);

    if (
      req.body.center !== undefined ||
      req.body.centerId !== undefined ||
      req.body.city !== undefined ||
      req.body.cityId !== undefined
    ) {
      const chain = await validateCityBelongsToCenter(nextCenter, nextCity);
      if (!chain.ok) {
        return res.status(400).json({ success: false, message: chain.message });
      }
      classroom.center = chain.center._id;
      classroom.city = chain.city._id;
    }

    if (req.body.classroomName !== undefined) {
      if (!String(req.body.classroomName).trim()) {
        return res.status(400).json({ success: false, message: 'classroomName cannot be empty' });
      }
      classroom.classroomName = String(req.body.classroomName).trim();
    }

    if (req.body.classroomCode !== undefined) {
      if (!String(req.body.classroomCode).trim()) {
        return res.status(400).json({ success: false, message: 'classroomCode cannot be empty' });
      }
      classroom.classroomCode = String(req.body.classroomCode).trim().toUpperCase();
    }

    if (req.body.capacity !== undefined) {
      const cap = validateCapacity(req.body.capacity);
      if (!cap.ok) {
        return res.status(400).json({ success: false, message: cap.message });
      }
      classroom.capacity = cap.value;
    }

    if (req.body.status !== undefined) {
      if (!['ACTIVE', 'INACTIVE'].includes(req.body.status)) {
        return res.status(400).json({ success: false, message: 'Status must be ACTIVE or INACTIVE' });
      }
      classroom.status = req.body.status;
    }

    await classroom.save();

    const populated = await Classroom.findById(classroom._id)
      .populate('center', 'centerName name centerCode')
      .populate('city', 'cityAddress')
      .lean();

    res.json({
      success: true,
      message: 'Classroom updated successfully',
      data: formatClassroom(populated)
    });
  } catch (error) {
    console.error('Update classroom error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'classroomCode already exists'
      });
    }
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateClassroomStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['ACTIVE', 'INACTIVE'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be ACTIVE or INACTIVE' });
    }

    const classroom = await Classroom.findOneAndUpdate(
      { _id: req.params.id, ...NOT_DELETED },
      { status },
      { new: true }
    )
      .populate('center', 'centerName name')
      .populate('city', 'cityAddress')
      .lean();

    if (!classroom) {
      return res.status(404).json({ success: false, message: 'Classroom not found' });
    }

    res.json({
      success: true,
      message: 'Classroom status updated',
      data: formatClassroom(classroom)
    });
  } catch (error) {
    console.error('Update classroom status error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.deleteClassroom = async (req, res) => {
  try {
    const classroom = await Classroom.findOne({ _id: req.params.id, ...NOT_DELETED });
    if (!classroom) {
      return res.status(404).json({ success: false, message: 'Classroom not found' });
    }

    classroom.isDeleted = true;
    classroom.deletedAt = new Date();
    classroom.status = 'INACTIVE';
    await classroom.save();

    res.json({
      success: true,
      message: 'Classroom deleted successfully',
      data: { _id: classroom._id }
    });
  } catch (error) {
    console.error('Delete classroom error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
