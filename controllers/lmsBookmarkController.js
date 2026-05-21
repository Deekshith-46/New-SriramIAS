const LmsBookmark = require('../models/LmsBookmark');
const RecordedLecture = require('../models/RecordedLecture');
const LmsTest = require('../models/LmsTest');
const LmsTestCategory = require('../models/LmsTestCategory');
const { assertEnrollmentAccess } = require('../utils/courseAccess');
const { NOT_DELETED } = require('../utils/lmsTestHelpers');

const resolveRecording = async (referenceId) => {
  const lecture = await RecordedLecture.findOne({
    _id: referenceId,
    isDeleted: false,
    isPublished: true
  }).lean();

  if (!lecture) return null;

  return {
    courseId: lecture.courseId,
    title: lecture.lectureTitle,
    thumbnail: lecture.thumbnail?.url ? lecture.thumbnail : {},
    metadata: {
      subjectId: lecture.subjectId,
      durationSeconds: lecture.video?.duration ?? null,
      isPreviewFree: lecture.isPreviewFree ?? false
    }
  };
};

const resolveTest = async (referenceId) => {
  const test = await LmsTest.findOne({
    _id: referenceId,
    ...NOT_DELETED,
    isPublished: true
  }).lean();

  if (!test) return null;

  let categorySlug = null;
  let categoryTitle = null;
  if (test.categoryId) {
    const category = await LmsTestCategory.findById(test.categoryId).lean();
    categorySlug = category?.slug ?? null;
    categoryTitle = category?.title ?? null;
  }

  return {
    courseId: test.courseId,
    title: test.title,
    thumbnail: {},
    metadata: {
      categoryId: test.categoryId,
      categorySlug,
      categoryTitle,
      durationInMinutes: test.durationInMinutes,
      totalQuestions: test.totalQuestions,
      passMarks: test.passMarks
    }
  };
};

exports.toggleBookmark = async (req, res) => {
  try {
    const { bookmarkType, referenceId } = req.body;

    if (!bookmarkType || !referenceId) {
      return res.status(400).json({
        success: false,
        message: 'bookmarkType and referenceId are required'
      });
    }

    let resolved = null;

    if (bookmarkType === 'recording') {
      resolved = await resolveRecording(referenceId);
      if (!resolved) {
        return res.status(404).json({ success: false, message: 'Lecture not found' });
      }
    } else if (bookmarkType === 'test') {
      resolved = await resolveTest(referenceId);
      if (!resolved) {
        return res.status(404).json({ success: false, message: 'Test not found' });
      }
    } else {
      return res.status(400).json({ success: false, message: 'Invalid bookmark type' });
    }

    const enrollment = await assertEnrollmentAccess(req, res, resolved.courseId);
    if (!enrollment) return;

    const existing = await LmsBookmark.findOne({
      userId: req.user._id,
      bookmarkType,
      referenceId
    });

    if (existing) {
      await LmsBookmark.deleteOne({ _id: existing._id });
      return res.json({
        success: true,
        bookmarked: false,
        message: 'Bookmark removed'
      });
    }

    const bookmark = await LmsBookmark.create({
      userId: req.user._id,
      courseId: resolved.courseId,
      bookmarkType,
      referenceId,
      title: resolved.title,
      thumbnail: resolved.thumbnail,
      metadata: resolved.metadata
    });

    res.status(201).json({
      success: true,
      bookmarked: true,
      message: 'Bookmarked successfully',
      data: bookmark
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Bookmark already exists'
      });
    }
    console.error('Toggle bookmark error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getAllBookmarks = async (req, res) => {
  try {
    const bookmarks = await LmsBookmark.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      count: bookmarks.length,
      data: bookmarks
    });
  } catch (error) {
    console.error('Get all bookmarks error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getRecordingBookmarks = async (req, res) => {
  try {
    const bookmarks = await LmsBookmark.find({
      userId: req.user._id,
      bookmarkType: 'recording'
    })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      count: bookmarks.length,
      data: bookmarks
    });
  } catch (error) {
    console.error('Get recording bookmarks error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getTestBookmarks = async (req, res) => {
  try {
    const bookmarks = await LmsBookmark.find({
      userId: req.user._id,
      bookmarkType: 'test'
    })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      count: bookmarks.length,
      data: bookmarks
    });
  } catch (error) {
    console.error('Get test bookmarks error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getBookmarkStatus = async (req, res) => {
  try {
    const { bookmarkType, referenceId } = req.query;

    if (!bookmarkType || !referenceId) {
      return res.status(400).json({
        success: false,
        message: 'bookmarkType and referenceId query params are required'
      });
    }

    const bookmark = await LmsBookmark.findOne({
      userId: req.user._id,
      bookmarkType,
      referenceId
    }).lean();

    res.json({
      success: true,
      bookmarked: Boolean(bookmark),
      bookmarkId: bookmark?._id ?? null
    });
  } catch (error) {
    console.error('Get bookmark status error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
