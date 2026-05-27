# Batch + FacultySubject Module (Complete Code)

> **Live APIs & Postman:** `BATCH_FACULTY_SUBJECT_API_GUIDE.md` · `BATCH_FACULTY_SUBJECT_POSTMAN_COLLECTION.json`  
> Implemented controllers: `facultySubjectController.js`, `batchController.js`, `batchEnrollmentController.js`

This document contains reference / paste-in code for the architecture you described:

```text
FacultySubject  (Subject + Topics + Teacher + Categories)
      ↓
Batch (stores facultySubjectIds[])
```

It uses your existing:
- `models/Batch.js`
- `models/FacultySubject.js`
- `utils/batchFacultyHelpers.js`
- `utils/batchFacultyConstants.js`

And assumes your existing global masters:
- `Subject`, `Topic`, `Teacher`

## API base

All admin endpoints use:
- `protect` middleware
- `requireSuperAdmin` middleware

Super Admin base url: `{{BASE_URL}}`

Auth header:

```http
Authorization: Bearer {{SuperAdminToken}}
```

---

## 1) `utils/batchFacultyIdGenerator.js`

```js
const mongoose = require('mongoose');

const parseNumericSuffix = (value, prefix) => {
  if (!value || typeof value !== 'string') return 0;
  const match = value.match(new RegExp(`^${prefix}(\\d+)$`, 'i'));
  return match ? parseInt(match[1], 10) : 0;
};

const generateSequentialId = async (Model, field, prefix, pad = 3) => {
  const latest = await Model.findOne({
    [field]: new RegExp(`^${prefix}\\d+$`, 'i')
  })
    .sort({ [field]: -1 })
    .select(field)
    .lean();

  const next = parseNumericSuffix(latest?.[field], prefix) + 1;
  return `${prefix}${String(next).padStart(pad, '0')}`;
};

const generateFacultySubjectId = () =>
  generateSequentialId(
    require('../models/FacultySubject'),
    'facultySubjectId',
    'FDS'
  );

const generateBatchId = () =>
  generateSequentialId(require('../models/Batch'), 'batchId', 'BCH');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

module.exports = {
  generateFacultySubjectId,
  generateBatchId,
  isValidObjectId
};
```

---

## 2) `controllers/facultySubjectController.js`

```js
const mongoose = require('mongoose');
const FacultySubject = require('../models/FacultySubject');
const Subject = require('../models/Subject');
const Topic = require('../models/Topic');
const Teacher = require('../models/Teacher');

const { protect } = require('../middleware/authMiddleware');
const { requireSuperAdmin } = require('../middleware/requireSuperAdmin');

const {
  parsePagination,
  parseSort,
  escapeRegex
} = require('../utils/contentMastersHelpers');

const {
  validateFacultySubjectPayload,
  validateFacultySubjectIds,
  BATCH_STATUSES,
  parseObjectIdList
} = require('../utils/batchFacultyHelpers');

const { NOT_DELETED } = require('../utils/contentMastersHelpers');

const { generateFacultySubjectId } = require('../utils/batchFacultyIdGenerator');

const teacherPopulate = [
  { path: 'teacher', select: 'teacherId teacherName centerId' }
];

const formatFacultySubject = (doc) => ({
  _id: doc._id,
  facultySubjectId: doc.facultySubjectId,
  subjectName: doc.subjectName,
  subject: doc.subject?._id || doc.subject,
  teacher: doc.teacher?._id || doc.teacher,
  teacherDetails: doc.teacher
    ? {
        _id: doc.teacher._id,
        teacherId: doc.teacher.teacherId,
        teacherName: doc.teacher.teacherName,
        centerId: doc.teacher.centerId
      }
    : undefined,
  topics: (doc.topics || []).map((t) => ({
    _id: t._id || t,
    topicId: t.topicId,
    topicName: t.topicName
  })),
  categories: doc.categories || [],
  status: doc.status,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt
});

const buildFacultySubjectQuery = ({ search = '', status, category }) => {
  const query = { ...NOT_DELETED, isDeleted: false };

  if (status && ['ACTIVE', 'INACTIVE'].includes(status)) query.status = status;
  if (category) query.categories = category;

  const trimmed = String(search).trim();
  if (trimmed) {
    const regex = new RegExp(escapeRegex(trimmed), 'i');
    query.$or = [{ subjectName: regex }, { facultySubjectId: regex }];
  }
  return query;
};

exports.createFacultySubject = async (req, res) => {
  try {
    const {
      subjectName,
      subjectId,
      topicIds = [],
      teacherId,
      categories = [],
      status = 'ACTIVE'
    } = req.body;

    const validation = await validateFacultySubjectPayload({
      subjectName,
      subjectId,
      topicIds,
      teacherId,
      categories
    });
    if (!validation.ok) {
      return res.status(400).json({ success: false, message: validation.message });
    }

    const fs = await FacultySubject.create({
      facultySubjectId: await generateFacultySubjectId(),
      subjectName: subjectName.trim(),
      subject: validation.subject._id,
      topics: validation.topics,
      teacher: validation.teacher._id,
      categories: validation.categories,
      status: status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE'
    });

    const populated = await FacultySubject.findById(fs._id)
      .populate('subject', 'subjectId subjectName')
      .populate('topics', 'topicId topicName')
      .populate('teacher', 'teacherId teacherName centerId')
      .lean();

    res.status(201).json({
      success: true,
      message: 'FacultySubject created successfully',
      data: formatFacultySubject(populated)
    });
  } catch (error) {
    console.error('Create facultySubject error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getFacultySubjects = async (req, res) => {
  try {
    const { search = '', status, category } = req.query;
    const query = buildFacultySubjectQuery({ search, status, category });

    const { page, limit, skip } = parsePagination(req.query);
    const sort = parseSort(req.query, ['createdAt', 'subjectName', 'facultySubjectId', 'status'], 'createdAt');

    const [rows, total] = await Promise.all([
      FacultySubject.find(query)
        .populate('subject', 'subjectId subjectName')
        .populate('topics', 'topicId topicName')
        .populate('teacher', 'teacherId teacherName centerId')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      FacultySubject.countDocuments(query)
    ]);

    res.json({
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 0,
      count: rows.length,
      data: rows.map(formatFacultySubject)
    });
  } catch (error) {
    console.error('Get facultySubjects error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getFacultySubjectById = async (req, res) => {
  try {
    const doc = await FacultySubject.findOne({ _id: req.params.id, ...NOT_DELETED })
      .populate('subject', 'subjectId subjectName')
      .populate('topics', 'topicId topicName')
      .populate('teacher', 'teacherId teacherName centerId')
      .lean();

    if (!doc) return res.status(404).json({ success: false, message: 'FacultySubject not found' });

    res.json({ success: true, data: formatFacultySubject(doc) });
  } catch (error) {
    console.error('Get facultySubject by id error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateFacultySubject = async (req, res) => {
  try {
    const existing = await FacultySubject.findOne({ _id: req.params.id, ...NOT_DELETED });
    if (!existing) return res.status(404).json({ success: false, message: 'FacultySubject not found' });

    const nextPayload = {
      subjectName: req.body.subjectName ?? existing.subjectName,
      subjectId: req.body.subjectId ?? existing.subject,
      topicIds: req.body.topicIds ?? existing.topics,
      teacherId: req.body.teacherId ?? existing.teacher,
      categories: req.body.categories ?? existing.categories
    };

    const validation = await validateFacultySubjectPayload(nextPayload);
    if (!validation.ok) {
      return res.status(400).json({ success: false, message: validation.message });
    }

    if (req.body.subjectName !== undefined) existing.subjectName = nextPayload.subjectName.trim();
    if (req.body.subjectId !== undefined) existing.subject = validation.subject._id;
    if (req.body.topicIds !== undefined) existing.topics = validation.topics;
    if (req.body.teacherId !== undefined) existing.teacher = validation.teacher._id;
    if (req.body.categories !== undefined) existing.categories = validation.categories;
    if (req.body.status !== undefined) {
      existing.status = req.body.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';
    }

    await existing.save();

    const populated = await FacultySubject.findById(existing._id)
      .populate('subject', 'subjectId subjectName')
      .populate('topics', 'topicId topicName')
      .populate('teacher', 'teacherId teacherName centerId')
      .lean();

    res.json({
      success: true,
      message: 'FacultySubject updated successfully',
      data: formatFacultySubject(populated)
    });
  } catch (error) {
    console.error('Update facultySubject error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateFacultySubjectStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['ACTIVE', 'INACTIVE'].includes(status)) {
      return res.status(400).json({ success: false, message: 'status must be ACTIVE or INACTIVE' });
    }

    const doc = await FacultySubject.findOneAndUpdate(
      { _id: req.params.id, ...NOT_DELETED },
      { status },
      { new: true }
    )
      .populate('subject', 'subjectId subjectName')
      .populate('topics', 'topicId topicName')
      .populate('teacher', 'teacherId teacherName centerId')
      .lean();

    if (!doc) return res.status(404).json({ success: false, message: 'FacultySubject not found' });
    res.json({ success: true, message: 'FacultySubject status updated', data: formatFacultySubject(doc) });
  } catch (error) {
    console.error('Update facultySubject status error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.deleteFacultySubject = async (req, res) => {
  try {
    const doc = await FacultySubject.findOne({ _id: req.params.id, ...NOT_DELETED });
    if (!doc) return res.status(404).json({ success: false, message: 'FacultySubject not found' });

    doc.isDeleted = true;
    doc.deletedAt = new Date();
    doc.status = 'INACTIVE';
    await doc.save();

    res.json({ success: true, message: 'FacultySubject deleted successfully', data: { _id: doc._id } });
  } catch (error) {
    console.error('Delete facultySubject error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
```

> Note: This controller expects you to have already created `Subject`, `Topic`, `Teacher` masters.

---

## 3) `routes/facultySubjectRoutes.js`

```js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { requireSuperAdmin } = require('../middleware/requireSuperAdmin');

const {
  createFacultySubject,
  getFacultySubjects,
  getFacultySubjectById,
  updateFacultySubject,
  updateFacultySubjectStatus,
  deleteFacultySubject
} = require('../controllers/facultySubjectController');

router.use(protect, requireSuperAdmin);

router.post('/', createFacultySubject);
router.get('/', getFacultySubjects);
router.get('/:id', getFacultySubjectById);
router.put('/:id', updateFacultySubject);
router.patch('/status/:id', updateFacultySubjectStatus);
router.delete('/:id', deleteFacultySubject);

module.exports = router;
```

---

## 4) `controllers/batchController.js`

```js
const mongoose = require('mongoose');
const Batch = require('../models/Batch');
const Course = require('../models/Course');

const {
  parsePagination,
  parseSort,
  escapeRegex
} = require('../utils/contentMastersHelpers');

const {
  parseFees,
  validateBatchDates,
  validateDurationInMonths,
  validateFacultySubjectIds,
  validateActiveCourse,
  validateBatchStatus
} = require('../utils/batchFacultyHelpers');

const { generateBatchId } = require('../utils/batchFacultyIdGenerator');
const { NOT_DELETED } = require('../utils/contentMastersHelpers');

const formatBatch = (doc) => ({
  _id: doc._id,
  batchId: doc.batchId,
  batchName: doc.batchName,
  course: doc.course
    ? {
        _id: doc.course._id,
        courseId: doc.course.courseId,
        courseName: doc.course.courseName
      }
    : doc.course,
  commencementDate: doc.commencementDate ?? null,
  durationInMonths: doc.durationInMonths ?? null,
  batchStartDate: doc.batchStartDate ?? null,
  batchEndDate: doc.batchEndDate ?? null,
  bannerImage: doc.bannerImage
    ? { url: doc.bannerImage.url, publicId: doc.bannerImage.publicId }
    : undefined,
  fees: doc.fees,
  facultySubjects: (doc.facultySubjects || []).map((fs) => ({
    _id: fs._id,
    facultySubjectId: fs.facultySubjectId,
    subjectName: fs.subjectName
  })),
  status: doc.status,
  totalStudents: doc.totalStudents ?? 0,
  isDeleted: doc.isDeleted,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt
});

const buildBatchQuery = ({ search = '', courseId, status }) => {
  const query = { ...NOT_DELETED };
  if (status && [
    'ACTIVE',
    'UPCOMING',
    'INACTIVE',
    'COMPLETED',
    'ARCHIVED',
    'CANCELLED'
  ].includes(status)) {
    query.status = status;
  }
  if (courseId && mongoose.Types.ObjectId.isValid(courseId)) {
    query.course = new mongoose.Types.ObjectId(courseId);
  }
  const trimmed = String(search).trim();
  if (trimmed) {
    const regex = new RegExp(escapeRegex(trimmed), 'i');
    query.$or = [{ batchName: regex }, { batchId: regex }];
  }
  return query;
};

exports.createBatch = async (req, res) => {
  try {
    const {
      batchName,
      courseId,
      commencementDate,
      durationInMonths,
      batchStartDate,
      batchEndDate,
      bannerImage,
      fees,
      feesJson,
      facultySubjects = [],
      status
    } = req.body;

    if (!batchName?.trim()) {
      return res.status(400).json({ success: false, message: 'batchName is required' });
    }
    const courseValidation = await validateActiveCourse(courseId);
    if (!courseValidation.ok) {
      return res.status(400).json({ success: false, message: courseValidation.message });
    }

    const fsValidation = await validateFacultySubjectIds(
      facultySubjects.length ? facultySubjects : req.body.facultySubjectIds
    );
    if (!fsValidation.ok) {
      return res.status(400).json({ success: false, message: fsValidation.message });
    }

    const datesValidation = validateBatchDates({
      commencementDate,
      batchStartDate,
      batchEndDate
    });
    if (!datesValidation.ok) {
      return res.status(400).json({ success: false, message: datesValidation.message });
    }

    const durValidation = validateDurationInMonths(durationInMonths);
    if (!durValidation.ok) {
      return res.status(400).json({ success: false, message: durValidation.message });
    }

    const statusValidation = validateBatchStatus(status);
    if (!statusValidation.ok) {
      return res.status(400).json({ success: false, message: statusValidation.message });
    }

    const parsedFees = parseFees({ fees, feesJson });
    if (!parsedFees.ok) {
      return res.status(400).json({ success: false, message: parsedFees.message });
    }

    const batch = await Batch.create({
      batchId: await generateBatchId(),
      batchName: batchName.trim(),
      course: courseValidation.course._id,
      commencementDate: datesValidation.commencementDate,
      durationInMonths: durValidation.value,
      batchStartDate: datesValidation.batchStartDate,
      batchEndDate: datesValidation.batchEndDate,
      bannerImage: bannerImage || undefined,
      fees: parsedFees.value,
      facultySubjects: fsValidation.facultySubjects,
      status: statusValidation.value
    });

    const populated = await Batch.findById(batch._id)
      .populate('course', 'courseId courseName')
      .populate('facultySubjects', 'facultySubjectId subjectName')
      .lean();

    res.status(201).json({
      success: true,
      message: 'Batch created successfully',
      data: formatBatch(populated)
    });
  } catch (error) {
    console.error('Create batch error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getBatches = async (req, res) => {
  try {
    const { search = '', courseId, status } = req.query;
    const query = buildBatchQuery({ search, courseId, status });

    const { page, limit, skip } = parsePagination(req.query);
    const sort = parseSort(req.query, ['createdAt', 'batchName', 'batchId', 'status'], 'createdAt');

    const [rows, total] = await Promise.all([
      Batch.find(query)
        .populate('course', 'courseId courseName')
        .populate('facultySubjects', 'facultySubjectId subjectName')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Batch.countDocuments(query)
    ]);

    res.json({
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 0,
      count: rows.length,
      data: rows.map(formatBatch)
    });
  } catch (error) {
    console.error('Get batches error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getBatchById = async (req, res) => {
  try {
    const batch = await Batch.findOne({ _id: req.params.id, ...NOT_DELETED })
      .populate('course', 'courseId courseName')
      .populate('facultySubjects', 'facultySubjectId subjectName')
      .lean();
    if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });
    res.json({ success: true, data: formatBatch(batch) });
  } catch (error) {
    console.error('Get batch by id error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateBatch = async (req, res) => {
  try {
    const batch = await Batch.findOne({ _id: req.params.id, ...NOT_DELETED });
    if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });

    const updates = {};

    if (req.body.batchName !== undefined) {
      if (!String(req.body.batchName).trim()) {
        return res.status(400).json({ success: false, message: 'batchName cannot be empty' });
      }
      updates.batchName = String(req.body.batchName).trim();
    }

    if (req.body.courseId !== undefined || req.body.course !== undefined) {
      const nextCourseId = req.body.courseId ?? req.body.course;
      const courseValidation = await validateActiveCourse(nextCourseId);
      if (!courseValidation.ok) {
        return res.status(400).json({ success: false, message: courseValidation.message });
      }
      updates.course = courseValidation.course._id;
    }

    if (req.body.facultySubjects !== undefined || req.body.facultySubjectIds !== undefined) {
      const next = req.body.facultySubjects ?? req.body.facultySubjectIds;
      const fsValidation = await validateFacultySubjectIds(next);
      if (!fsValidation.ok) {
        return res.status(400).json({ success: false, message: fsValidation.message });
      }
      updates.facultySubjects = fsValidation.facultySubjects;
    }

    if (
      req.body.commencementDate !== undefined ||
      req.body.batchStartDate !== undefined ||
      req.body.batchEndDate !== undefined
    ) {
      const datesValidation = validateBatchDates({
        commencementDate: req.body.commencementDate ?? batch.commencementDate,
        batchStartDate: req.body.batchStartDate ?? batch.batchStartDate,
        batchEndDate: req.body.batchEndDate ?? batch.batchEndDate
      });
      if (!datesValidation.ok) {
        return res.status(400).json({ success: false, message: datesValidation.message });
      }
      updates.commencementDate = datesValidation.commencementDate;
      updates.batchStartDate = datesValidation.batchStartDate;
      updates.batchEndDate = datesValidation.batchEndDate;
    }

    if (req.body.durationInMonths !== undefined) {
      const durValidation = validateDurationInMonths(req.body.durationInMonths);
      if (!durValidation.ok) {
        return res.status(400).json({ success: false, message: durValidation.message });
      }
      updates.durationInMonths = durValidation.value;
    }

    if (req.body.fees !== undefined || req.body.feesJson !== undefined) {
      const parsedFees = parseFees({ fees: req.body.fees, feesJson: req.body.feesJson });
      if (!parsedFees.ok) {
        return res.status(400).json({ success: false, message: parsedFees.message });
      }
      updates.fees = parsedFees.value;
    }

    if (req.body.status !== undefined) {
      const statusValidation = validateBatchStatus(req.body.status);
      if (!statusValidation.ok) {
        return res.status(400).json({ success: false, message: statusValidation.message });
      }
      updates.status = statusValidation.value;
    }

    await Batch.findByIdAndUpdate(batch._id, { $set: updates }, { new: true });

    const updated = await Batch.findById(batch._id)
      .populate('course', 'courseId courseName')
      .populate('facultySubjects', 'facultySubjectId subjectName')
      .lean();

    res.json({ success: true, message: 'Batch updated successfully', data: formatBatch(updated) });
  } catch (error) {
    console.error('Update batch error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateBatchStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const statusValidation = validateBatchStatus(status);
    if (!statusValidation.ok) {
      return res.status(400).json({ success: false, message: statusValidation.message });
    }

    const batch = await Batch.findOneAndUpdate(
      { _id: req.params.id, ...NOT_DELETED },
      { status: statusValidation.value },
      { new: true }
    )
      .populate('course', 'courseId courseName')
      .populate('facultySubjects', 'facultySubjectId subjectName')
      .lean();

    if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });

    res.json({ success: true, message: 'Batch status updated', data: formatBatch(batch) });
  } catch (error) {
    console.error('Update batch status error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.deleteBatch = async (req, res) => {
  try {
    const batch = await Batch.findOne({ _id: req.params.id, ...NOT_DELETED });
    if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });

    batch.isDeleted = true;
    batch.deletedAt = new Date();
    batch.status = 'INACTIVE';
    await batch.save();

    res.json({ success: true, message: 'Batch deleted successfully', data: { _id: batch._id } });
  } catch (error) {
    console.error('Delete batch error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
```

---

## 5) `routes/batchRoutes.js`

```js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { requireSuperAdmin } = require('../middleware/requireSuperAdmin');

const {
  createBatch,
  getBatches,
  getBatchById,
  updateBatch,
  updateBatchStatus,
  deleteBatch
} = require('../controllers/batchController');

router.use(protect, requireSuperAdmin);

router.post('/', createBatch);
router.get('/', getBatches);
router.get('/:id', getBatchById);
router.put('/:id', updateBatch);
router.patch('/status/:id', updateBatchStatus);
router.delete('/:id', deleteBatch);

module.exports = router;
```

---

## 6) `app.js` route registration

Add these (near other `/api/...` routes):

```js
const facultySubjectRoutes = require('./routes/facultySubjectRoutes');
const batchRoutes = require('./routes/batchRoutes');

app.use('/api/faculty-subjects', facultySubjectRoutes);
app.use('/api/batches', batchRoutes);
```

---

## What to test first (recommended)

1. Create `Subject`
2. Create `Topic` under `Subject`
3. Create `Teacher` with `centerId` + `subjects[]`
4. Create `FacultySubject` (Subject + Topics[] + Teacher + Categories[])
5. Create `Batch` (course + facultySubjects[] + dates + fees)

---

## Next step

If you want, I can also generate an updated Postman collection that auto-creates the full chain end-to-end (subject → topic → teacher → facultySubject → batch) using the dropdown helpers you already built.

