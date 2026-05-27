const mongoose = require('mongoose');
const City = require('../models/City');
const { isValidObjectId } = require('../utils/courseIdGenerator');
const { findActiveCenter } = require('../utils/academicHierarchyHelpers');
const {
  NOT_DELETED,
  escapeRegex,
  parsePagination,
  parseSort
} = require('../utils/contentMastersHelpers');

const resolveCityAddress = (body) => {
  const raw = body.cityAddress ?? body.cityaddress ?? body.city_address;
  return raw !== undefined ? String(raw).trim() : '';
};

const formatCity = (doc) => ({
  _id: doc._id,
  centerId: doc.centerId?._id || doc.centerId,
  centerName: doc.centerId?.centerName || doc.centerId?.name || doc.centerName || '',
  cityAddress: doc.cityAddress,
  status: doc.status,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt
});

const buildCityBaseMatch = ({ center, status }) => {
  const match = { ...NOT_DELETED };

  if (status && ['ACTIVE', 'INACTIVE'].includes(status)) {
    match.status = status;
  }

  const centerRef = center || undefined;
  if (centerRef && isValidObjectId(centerRef)) {
    match.centerId = new mongoose.Types.ObjectId(centerRef);
  }

  return match;
};

const buildCityListPipeline = ({ search = '', center, status, sort, skip, limit }) => {
  const pipeline = [{ $match: buildCityBaseMatch({ center, status }) }];

  pipeline.push({
    $lookup: {
      from: 'centers',
      localField: 'centerId',
      foreignField: '_id',
      as: 'centerDoc'
    }
  });

  pipeline.push({
    $unwind: { path: '$centerDoc', preserveNullAndEmptyArrays: true }
  });

  const trimmed = String(search).trim();
  if (trimmed) {
    const term = escapeRegex(trimmed);
    pipeline.push({
      $match: {
        $or: [
          { cityAddress: { $regex: term, $options: 'i' } },
          { 'centerDoc.centerName': { $regex: term, $options: 'i' } },
          { 'centerDoc.name': { $regex: term, $options: 'i' } }
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
      centerId: 1,
      cityAddress: 1,
      status: 1,
      createdAt: 1,
      updatedAt: 1,
      centerName: {
        $ifNull: ['$centerDoc.centerName', '$centerDoc.name']
      }
    }
  });

  return { dataPipeline: pipeline, countPipeline };
};

exports.createCity = async (req, res) => {
  try {
    const { centerId, status = 'ACTIVE' } = req.body;
    const cityAddress = resolveCityAddress(req.body);

    if (!centerId) {
      return res.status(400).json({ success: false, message: 'centerId is required' });
    }
    if (!cityAddress) {
      return res.status(400).json({ success: false, message: 'cityAddress is required' });
    }

    const center = await findActiveCenter(centerId);
    if (!center) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or inactive center'
      });
    }

    const city = await City.create({
      centerId: center._id,
      cityAddress,
      status: status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE'
    });

    const populated = await City.findById(city._id)
      .populate('centerId', 'centerName name centerCode city state')
      .lean();

    res.status(201).json({
      success: true,
      message: 'City created successfully',
      data: formatCity(populated)
    });
  } catch (error) {
    console.error('Create city error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getCities = async (req, res) => {
  try {
    const { search = '', center, status, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const { page, limit, skip } = parsePagination(req.query);

    let sortStage = parseSort({ sortBy, sortOrder }, ['createdAt', 'cityAddress', 'status'], 'createdAt');
    if (sortBy === 'centerName') {
      sortStage = { centerName: sortOrder === 'asc' ? 1 : -1 };
    }

    const { dataPipeline, countPipeline } = buildCityListPipeline({
      search,
      center,
      status,
      sort: sortStage,
      skip,
      limit
    });

    const [rows, countResult] = await Promise.all([
      City.aggregate(dataPipeline),
      City.aggregate(countPipeline)
    ]);

    const total = countResult[0]?.total || 0;

    res.json({
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 0,
      count: rows.length,
      data: rows.map((row) => formatCity(row))
    });
  } catch (error) {
    console.error('Get cities error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/** Dependent dropdown: cities for a center (Center → City → Classroom) */
exports.getCitiesByCenter = async (req, res) => {
  try {
    const centerId = req.params.centerId;

    const center = await findActiveCenter(centerId);
    if (!center) {
      return res.status(400).json({ success: false, message: 'Invalid or inactive center' });
    }

    const cities = await City.find({
      centerId: center._id,
      status: 'ACTIVE',
      ...NOT_DELETED
    })
      .select('_id cityAddress centerId')
      .sort({ cityAddress: 1 })
      .lean();

    res.json({
      success: true,
      count: cities.length,
      data: cities.map((c) => ({
        _id: c._id,
        centerId: c.centerId,
        cityAddress: c.cityAddress,
        /** Alias for UI labels when a short place name is derived from address */
        cityName: c.cityAddress
      }))
    });
  } catch (error) {
    console.error('Cities by center error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getCityById = async (req, res) => {
  try {
    const city = await City.findOne({ _id: req.params.id, ...NOT_DELETED })
      .populate('centerId', 'centerName name centerCode city state status')
      .lean();

    if (!city) {
      return res.status(404).json({ success: false, message: 'City not found' });
    }

    res.json({ success: true, data: formatCity(city) });
  } catch (error) {
    console.error('Get city by id error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateCity = async (req, res) => {
  try {
    const city = await City.findOne({ _id: req.params.id, ...NOT_DELETED });
    if (!city) {
      return res.status(404).json({ success: false, message: 'City not found' });
    }

    if (req.body.centerId !== undefined) {
      const center = await findActiveCenter(req.body.centerId);
      if (!center) {
        return res.status(400).json({ success: false, message: 'Invalid or inactive center' });
      }
      city.centerId = center._id;
    }

    if (req.body.cityAddress !== undefined || req.body.cityaddress !== undefined) {
      const cityAddress = resolveCityAddress(req.body);
      if (!cityAddress) {
        return res.status(400).json({ success: false, message: 'cityAddress cannot be empty' });
      }
      city.cityAddress = cityAddress;
    }

    if (req.body.status !== undefined) {
      if (!['ACTIVE', 'INACTIVE'].includes(req.body.status)) {
        return res.status(400).json({ success: false, message: 'Status must be ACTIVE or INACTIVE' });
      }
      city.status = req.body.status;
    }

    await city.save();

    const populated = await City.findById(city._id)
      .populate('centerId', 'centerName name centerCode city state')
      .lean();

    res.json({
      success: true,
      message: 'City updated successfully',
      data: formatCity(populated)
    });
  } catch (error) {
    console.error('Update city error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateCityStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['ACTIVE', 'INACTIVE'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be ACTIVE or INACTIVE' });
    }

    const city = await City.findOneAndUpdate(
      { _id: req.params.id, ...NOT_DELETED },
      { status },
      { new: true }
    )
      .populate('centerId', 'centerName name centerCode')
      .lean();

    if (!city) {
      return res.status(404).json({ success: false, message: 'City not found' });
    }

    res.json({
      success: true,
      message: 'City status updated',
      data: formatCity(city)
    });
  } catch (error) {
    console.error('Update city status error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.deleteCity = async (req, res) => {
  try {
    const city = await City.findOne({ _id: req.params.id, ...NOT_DELETED });
    if (!city) {
      return res.status(404).json({ success: false, message: 'City not found' });
    }

    city.isDeleted = true;
    city.deletedAt = new Date();
    city.status = 'INACTIVE';
    await city.save();

    res.json({
      success: true,
      message: 'City deleted successfully',
      data: { _id: city._id }
    });
  } catch (error) {
    console.error('Delete city error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
