const mongoose = require('mongoose');
const Batch = require('../models/Batch');
const BatchEnrollment = require('../models/BatchEnrollment');

const formatBatchForMentor = (doc) => ({
  _id: doc._id,
  batchId: doc.batchId,
  batchName: doc.batchName,
  status: doc.status,
  commencementDate: doc.commencementDate ?? null,
  durationInMonths: doc.durationInMonths ?? null,
  batchStartDate: doc.batchStartDate ?? null,
  batchEndDate: doc.batchEndDate ?? null,
  course: doc.course
    ? {
        _id: doc.course._id,
        courseId: doc.course.courseId,
        courseName: doc.course.courseName
      }
    : doc.course,
  totalStudents: doc.totalStudents ?? 0,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt
});

exports.getAssignedBatches = async (req, res) => {
  try {
    const mentorId = req.adminAccess._id;

    const rows = await Batch.find({ mentor: mentorId, isDeleted: false })
      .populate('course', 'courseId courseName')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      count: rows.length,
      data: rows.map(formatBatchForMentor)
    });
  } catch (error) {
    console.error('Mentor assigned batches error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getAssignedStudents = async (req, res) => {
  try {
    const mentorId = req.adminAccess._id;
    const { batchId, search = '' } = req.query;

    const batchQuery = { mentor: mentorId, isDeleted: false };
    if (batchId && mongoose.Types.ObjectId.isValid(batchId)) {
      batchQuery._id = batchId;
    }

    const batches = await Batch.find(batchQuery).select('_id batchId batchName course').lean();
    const batchIds = batches.map((b) => b._id);

    if (!batchIds.length) {
      return res.json({ success: true, count: 0, data: [] });
    }

    const enrollmentQuery = {
      batch: { $in: batchIds },
      isDeleted: false,
      status: 'ACTIVE'
    };

    const trimmed = String(search).trim();
    const enrollments = await BatchEnrollment.find(enrollmentQuery)
      .populate({
        path: 'student',
        select: 'studentId studentName email mobileNumber status'
      })
      .populate({ path: 'batch', select: 'batchId batchName' })
      .sort({ createdAt: -1 })
      .lean();

    let data = enrollments.map((e) => ({
      enrollmentId: e.enrollmentId,
      _id: e._id,
      batch: e.batch
        ? { _id: e.batch._id, batchId: e.batch.batchId, batchName: e.batch.batchName }
        : null,
      student: e.student
        ? {
            _id: e.student._id,
            studentId: e.student.studentId,
            studentName: e.student.studentName,
            email: e.student.email,
            mobileNumber: e.student.mobileNumber
          }
        : null,
      paymentStatus: e.paymentStatus,
      enrollmentDate: e.enrollmentDate,
      status: e.status,
      createdAt: e.createdAt
    }));

    if (trimmed) {
      const term = trimmed.toLowerCase();
      data = data.filter((row) => {
        const s = row.student || {};
        return (
          String(s.studentName || '').toLowerCase().includes(term) ||
          String(s.studentId || '').toLowerCase().includes(term) ||
          String(s.email || '').toLowerCase().includes(term) ||
          String(s.mobileNumber || '').toLowerCase().includes(term)
        );
      });
    }

    res.json({ success: true, count: data.length, data });
  } catch (error) {
    console.error('Mentor assigned students error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

