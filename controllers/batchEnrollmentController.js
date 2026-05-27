const mongoose = require('mongoose');
const AcademicStudent = require('../models/AcademicStudent');
const BatchEnrollment = require('../models/BatchEnrollment');
const BatchTransfer = require('../models/BatchTransfer');
const BatchAudit = require('../models/BatchAudit');
const {
  generateAcademicStudentId,
  generateBatchEnrollmentId,
  generateBatchTransferId,
  isValidObjectId
} = require('../utils/contentIdGenerator');
const {
  NOT_DELETED,
  escapeRegex,
  parsePagination,
  parseSort
} = require('../utils/contentMastersHelpers');
const {
  normalizeEmail,
  normalizeMobile,
  validatePaymentStatus,
  validateEnrollmentStatus,
  validatePercent,
  findStudentByEmailOrMobile,
  validateActiveBatch,
  validateCourseForBatch,
  assertNoActiveEnrollment,
  syncBatchStudentCount,
  findEnrollmentByRef
} = require('../utils/enrollmentErpHelpers');

const logBatchAudit = async (batchId, action, description, performedBy, meta = {}) => {
  await BatchAudit.create({
    batch: batchId,
    action,
    description,
    performedBy: performedBy || null,
    meta
  });
};

const formatEnrollment = (doc) => ({
  _id: doc._id,
  enrollmentId: doc.enrollmentId,
  student: doc.student
    ? {
        _id: doc.student._id,
        studentId: doc.student.studentId,
        studentName: doc.student.studentName,
        email: doc.student.email,
        mobileNumber: doc.student.mobileNumber,
        status: doc.student.status
      }
    : doc.student,
  batch: doc.batch
    ? {
        _id: doc.batch._id,
        batchId: doc.batch.batchId,
        batchName: doc.batch.batchName
      }
    : doc.batch,
  course: doc.course
    ? {
        _id: doc.course._id,
        courseId: doc.course.courseId,
        courseName: doc.course.courseName
      }
    : doc.course,
  paymentStatus: doc.paymentStatus,
  attendancePercentage: doc.attendancePercentage ?? 0,
  courseProgressPercentage: doc.courseProgressPercentage ?? 0,
  enrollmentDate: doc.enrollmentDate,
  status: doc.status,
  transferredFrom: doc.transferredFrom || null,
  transferredTo: doc.transferredTo || null,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt
});

const enrollmentPopulate = [
  { path: 'student', select: 'studentId studentName email mobileNumber status' },
  { path: 'batch', select: 'batchId batchName course status' },
  { path: 'course', select: 'courseId courseName' }
];

const buildEnrollmentQuery = ({ batchId, paymentStatus, status, search }) => {
  const query = { ...NOT_DELETED };

  if (batchId && isValidObjectId(batchId)) {
    query.batch = new mongoose.Types.ObjectId(batchId);
  }
  if (paymentStatus) {
    query.paymentStatus = String(paymentStatus).trim().toUpperCase();
  }
  if (status && ['ACTIVE', 'INACTIVE'].includes(status)) {
    query.status = status;
  }

  return query;
};

exports.createBatchEnrollment = async (req, res) => {
  try {
    const {
      studentName,
      email,
      mobileNumber,
      courseId,
      course,
      batchId,
      batch,
      paymentStatus,
      attendancePercentage,
      courseProgressPercentage,
      enrollmentDate
    } = req.body;

    const resolvedBatchId = batchId || batch;
    const resolvedCourseId = courseId || course;

    if (!studentName?.trim()) {
      return res.status(400).json({ success: false, message: 'studentName is required' });
    }
    const emailNorm = normalizeEmail(email);
    const mobileNorm = normalizeMobile(mobileNumber);
    if (!emailNorm && !mobileNorm) {
      return res.status(400).json({
        success: false,
        message: 'At least one of email or mobileNumber is required'
      });
    }

    const batchValidation = await validateActiveBatch(resolvedBatchId);
    if (!batchValidation.ok) {
      return res.status(400).json({ success: false, message: batchValidation.message });
    }

    // If this enrollment is created from Batch Details screen, frontend can omit courseId.
    // We always enforce course = batch.course to prevent cross-course corruption.
    const effectiveCourseId = resolvedCourseId || batchValidation.batch.course;

    const courseValidation = await validateCourseForBatch(effectiveCourseId, batchValidation.batch);
    if (!courseValidation.ok) {
      return res.status(400).json({ success: false, message: courseValidation.message });
    }

    const pay = validatePaymentStatus(paymentStatus);
    if (!pay.ok) return res.status(400).json({ success: false, message: pay.message });

    const att = validatePercent(attendancePercentage, 'attendancePercentage');
    if (!att.ok) return res.status(400).json({ success: false, message: att.message });

    const prog = validatePercent(courseProgressPercentage, 'courseProgressPercentage');
    if (!prog.ok) return res.status(400).json({ success: false, message: prog.message });

    let student = await findStudentByEmailOrMobile({ email: emailNorm, mobileNumber: mobileNorm });
    let studentCreated = false;

    if (!student) {
      const created = await AcademicStudent.create({
        studentId: await generateAcademicStudentId(),
        studentName: studentName.trim(),
        email: emailNorm,
        mobileNumber: mobileNorm,
        status: 'ACTIVE'
      });
      student = created.toObject();
      studentCreated = true;
    } else if (studentName?.trim() && student.studentName !== studentName.trim()) {
      await AcademicStudent.findByIdAndUpdate(student._id, {
        studentName: studentName.trim()
      });
      student.studentName = studentName.trim();
    }

    const dupCheck = await assertNoActiveEnrollment(student._id, batchValidation.batch._id);
    if (!dupCheck.ok) {
      return res.status(409).json({ success: false, message: dupCheck.message });
    }

    const enrollment = await BatchEnrollment.create({
      enrollmentId: await generateBatchEnrollmentId(),
      student: student._id,
      batch: batchValidation.batch._id,
      course: courseValidation.course._id,
      paymentStatus: pay.value,
      attendancePercentage: att.value,
      courseProgressPercentage: prog.value,
      enrollmentDate: enrollmentDate ? new Date(enrollmentDate) : new Date(),
      status: 'ACTIVE'
    });

    const totalStudents = await syncBatchStudentCount(batchValidation.batch._id);

    await logBatchAudit(
      batchValidation.batch._id,
      'STUDENT_ENROLLED',
      `Student ${student.studentName} enrolled (${enrollment.enrollmentId})`,
      req.user?._id,
      { enrollmentId: enrollment._id, studentId: student._id, studentCreated }
    );

    const populated = await BatchEnrollment.findById(enrollment._id)
      .populate(enrollmentPopulate)
      .lean();

    res.status(201).json({
      success: true,
      message: studentCreated
        ? 'Student and enrollment created successfully'
        : 'Enrollment created for existing student',
      studentCreated,
      batchTotalStudents: totalStudents,
      data: formatEnrollment(populated)
    });
  } catch (error) {
    console.error('Create batch enrollment error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getEnrollmentsByBatch = async (req, res) => {
  try {
    const { batchId } = req.params;
    if (!isValidObjectId(batchId)) {
      return res.status(400).json({ success: false, message: 'Invalid batch id' });
    }

    const query = buildEnrollmentQuery({
      batchId,
      paymentStatus: req.query.paymentStatus,
      status: req.query.status
    });

    const trimmed = String(req.query.search || '').trim();
    const { page, limit, skip } = parsePagination(req.query);
    const sort = parseSort(req.query, ['createdAt', 'enrollmentDate', 'paymentStatus', 'status']);

    let enrollments;
    let total;

    if (trimmed) {
      const regex = new RegExp(escapeRegex(trimmed), 'i');
      const pipeline = [
        { $match: query },
        {
          $lookup: {
            from: 'academicstudents',
            localField: 'student',
            foreignField: '_id',
            as: 'studentDoc'
          }
        },
        { $unwind: '$studentDoc' },
        {
          $match: {
            $or: [
              { 'studentDoc.studentName': regex },
              { 'studentDoc.email': regex },
              { 'studentDoc.mobileNumber': regex },
              { 'studentDoc.studentId': regex },
              { enrollmentId: regex }
            ]
          }
        },
        { $sort: sort },
        {
          $facet: {
            rows: [{ $skip: skip }, { $limit: limit }],
            total: [{ $count: 'count' }]
          }
        }
      ];

      const agg = await BatchEnrollment.aggregate(pipeline);
      const ids = (agg[0]?.rows || []).map((r) => r._id);
      total = agg[0]?.total?.[0]?.count || 0;

      enrollments = await BatchEnrollment.find({ _id: { $in: ids } })
        .populate(enrollmentPopulate)
        .lean();

      const orderMap = new Map(ids.map((id, i) => [String(id), i]));
      enrollments.sort((a, b) => orderMap.get(String(a._id)) - orderMap.get(String(b._id)));
    } else {
      [enrollments, total] = await Promise.all([
        BatchEnrollment.find(query).populate(enrollmentPopulate).sort(sort).skip(skip).limit(limit).lean(),
        BatchEnrollment.countDocuments(query)
      ]);
    }

    res.json({
      success: true,
      batchId,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 0,
      count: enrollments.length,
      data: enrollments.map(formatEnrollment)
    });
  } catch (error) {
    console.error('Get enrollments by batch error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getBatchEnrollmentById = async (req, res) => {
  try {
    const doc = await BatchEnrollment.findOne({ _id: req.params.id, ...NOT_DELETED })
      .populate(enrollmentPopulate)
      .lean();

    if (!doc) {
      return res.status(404).json({ success: false, message: 'Enrollment not found' });
    }

    res.json({ success: true, data: formatEnrollment(doc) });
  } catch (error) {
    console.error('Get enrollment by id error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateBatchEnrollment = async (req, res) => {
  try {
    const enrollment = await BatchEnrollment.findOne({ _id: req.params.id, ...NOT_DELETED });
    if (!enrollment) {
      return res.status(404).json({ success: false, message: 'Enrollment not found' });
    }

    if (req.body.paymentStatus !== undefined) {
      const pay = validatePaymentStatus(req.body.paymentStatus);
      if (!pay.ok) return res.status(400).json({ success: false, message: pay.message });
      enrollment.paymentStatus = pay.value;
    }

    if (req.body.attendancePercentage !== undefined) {
      const att = validatePercent(req.body.attendancePercentage, 'attendancePercentage');
      if (!att.ok) return res.status(400).json({ success: false, message: att.message });
      enrollment.attendancePercentage = att.value;
    }

    if (req.body.courseProgressPercentage !== undefined) {
      const prog = validatePercent(req.body.courseProgressPercentage, 'courseProgressPercentage');
      if (!prog.ok) return res.status(400).json({ success: false, message: prog.message });
      enrollment.courseProgressPercentage = prog.value;
    }

    if (req.body.status !== undefined) {
      const st = validateEnrollmentStatus(req.body.status);
      if (!st.ok) return res.status(400).json({ success: false, message: st.message });
      enrollment.status = st.value;
    }

    if (req.body.studentName !== undefined || req.body.email !== undefined || req.body.mobileNumber !== undefined) {
      const student = await AcademicStudent.findOne({ _id: enrollment.student, ...NOT_DELETED });
      if (!student) {
        return res.status(404).json({ success: false, message: 'Linked student not found' });
      }
      if (req.body.studentName !== undefined) {
        if (!String(req.body.studentName).trim()) {
          return res.status(400).json({ success: false, message: 'studentName cannot be empty' });
        }
        student.studentName = String(req.body.studentName).trim();
      }
      if (req.body.email !== undefined) student.email = normalizeEmail(req.body.email);
      if (req.body.mobileNumber !== undefined) {
        student.mobileNumber = normalizeMobile(req.body.mobileNumber);
      }
      await student.save();
    }

    await enrollment.save();

    if (enrollment.status === 'INACTIVE') {
      await syncBatchStudentCount(enrollment.batch);
    }

    const populated = await BatchEnrollment.findById(enrollment._id)
      .populate(enrollmentPopulate)
      .lean();

    res.json({
      success: true,
      message: 'Enrollment updated successfully',
      data: formatEnrollment(populated)
    });
  } catch (error) {
    console.error('Update enrollment error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateBatchEnrollmentStatus = async (req, res) => {
  try {
    const st = validateEnrollmentStatus(req.body.status);
    if (!st.ok) return res.status(400).json({ success: false, message: st.message });

    const enrollment = await BatchEnrollment.findOneAndUpdate(
      { _id: req.params.id, ...NOT_DELETED },
      { status: st.value },
      { new: true }
    );

    if (!enrollment) {
      return res.status(404).json({ success: false, message: 'Enrollment not found' });
    }

    const totalStudents = await syncBatchStudentCount(enrollment.batch);

    const populated = await BatchEnrollment.findById(enrollment._id)
      .populate(enrollmentPopulate)
      .lean();

    res.json({
      success: true,
      message: 'Enrollment status updated',
      batchTotalStudents: totalStudents,
      data: formatEnrollment(populated)
    });
  } catch (error) {
    console.error('Update enrollment status error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.deleteBatchEnrollment = async (req, res) => {
  try {
    const enrollment = await BatchEnrollment.findOne({ _id: req.params.id, ...NOT_DELETED });
    if (!enrollment) {
      return res.status(404).json({ success: false, message: 'Enrollment not found' });
    }

    enrollment.isDeleted = true;
    enrollment.deletedAt = new Date();
    enrollment.status = 'INACTIVE';
    await enrollment.save();

    const totalStudents = await syncBatchStudentCount(enrollment.batch);

    await logBatchAudit(
      enrollment.batch,
      'ENROLLMENT_REMOVED',
      `Enrollment ${enrollment.enrollmentId} soft-deleted`,
      req.user?._id,
      { enrollmentId: enrollment._id }
    );

    res.json({
      success: true,
      message: 'Enrollment removed successfully',
      batchTotalStudents: totalStudents,
      data: { _id: enrollment._id }
    });
  } catch (error) {
    console.error('Delete enrollment error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getMoveStudentForm = async (req, res) => {
  try {
    const enrollment = await findEnrollmentByRef(req.params.id, { activeOnly: true });
    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Active enrollment not found'
      });
    }

    const populated = await BatchEnrollment.findById(enrollment._id)
      .populate({ path: 'batch', select: 'batchName' })
      .lean();

    if (!populated?.batch) {
      return res.status(400).json({
        success: false,
        message: 'Enrollment has no batch assigned'
      });
    }

    res.json({
      success: true,
      currentBatchName: String(populated.batch.batchName || '').trim()
    });
  } catch (error) {
    console.error('Get move student form error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.moveStudentToBatch = async (req, res) => {
  try {
    const {
      toBatchId,
      toBatch,
      transferReason = '',
      transferAttendanceRecords = false,
      transferFeeRecords = false,
      transferTestRecords = false,
      effectiveTransferDate,
      paymentStatus,
      attendancePercentage,
      courseProgressPercentage
    } = req.body;

    const destinationBatchId = toBatchId || toBatch;
    const oldEnrollment = await findEnrollmentByRef(req.params.id, { activeOnly: true });

    if (!oldEnrollment) {
      return res.status(404).json({ success: false, message: 'Active enrollment not found' });
    }

    const destValidation = await validateActiveBatch(destinationBatchId);
    if (!destValidation.ok) {
      return res.status(400).json({ success: false, message: destValidation.message });
    }

    if (String(oldEnrollment.batch) === String(destValidation.batch._id)) {
      return res.status(400).json({ success: false, message: 'Student is already in this batch' });
    }

    const courseValidation = await validateCourseForBatch(
      destValidation.batch.course,
      destValidation.batch
    );
    if (!courseValidation.ok) {
      return res.status(400).json({ success: false, message: courseValidation.message });
    }

    const dupCheck = await assertNoActiveEnrollment(
      oldEnrollment.student,
      destValidation.batch._id
    );
    if (!dupCheck.ok) {
      return res.status(409).json({ success: false, message: dupCheck.message });
    }

    const pay = validatePaymentStatus(
      paymentStatus !== undefined
        ? paymentStatus
        : transferFeeRecords
          ? oldEnrollment.paymentStatus
          : 'PENDING'
    );
    if (!pay.ok) return res.status(400).json({ success: false, message: pay.message });

    const att = validatePercent(
      attendancePercentage !== undefined
        ? attendancePercentage
        : transferAttendanceRecords
          ? oldEnrollment.attendancePercentage
          : 0,
      'attendancePercentage'
    );
    if (!att.ok) return res.status(400).json({ success: false, message: att.message });

    const prog = validatePercent(
      courseProgressPercentage !== undefined
        ? courseProgressPercentage
        : transferAttendanceRecords
          ? oldEnrollment.courseProgressPercentage
          : 0,
      'courseProgressPercentage'
    );
    if (!prog.ok) return res.status(400).json({ success: false, message: prog.message });

    oldEnrollment.status = 'INACTIVE';
    oldEnrollment.transferredTo = destValidation.batch._id;
    await oldEnrollment.save();

    const newEnrollment = await BatchEnrollment.create({
      enrollmentId: await generateBatchEnrollmentId(),
      student: oldEnrollment.student,
      batch: destValidation.batch._id,
      course: courseValidation.course._id,
      paymentStatus: pay.value,
      attendancePercentage: att.value,
      courseProgressPercentage: prog.value,
      enrollmentDate: effectiveTransferDate ? new Date(effectiveTransferDate) : new Date(),
      status: 'ACTIVE',
      transferredFrom: oldEnrollment.batch
    });

    const transfer = await BatchTransfer.create({
      transferId: await generateBatchTransferId(),
      student: oldEnrollment.student,
      fromBatch: oldEnrollment.batch,
      toBatch: destValidation.batch._id,
      fromEnrollment: oldEnrollment._id,
      toEnrollment: newEnrollment._id,
      effectiveTransferDate: effectiveTransferDate ? new Date(effectiveTransferDate) : new Date(),
      transferReason: String(transferReason || '').trim(),
      transferAttendanceRecords: Boolean(transferAttendanceRecords),
      transferFeeRecords: Boolean(transferFeeRecords),
      transferTestRecords: Boolean(transferTestRecords),
      transferredBy: req.user?._id || null
    });

    const [fromCount, toCount] = await Promise.all([
      syncBatchStudentCount(oldEnrollment.batch),
      syncBatchStudentCount(destValidation.batch._id)
    ]);

    await Promise.all([
      logBatchAudit(
        oldEnrollment.batch,
        'STUDENT_TRANSFERRED_OUT',
        `Student moved to batch ${destValidation.batch.batchName || destValidation.batch._id}`,
        req.user?._id,
        { transferId: transfer._id, toBatch: destValidation.batch._id }
      ),
      logBatchAudit(
        destValidation.batch._id,
        'STUDENT_TRANSFERRED_IN',
        `Student transferred from previous batch`,
        req.user?._id,
        { transferId: transfer._id, fromBatch: oldEnrollment.batch }
      )
    ]);

    const populated = await BatchEnrollment.findById(newEnrollment._id)
      .populate(enrollmentPopulate)
      .lean();

    res.json({
      success: true,
      message: 'Student moved to new batch successfully',
      transfer: {
        _id: transfer._id,
        transferId: transfer.transferId,
        transferAttendanceRecords: transfer.transferAttendanceRecords,
        transferFeeRecords: transfer.transferFeeRecords,
        transferTestRecords: transfer.transferTestRecords
      },
      fromBatchTotalStudents: fromCount,
      toBatchTotalStudents: toCount,
      data: formatEnrollment(populated)
    });
  } catch (error) {
    console.error('Move student error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getBatchTransfers = async (req, res) => {
  try {
    const { batchId } = req.params;
    if (!isValidObjectId(batchId)) {
      return res.status(400).json({ success: false, message: 'Invalid batch id' });
    }

    const batchObjectId = new mongoose.Types.ObjectId(batchId);
    const { page, limit, skip } = parsePagination(req.query);

    const filter = {
      $or: [{ fromBatch: batchObjectId }, { toBatch: batchObjectId }]
    };

    const [rows, total] = await Promise.all([
      BatchTransfer.find(filter)
        .populate('student', 'studentId studentName email mobileNumber')
        .populate('fromBatch', 'batchId batchName')
        .populate('toBatch', 'batchId batchName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      BatchTransfer.countDocuments(filter)
    ]);

    res.json({
      success: true,
      batchId,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 0,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    console.error('Get batch transfers error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getBatchAuditHistory = async (req, res) => {
  try {
    const { batchId } = req.params;
    if (!isValidObjectId(batchId)) {
      return res.status(400).json({ success: false, message: 'Invalid batch id' });
    }

    const { page, limit, skip } = parsePagination(req.query);

    const filter = { batch: batchId };

    const [rows, total] = await Promise.all([
      BatchAudit.find(filter)
        .populate('performedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      BatchAudit.countDocuments(filter)
    ]);

    res.json({
      success: true,
      batchId,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 0,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    console.error('Get batch audit error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getStudentEnrollmentHistory = async (req, res) => {
  try {
    const { studentId } = req.params;
    if (!isValidObjectId(studentId)) {
      return res.status(400).json({ success: false, message: 'Invalid student id' });
    }

    const enrollments = await BatchEnrollment.find({
      student: studentId,
      ...NOT_DELETED
    })
      .populate(enrollmentPopulate)
      .sort({ enrollmentDate: -1 })
      .lean();

    const transfers = await BatchTransfer.find({ student: studentId })
      .populate('fromBatch', 'batchId batchName')
      .populate('toBatch', 'batchId batchName')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      studentId,
      enrollments: enrollments.map(formatEnrollment),
      transfers
    });
  } catch (error) {
    console.error('Get student history error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
