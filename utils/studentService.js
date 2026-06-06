const User = require('../models/User');
const Student = require('../models/Student');
const Center = require('../models/Center');
const Batch = require('../models/Batch');
const BatchEnrollment = require('../models/BatchEnrollment');
const BatchTransfer = require('../models/BatchTransfer');
const Parent = require('../models/Parent');
const MainsAnswerWritingSubmission = require('../models/MainsAnswerWritingSubmission');
const { generateStudentId } = require('./contentIdGenerator');
const { assertStudentGmail } = require('./studentEmail');

/** Excludes legacy rows that were soft-deleted before hard-delete migration */
const ACTIVE_STUDENT = { isDeleted: { $ne: true } };

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();
const normalizeMobile = (mobile) => String(mobile || '').trim().replace(/\s+/g, '');

const formatStudentRecord = (doc) => {
  const s = doc?.toObject ? doc.toObject() : { ...doc };
  return {
    _id: s._id,
    studentId: s.studentId || null,
    userId: s.userId || null,
    studentName: s.studentName,
    email: s.email || '',
    mobileNumber: s.mobileNumber || '',
    centerId: s.centerId || null,
    parentName: s.parentName || null,
    parentEmail: s.parentEmail || null,
    parentMobile: s.parentMobile || null,
    status: s.status || 'ACTIVE',
    createdAt: s.createdAt,
    updatedAt: s.updatedAt
  };
};

const findStudentByEmailOrMobile = async ({ email, mobileNumber, excludeId } = {}) => {
  const emailNorm = normalizeEmail(email);
  const mobileNorm = normalizeMobile(mobileNumber);

  if (!emailNorm && !mobileNorm) return null;

  const or = [];
  if (emailNorm) or.push({ email: emailNorm });
  if (mobileNorm) or.push({ mobileNumber: mobileNorm });

  const filter = { ...ACTIVE_STUDENT, $or: or };
  if (excludeId) filter._id = { $ne: excludeId };

  return Student.findOne(filter).lean();
};

const findStudentByUserId = async (userId) =>
  Student.findOne({ userId, ...ACTIVE_STUDENT }).lean();

const assertStudentContactAvailable = async ({ email, mobileNumber, excludeId } = {}) => {
  const existing = await findStudentByEmailOrMobile({ email, mobileNumber, excludeId });
  if (!existing) return { ok: true };

  const emailNorm = normalizeEmail(email);
  const mobileNorm = normalizeMobile(mobileNumber);

  if (emailNorm && existing.email === emailNorm) {
    return { ok: false, message: 'A student already exists with this email' };
  }
  if (mobileNorm && existing.mobileNumber === mobileNorm) {
    return { ok: false, message: 'A student already exists with this mobile number' };
  }

  return { ok: false, message: 'A student already exists with this email or mobile' };
};

const validateStudentCenter = async (centerId) => {
  const center = await Center.findOne({
    _id: centerId,
    isDeleted: false,
    status: 'ACTIVE'
  });
  if (!center) {
    return { error: { status: 400, message: 'Invalid or inactive center' } };
  }
  return { center };
};

/**
 * Create ERP student profile (batch enrollment, no portal user yet).
 */
const createStudentProfile = async ({
  studentName,
  email,
  mobileNumber,
  centerId = null,
  userId = null,
  parentName,
  parentEmail,
  parentMobile,
  status = 'ACTIVE'
}) => {
  const dup = await assertStudentContactAvailable({ email, mobileNumber });
  if (!dup.ok) {
    const err = new Error(dup.message);
    err.statusCode = 400;
    throw err;
  }

  if (userId) {
    const linked = await findStudentByUserId(userId);
    if (linked) {
      const err = new Error('Student profile already exists for this user');
      err.statusCode = 400;
      throw err;
    }
  }

  const student = await Student.create({
    studentId: await generateStudentId(),
    userId: userId || null,
    studentName: String(studentName).trim(),
    email: normalizeEmail(email),
    mobileNumber: normalizeMobile(mobileNumber),
    centerId: centerId || null,
    ...(parentName ? { parentName: String(parentName).trim() } : {}),
    ...(parentEmail ? { parentEmail: normalizeEmail(parentEmail) } : {}),
    ...(parentMobile ? { parentMobile: normalizeMobile(parentMobile) } : {}),
    status: status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE'
  });

  return formatStudentRecord(student);
};

/**
 * Find existing student by email/mobile or create new (batch enrollment).
 */
const findOrCreateStudentForEnrollment = async ({
  studentName,
  email,
  mobileNumber,
  centerId = null
}) => {
  let student = await findStudentByEmailOrMobile({ email, mobileNumber });
  let created = false;

  if (!student) {
    student = await createStudentProfile({
      studentName,
      email,
      mobileNumber,
      centerId
    });
    created = true;
  } else if (studentName?.trim() && student.studentName !== studentName.trim()) {
    await Student.findByIdAndUpdate(student._id, { studentName: studentName.trim() });
    student.studentName = studentName.trim();
  }

  return { student, created };
};

/**
 * After portal signup / admin create: ensure one Student row per User.
 * Links batch-only student if email/mobile already exists.
 */
const ensureStudentProfileForUser = async (user, options = {}) => {
  const {
    parentName,
    parentEmail,
    parentMobile,
    studentName: nameOverride
  } = options;

  const studentName = String(nameOverride || user.name || '').trim();
  const email = normalizeEmail(user.email);
  const mobileNumber = normalizeMobile(user.mobile);
  const centerId = user.center || null;

  let profile = await findStudentByUserId(user._id);
  if (profile) {
    return formatStudentRecord(profile);
  }

  const existingByContact = await findStudentByEmailOrMobile({ email, mobileNumber });
  if (existingByContact) {
    if (existingByContact.userId && String(existingByContact.userId) !== String(user._id)) {
      const err = new Error('Student record exists for this email/mobile but is linked to another user');
      err.statusCode = 409;
      throw err;
    }

    existingByContact.userId = user._id;
    existingByContact.studentName = studentName || existingByContact.studentName;
    if (email) existingByContact.email = email;
    if (mobileNumber) existingByContact.mobileNumber = mobileNumber;
    if (centerId) existingByContact.centerId = centerId;
    if (parentName) existingByContact.parentName = String(parentName).trim();
    if (parentEmail) existingByContact.parentEmail = normalizeEmail(parentEmail);
    if (parentMobile) existingByContact.parentMobile = normalizeMobile(parentMobile);

    const updated = await Student.findByIdAndUpdate(
      existingByContact._id,
      {
        userId: user._id,
        studentName: existingByContact.studentName,
        email: existingByContact.email,
        mobileNumber: existingByContact.mobileNumber,
        centerId: existingByContact.centerId,
        ...(parentName ? { parentName: existingByContact.parentName } : {}),
        ...(parentEmail ? { parentEmail: existingByContact.parentEmail } : {}),
        ...(parentMobile ? { parentMobile: existingByContact.parentMobile } : {})
      },
      { new: true }
    ).lean();

    return formatStudentRecord(updated);
  }

  return createStudentProfile({
    userId: user._id,
    studentName,
    email,
    mobileNumber,
    centerId,
    parentName,
    parentEmail,
    parentMobile,
    status: user.isActive ? 'ACTIVE' : 'INACTIVE'
  });
};

/**
 * Admin unified user create — User + Student.
 */
const createStudentWithUser = async (body) => {
  const {
    fullName,
    email: rawEmail,
    mobile,
    parentName,
    parentEmail,
    parentMobile,
    centerId,
    status
  } = body;

  const email = assertStudentGmail(rawEmail);
  const mobileNorm = normalizeMobile(mobile);

  const centerCheck = await validateStudentCenter(centerId);
  if (centerCheck.error) {
    const err = new Error(centerCheck.error.message);
    err.statusCode = centerCheck.error.status;
    throw err;
  }

  const existingUser = await User.findOne({
    $or: [{ email }, { mobile: mobileNorm }]
  });
  if (existingUser) {
    const err = new Error('User already exists with this email or mobile');
    err.statusCode = 400;
    throw err;
  }

  const dupStudent = await assertStudentContactAvailable({ email, mobile: mobileNorm });
  if (!dupStudent.ok) {
    const err = new Error(dupStudent.message);
    err.statusCode = 400;
    throw err;
  }

  const user = await User.create({
    name: String(fullName).trim(),
    email,
    mobile: mobileNorm,
    center: centerId,
    role: 'student',
    isActive: status !== false
  });

  const student = await createStudentProfile({
    userId: user._id,
    studentName: user.name,
    email: user.email,
    mobileNumber: user.mobile,
    centerId,
    parentName,
    parentEmail,
    parentMobile,
    status: user.isActive ? 'ACTIVE' : 'INACTIVE'
  });

  const populated = await User.findById(user._id)
    .select('-password')
    .populate('center', 'centerName centerCode name')
    .lean();

  return { user: populated, student };
};

const syncBatchStudentCounts = async (batchIds) => {
  for (const batchId of batchIds) {
    const count = await BatchEnrollment.countDocuments({
      batch: batchId,
      status: 'ACTIVE'
    });
    await Batch.findByIdAndUpdate(batchId, { totalStudents: count });
  }
};

/**
 * Permanently remove student master, linked User, and dependent ERP rows.
 */
/**
 * Resolve portal User for OTP login — links batch-only Student rows when needed.
 */
/** Parent account + profile fields for a student */
const resolveParentInfoForStudent = async (student) => {
  const profileFields = {
    parentName: student.parentName || null,
    parentEmail: student.parentEmail || null,
    parentMobile: student.parentMobile || null
  };

  const parentLink = await Parent.findOne({ studentId: student._id }).lean();
  if (!parentLink?.userId) {
    if (!profileFields.parentName && !profileFields.parentEmail && !profileFields.parentMobile) {
      return null;
    }
    const parentUser = await User.findOne({
      $or: [
        ...(profileFields.parentEmail ? [{ email: profileFields.parentEmail }] : []),
        ...(profileFields.parentMobile ? [{ mobile: profileFields.parentMobile }] : [])
      ],
      role: 'parent'
    })
      .select('-password')
      .lean();
    if (!parentUser) {
      return profileFields.parentName || profileFields.parentEmail || profileFields.parentMobile
        ? { ...profileFields, userId: null, isActive: null, linkedAt: null }
        : null;
    }
    return {
      userId: parentUser._id,
      name: parentUser.name || profileFields.parentName,
      email: parentUser.email || profileFields.parentEmail,
      mobile: parentUser.mobile || profileFields.parentMobile,
      isActive: parentUser.isActive,
      linkedAt: parentLink?.createdAt || null,
      ...profileFields
    };
  }

  const parentUser = await User.findById(parentLink.userId).select('-password').lean();
  if (!parentUser) {
    return profileFields.parentName || profileFields.parentEmail || profileFields.parentMobile
      ? { ...profileFields, userId: null, isActive: null, linkedAt: parentLink.createdAt }
      : null;
  }

  return {
    userId: parentUser._id,
    name: parentUser.name || profileFields.parentName,
    email: parentUser.email || profileFields.parentEmail,
    mobile: parentUser.mobile || profileFields.parentMobile,
    isActive: parentUser.isActive,
    linkedAt: parentLink.createdAt,
    parentName: profileFields.parentName || parentUser.name,
    parentEmail: profileFields.parentEmail || parentUser.email,
    parentMobile: profileFields.parentMobile || parentUser.mobile
  };
};

/** Attach parent fields onto batch student objects (for admin batch detail) */
const attachParentDetailsToEnrollments = async (enrollmentRows) => {
  const studentIds = enrollmentRows
    .map((row) => row.student?._id)
    .filter(Boolean);
  if (!studentIds.length) return enrollmentRows;

  const links = await Parent.find({ studentId: { $in: studentIds } }).lean();
  const parentUserIds = links.map((l) => l.userId).filter(Boolean);
  const parentUsers = parentUserIds.length
    ? await User.find({ _id: { $in: parentUserIds } }).select('name email mobile').lean()
    : [];
  const parentByUserId = new Map(parentUsers.map((p) => [String(p._id), p]));
  const linkByStudentId = new Map(links.map((l) => [String(l.studentId), l]));

  return enrollmentRows.map((row) => {
    if (!row.student?._id) return row;
    const link = linkByStudentId.get(String(row.student._id));
    const parentUser = link ? parentByUserId.get(String(link.userId)) : null;
    const student = { ...row.student };

    if (parentUser) {
      student.parentName = student.parentName || parentUser.name;
      student.parentEmail = student.parentEmail || parentUser.email;
      student.parentMobile = student.parentMobile || parentUser.mobile;
      student.parentUserId = parentUser._id;
    }

    return { ...row, student };
  });
};

const resolveLoginUser = async ({ email, mobile }) => {
  const emailNorm = email ? normalizeEmail(email) : null;
  const mobileNorm = mobile ? normalizeMobile(mobile) : null;

  if (!emailNorm && !mobileNorm) {
    return { user: null, linkedFromBatch: false };
  }

  let user = null;
  if (emailNorm) {
    user = await User.findOne({ email: emailNorm });
  } else if (mobileNorm) {
    user = await User.findOne({ mobile: mobileNorm });
  }

  if (user) {
    return { user, linkedFromBatch: false };
  }

  const student = await findStudentByEmailOrMobile({
    email: emailNorm,
    mobileNumber: mobileNorm
  });
  if (!student) {
    return { user: null, linkedFromBatch: false };
  }

  if (student.userId) {
    user = await User.findById(student.userId);
    if (user) {
      return { user, linkedFromBatch: true };
    }
  }

  const userPayload = {
    name: student.studentName,
    center: student.centerId || null,
    role: 'student',
    isActive: true
  };
  const resolvedEmail = emailNorm || normalizeEmail(student.email);
  const resolvedMobile = mobileNorm || normalizeMobile(student.mobileNumber);
  if (resolvedEmail) userPayload.email = resolvedEmail;
  if (resolvedMobile) userPayload.mobile = resolvedMobile;

  user = await User.create(userPayload);
  await Student.findByIdAndUpdate(student._id, { userId: user._id });

  return { user, linkedFromBatch: true };
};

const deleteStudent = async (studentIdOrUserId) => {
  let student = await Student.findOne({ _id: studentIdOrUserId, ...ACTIVE_STUDENT });
  let user = null;

  if (!student) {
    const legacy = await Student.findById(studentIdOrUserId);
    if (legacy?.isDeleted) {
      await Student.deleteOne({ _id: legacy._id });
      return { ok: true, student: legacy, user: null };
    }

    user = await User.findById(studentIdOrUserId);
    if (!user || user.role !== 'student') {
      return { ok: false, status: 404, message: 'Student not found' };
    }
    student = await Student.findOne({ userId: user._id, ...ACTIVE_STUDENT });
    const legacyByUser = await Student.findOne({ userId: user._id, isDeleted: true });
    if (!student && legacyByUser) {
      await Student.deleteOne({ _id: legacyByUser._id });
      await User.deleteOne({ _id: user._id });
      return { ok: true, student: legacyByUser, user };
    }
    if (!student) {
      await User.deleteOne({ _id: user._id });
      return { ok: true, student: null, user };
    }
  } else if (student.userId) {
    user = await User.findById(student.userId);
  }

  const studentOid = student._id;
  const enrollments = await BatchEnrollment.find({ student: studentOid })
    .select('batch')
    .lean();
  const batchIds = [...new Set(enrollments.map((e) => String(e.batch)))];

  const cleanupTasks = [
    BatchEnrollment.deleteMany({ student: studentOid }),
    BatchTransfer.deleteMany({ student: studentOid }),
    Parent.deleteMany({ studentId: studentOid })
  ];
  if (user?._id) {
    cleanupTasks.push(
      MainsAnswerWritingSubmission.deleteMany({ studentId: user._id })
    );
  }
  await Promise.all(cleanupTasks);
  await Student.deleteOne({ _id: studentOid });
  if (user) {
    await User.deleteOne({ _id: user._id });
  }

  await syncBatchStudentCounts(batchIds);

  return { ok: true, student, user };
};

module.exports = {
  ACTIVE_STUDENT,
  normalizeEmail,
  normalizeMobile,
  formatStudentRecord,
  findStudentByEmailOrMobile,
  findStudentByUserId,
  assertStudentContactAvailable,
  createStudentProfile,
  findOrCreateStudentForEnrollment,
  ensureStudentProfileForUser,
  createStudentWithUser,
  deleteStudent,
  resolveLoginUser,
  resolveParentInfoForStudent,
  attachParentDetailsToEnrollments
};
