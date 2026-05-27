const mongoose = require('mongoose');
const Topic = require('../models/Topic');
const { generateTopicId, isValidObjectId } = require('../utils/contentIdGenerator');
const {
  NOT_DELETED,
  escapeRegex,
  parsePagination,
  parseSort,
  findActiveSubject
} = require('../utils/contentMastersHelpers');

const formatTopic = (doc) => ({
  _id: doc._id,
  topicId: doc.topicId,
  topicName: doc.topicName,
  description: doc.description || '',
  subject: doc.subject?._id || doc.subject,
  subjectId: doc.subject?.subjectId,
  subjectName: doc.subject?.subjectName,
  status: doc.status,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt
});

const buildTopicListQuery = ({ search = '', status, subject }) => {
  const query = { ...NOT_DELETED };

  if (status && ['ACTIVE', 'INACTIVE'].includes(status)) {
    query.status = status;
  }

  if (subject && isValidObjectId(subject)) {
    query.subject = new mongoose.Types.ObjectId(subject);
  }

  const trimmed = String(search).trim();
  if (trimmed) {
    const regex = new RegExp(escapeRegex(trimmed), 'i');
    query.$or = [{ topicName: regex }, { topicId: regex }];
  }

  return query;
};

exports.createTopic = async (req, res) => {
  try {
    const { subjectId, subject: subjectRef, topicName, description = '', status = 'ACTIVE' } =
      req.body;
    const resolvedSubjectId = subjectId || subjectRef;

    if (!topicName?.trim()) {
      return res.status(400).json({ success: false, message: 'topicName is required' });
    }

    const subject = await findActiveSubject(resolvedSubjectId);
    if (!subject) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or inactive subject'
      });
    }

    const topic = await Topic.create({
      topicId: await generateTopicId(),
      subject: subject._id,
      topicName: topicName.trim(),
      description: String(description || '').trim(),
      status: status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE'
    });

    const populated = await Topic.findById(topic._id)
      .populate('subject', 'subjectId subjectName')
      .lean();

    res.status(201).json({
      success: true,
      message: 'Topic created successfully',
      data: formatTopic(populated)
    });
  } catch (error) {
    console.error('Create topic error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Topic name already exists for this subject'
      });
    }
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getTopics = async (req, res) => {
  try {
    const query = buildTopicListQuery(req.query);
    const { page, limit, skip } = parsePagination(req.query);
    const sort = parseSort(req.query, ['createdAt', 'topicName', 'topicId', 'status']);

    const [topics, total] = await Promise.all([
      Topic.find(query)
        .populate('subject', 'subjectId subjectName')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Topic.countDocuments(query)
    ]);

    res.json({
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 0,
      count: topics.length,
      data: topics.map((t) => formatTopic(t))
    });
  } catch (error) {
    console.error('Get topics error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getTopicsBySubject = async (req, res) => {
  try {
    const subjectId = req.params.subjectId || req.query.subjectId;

    const subject = await findActiveSubject(subjectId);
    if (!subject) {
      return res.status(400).json({ success: false, message: 'Invalid or inactive subject' });
    }

    const topics = await Topic.find({
      subject: subject._id,
      status: 'ACTIVE',
      ...NOT_DELETED
    })
      .select('_id topicId topicName')
      .sort({ topicName: 1 })
      .lean();

    res.json({ success: true, count: topics.length, data: topics });
  } catch (error) {
    console.error('Topics by subject error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getTopicById = async (req, res) => {
  try {
    const topic = await Topic.findOne({ _id: req.params.id, ...NOT_DELETED })
      .populate('subject', 'subjectId subjectName')
      .lean();

    if (!topic) {
      return res.status(404).json({ success: false, message: 'Topic not found' });
    }

    res.json({ success: true, data: formatTopic(topic) });
  } catch (error) {
    console.error('Get topic by id error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateTopic = async (req, res) => {
  try {
    const topic = await Topic.findOne({ _id: req.params.id, ...NOT_DELETED });
    if (!topic) {
      return res.status(404).json({ success: false, message: 'Topic not found' });
    }

    if (req.body.subjectId !== undefined || req.body.subject !== undefined) {
      const subject = await findActiveSubject(req.body.subjectId || req.body.subject);
      if (!subject) {
        return res.status(400).json({ success: false, message: 'Invalid or inactive subject' });
      }
      topic.subject = subject._id;
    }

    if (req.body.topicName !== undefined) {
      if (!String(req.body.topicName).trim()) {
        return res.status(400).json({ success: false, message: 'topicName cannot be empty' });
      }
      topic.topicName = String(req.body.topicName).trim();
    }

    if (req.body.description !== undefined) {
      topic.description = String(req.body.description).trim();
    }

    if (req.body.status !== undefined) {
      if (!['ACTIVE', 'INACTIVE'].includes(req.body.status)) {
        return res.status(400).json({ success: false, message: 'Status must be ACTIVE or INACTIVE' });
      }
      topic.status = req.body.status;
    }

    await topic.save();

    const populated = await Topic.findById(topic._id)
      .populate('subject', 'subjectId subjectName')
      .lean();

    res.json({
      success: true,
      message: 'Topic updated successfully',
      data: formatTopic(populated)
    });
  } catch (error) {
    console.error('Update topic error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Topic name already exists for this subject'
      });
    }
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateTopicStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['ACTIVE', 'INACTIVE'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be ACTIVE or INACTIVE' });
    }

    const topic = await Topic.findOneAndUpdate(
      { _id: req.params.id, ...NOT_DELETED },
      { status },
      { new: true }
    )
      .populate('subject', 'subjectId subjectName')
      .lean();

    if (!topic) {
      return res.status(404).json({ success: false, message: 'Topic not found' });
    }

    res.json({
      success: true,
      message: 'Topic status updated',
      data: formatTopic(topic)
    });
  } catch (error) {
    console.error('Update topic status error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.deleteTopic = async (req, res) => {
  try {
    const topic = await Topic.findOne({ _id: req.params.id, ...NOT_DELETED });
    if (!topic) {
      return res.status(404).json({ success: false, message: 'Topic not found' });
    }

    topic.isDeleted = true;
    topic.deletedAt = new Date();
    topic.status = 'INACTIVE';
    await topic.save();

    res.json({
      success: true,
      message: 'Topic deleted successfully',
      data: { _id: topic._id }
    });
  } catch (error) {
    console.error('Delete topic error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
