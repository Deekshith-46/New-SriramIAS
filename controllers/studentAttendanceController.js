const StudentAttendance = require('../models/StudentAttendance');
const {
  startOfDay,
  getMonthRange,
  getPrimaryEnrollment,
  resolveTargetStudentId,
  assertCanViewStudentAttendance,
  formatTimeLabel
} = require('../utils/attendanceAccess');

const ATTENDED_STATUSES = ['present', 'half_day'];
const MISSED_STATUSES = ['absent', 'leave'];

const buildStats = (records) => {
  let classesAttended = 0;
  let classesMissed = 0;

  for (const row of records) {
    if (ATTENDED_STATUSES.includes(row.attendanceStatus)) classesAttended += 1;
    if (MISSED_STATUSES.includes(row.attendanceStatus)) classesMissed += 1;
  }

  const totalClasses = records.length;
  const attendancePercentage =
    totalClasses > 0 ? Math.round((classesAttended / totalClasses) * 100) : 0;

  return {
    attendancePercentage,
    classesAttended,
    classesMissed,
    totalClasses
  };
};

const getStudentUserId = (req) => req.user?._id || req.user?.id;

const getEnrollmentContext = async (req, res, courseId = null) => {
  const studentUserId = getStudentUserId(req);
  if (!studentUserId) {
    res.status(401).json({ success: false, message: 'Authenticated user id not found' });
    return null;
  }

  const enrollment = await getPrimaryEnrollment(studentUserId, courseId);
  if (!enrollment) {
    res.status(403).json({
      success: false,
      message: 'No active course enrollment found for attendance'
    });
    return null;
  }
  return enrollment;
};

exports.checkIn = async (req, res) => {
  try {
    const today = startOfDay();
    const { courseId } = req.body || {};

    const enrollment = await getEnrollmentContext(req, res, courseId || null);
    if (!enrollment) return;

    const studentUserId = getStudentUserId(req);

    let attendance = await StudentAttendance.findOne({
      studentId: studentUserId,
      attendanceDate: today
    });

    if (attendance?.isCheckInDone) {
      return res.status(400).json({
        success: false,
        message: 'Already checked in today'
      });
    }

    if (attendance?.attendanceStatus === 'leave') {
      return res.status(400).json({
        success: false,
        message: 'Leave already applied for today'
      });
    }

    if (!attendance) {
      attendance = await StudentAttendance.create({
        studentId: studentUserId,
        courseId: enrollment.courseId,
        centerId: enrollment.centerId,
        attendanceDate: today,
        checkInTime: new Date(),
        isCheckInDone: true,
        attendanceStatus: 'present'
      });
    } else {
      attendance.checkInTime = new Date();
      attendance.isCheckInDone = true;
      attendance.attendanceStatus = 'present';
      await attendance.save();
    }

    res.json({
      success: true,
      message: 'Check-In successful',
      data: attendance
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Attendance already exists for today' });
    }
    console.error('Check-in error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.checkOut = async (req, res) => {
  try {
    const today = startOfDay();

    const studentUserId = getStudentUserId(req);

    const attendance = await StudentAttendance.findOne({
      studentId: studentUserId,
      attendanceDate: today
    });

    if (!attendance || !attendance.isCheckInDone) {
      return res.status(404).json({
        success: false,
        message: 'Check-In first'
      });
    }

    if (attendance.isCheckOutDone) {
      return res.status(400).json({
        success: false,
        message: 'Already checked out'
      });
    }

    attendance.checkOutTime = new Date();
    attendance.isCheckOutDone = true;

    if (attendance.checkInTime) {
      const durationMs = attendance.checkOutTime - attendance.checkInTime;
      attendance.totalDurationInMinutes = Math.max(0, Math.floor(durationMs / 1000 / 60));
    }

    await attendance.save();

    res.json({
      success: true,
      message: 'Check-Out successful',
      data: attendance
    });
  } catch (error) {
    console.error('Check-out error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.applyLeave = async (req, res) => {
  try {
    const today = startOfDay();
    const reason = (req.body?.reason || '').trim();

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Leave reason is required'
      });
    }

    const enrollment = await getEnrollmentContext(req, res, req.body?.courseId || null);
    if (!enrollment) return;

    const studentUserId = getStudentUserId(req);

    const existing = await StudentAttendance.findOne({
      studentId: studentUserId,
      attendanceDate: today
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Attendance already exists for today'
      });
    }

    const attendance = await StudentAttendance.create({
      studentId: studentUserId,
      courseId: enrollment.courseId,
      centerId: enrollment.centerId,
      attendanceDate: today,
      attendanceStatus: 'leave',
      leaveReason: reason
    });

    res.status(201).json({
      success: true,
      message: 'Leave applied successfully',
      data: attendance
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Attendance already exists for today' });
    }
    console.error('Apply leave error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getAttendanceStats = async (req, res) => {
  try {
    const resolved = await resolveTargetStudentId(req);
    if (typeof resolved !== 'string') {
      return res.status(400).json({
        success: false,
        message: resolved?.error || 'Invalid studentId'
      });
    }

    const allowed = await assertCanViewStudentAttendance(req, res, resolved);
    if (!allowed) return;

    const allRecords = await StudentAttendance.find({ studentId: resolved })
      .sort({ attendanceDate: -1 })
      .lean();

    const overall = buildStats(allRecords);

    const now = new Date();
    const { start, end } = getMonthRange(
      Number(req.query.year) || now.getFullYear(),
      Number(req.query.month) || now.getMonth() + 1
    );

    const monthRecords = allRecords.filter((r) => {
      const d = new Date(r.attendanceDate);
      return d >= start && d <= end;
    });

    const monthStats = buildStats(monthRecords);

    res.json({
      success: true,
      data: {
        ...overall,
        currentMonthPercentage: monthStats.attendancePercentage,
        currentMonthAttended: monthStats.classesAttended,
        currentMonthMissed: monthStats.classesMissed,
        currentMonthTotal: monthStats.totalClasses
      }
    });
  } catch (error) {
    console.error('Attendance stats error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getAttendanceList = async (req, res) => {
  try {
    const resolved = await resolveTargetStudentId(req);
    if (typeof resolved !== 'string') {
      return res.status(400).json({
        success: false,
        message: resolved?.error || 'Invalid studentId'
      });
    }

    const allowed = await assertCanViewStudentAttendance(req, res, resolved);
    if (!allowed) return;

    const filter = { studentId: resolved };

    if (req.query.month && req.query.year) {
      const { start, end } = getMonthRange(Number(req.query.year), Number(req.query.month));
      filter.attendanceDate = { $gte: start, $lte: end };
    }

    const records = await StudentAttendance.find(filter)
      .sort({ attendanceDate: -1 })
      .lean();

    const data = records.map((row) => ({
      _id: row._id,
      date: row.attendanceDate.toISOString().slice(0, 10),
      attendanceStatus: row.attendanceStatus,
      checkInTime: formatTimeLabel(row.checkInTime),
      checkOutTime: formatTimeLabel(row.checkOutTime),
      reason:
        row.attendanceStatus === 'leave'
          ? row.leaveReason || '-'
          : row.attendanceStatus === 'absent'
            ? row.notes || 'Absent'
            : '-',
      totalDurationInMinutes: row.totalDurationInMinutes,
      isCheckInDone: row.isCheckInDone,
      isCheckOutDone: row.isCheckOutDone
    }));

    res.json({
      success: true,
      count: data.length,
      data
    });
  } catch (error) {
    console.error('Attendance list error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getTodayStatus = async (req, res) => {
  try {
    const resolved = await resolveTargetStudentId(req);
    if (typeof resolved !== 'string') {
      return res.status(400).json({
        success: false,
        message: resolved?.error || 'Invalid studentId'
      });
    }

    const allowed = await assertCanViewStudentAttendance(req, res, resolved);
    if (!allowed) return;

    const today = startOfDay();
    const attendance = await StudentAttendance.findOne({
      studentId: resolved,
      attendanceDate: today
    }).lean();

    res.json({
      success: true,
      data: {
        hasAttendance: Boolean(attendance),
        isCheckInDone: attendance?.isCheckInDone ?? false,
        isCheckOutDone: attendance?.isCheckOutDone ?? false,
        attendanceStatus: attendance?.attendanceStatus ?? null,
        attendance
      }
    });
  } catch (error) {
    console.error('Today attendance status error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
