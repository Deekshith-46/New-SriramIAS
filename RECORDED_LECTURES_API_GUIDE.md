# Recorded Lectures LMS — API Guide & Complete Source Code

**Base URL:** `http://localhost:5000`  
**Postman collection:** [`RECORDED_LECTURES_POSTMAN_COLLECTION.json`](./RECORDED_LECTURES_POSTMAN_COLLECTION.json)  
**Auth:** `Authorization: Bearer <JWT_TOKEN>`

My Courses → Recordings module. Reuses enrollment validation from live classes (`active` / `pending`, `accessEndsAt` / `validUntil`).

---

## Quick start

1. Import `RECORDED_LECTURES_POSTMAN_COLLECTION.json` into Postman.
2. Set collection variables: `baseUrl`, `studentToken`, `adminToken`, `courseId`, `subjectId`, `lectureId`.
3. Student: `POST /api/auth/send-otp` → `POST /api/auth/verify-otp` → copy token to `studentToken`.
4. Admin: use center_admin / super_admin login token in `adminToken`.

---

## Production features

| Feature | Details |
|---------|---------|
| Soft delete | Subjects + lectures (`isDeleted`); subject delete cascades to lectures |
| Course progress | `GET /api/course-progress/:courseId` — overall %, subjects completed |
| Continue watching | `POST /api/course-progress/last-opened` |
| Video duration | From Cloudinary metadata (do not send `videoDuration` from frontend) |
| Pagination | `GET .../subject/:id?page=1&limit=20` |
| Quiz validation | 4 options, `correctAnswer` 0–3; hidden from student GET |
| Reorder | `PUT /api/course-subjects/reorder`, `PUT /api/recorded-lectures/reorder` |
| Upload rollback | Failed create/update cleans new Cloudinary uploads |
| Student sanitize | No `public_id` in student responses |
| Rate limits | Progress: 30/min, Notes: 20/min per IP |

**Deferred:** signed video URLs, search, bookmarks, watch heartbeat.

---

## Student flow

```
GET  /api/payments/course/my-enrollments
GET  /api/course-subjects/course/:courseId/grouped
GET  /api/course-progress/:courseId
GET  /api/recorded-lectures/:lectureId
POST /api/course-progress/last-opened
POST /api/lecture-notes
POST /api/lecture-progress
POST /api/lecture-quiz-attempts
POST /api/lecture-answers
```

---

## Admin flow

```
POST   /api/course-subjects
PUT    /api/course-subjects/reorder
POST   /api/recorded-lectures          (multipart)
PUT    /api/recorded-lectures/reorder
PUT    /api/recorded-lectures/:id
DELETE /api/course-subjects/:id          (soft + cascade)
DELETE /api/recorded-lectures/:id        (permanent hard delete)
```

---

## API reference

### Enrollment (existing)

| Method | Path | Access |
|--------|------|--------|
| GET | `/api/payments/course/my-enrollments` | Student |

### Course subjects

| Method | Path | Access |
|--------|------|--------|
| POST | `/api/course-subjects` | Admin |
| PUT | `/api/course-subjects/reorder` | Admin |
| GET | `/api/course-subjects/course/:courseId` | Student |
| GET | `/api/course-subjects/course/:courseId/grouped` | Student |
| GET | `/api/course-subjects/admin/course/:courseId` | Admin |
| PUT | `/api/course-subjects/:id` | Admin |
| DELETE | `/api/course-subjects/:id` | Admin (soft + cascade lectures) |

**Create subject (POST):**
```json
{ "courseId": "...", "title": "Geography" }
```

**Update subject (PUT):**
```json
{ "title": "Geography Updated" }
```

**Subject response fields:** `_id`, `courseId`, `title`, `isActive`, `isDeleted`, `deletedAt`, `createdBy`, `createdAt`, `updatedAt` — `description` and `order` are not returned (stored internally only for reorder).

**Reorder subjects:**
```json
{
  "courseId": "...",
  "items": [{ "id": "SUBJECT_ID", "order": 0 }]
}
```

### Recorded lectures

| Method | Path | Access |
|--------|------|--------|
| POST | `/api/recorded-lectures` | Admin (multipart) |
| PUT | `/api/recorded-lectures/reorder` | Admin |
| GET | `/api/recorded-lectures/subject/:subjectId?page=1&limit=20` | Student |
| GET | `/api/recorded-lectures/admin/subject/:subjectId` | Admin |
| GET | `/api/recorded-lectures/:id` | Student / Admin |
| PUT | `/api/recorded-lectures/:id` | Admin |
| DELETE | `/api/recorded-lectures/:id` | Admin (permanent — removes DB record, Cloudinary files, notes, progress, quiz, answers) |

**Multipart fields (required):** `courseId`, `subjectId`, `lectureTitle`  
**Optional:** `lectureDescription`, `isPublished`, `thumbnail`, `video`, `cheatSheetPdf`, `cheatSheet` (JSON), `topicQuiz` (JSON), `mainsQuestion` (JSON)

`order` is auto-assigned per subject (1st lecture = 0, 2nd = 1, …). Use `PUT /api/recorded-lectures/reorder` to change display order.

`isPreviewFree` is not used — access is controlled by **course enrollment** only (see below).

**topicQuiz example:**
```json
[
  {
    "question": "Which is the largest ocean?",
    "options": ["Atlantic", "Pacific", "Indian", "Arctic"],
    "correctAnswer": 1,
    "explanation": "Pacific is the largest."
  }
]
```

**Paginated response:**
```json
{
  "success": true,
  "count": 10,
  "total": 45,
  "page": 1,
  "limit": 20,
  "totalPages": 3,
  "data": []
}
```

### Course progress

| Method | Path | Body |
|--------|------|------|
| GET | `/api/course-progress/:courseId` | — |
| POST | `/api/course-progress/last-opened` | `{ "courseId", "lectureId" }` |

**Course progress response fields:** `completedLectures`, `totalLectures`, `progressPercent`, `completedSubjects`, `totalSubjects`, `lastOpenedLectureId`.

### Lecture notes

| Method | Path | Body |
|--------|------|------|
| POST | `/api/lecture-notes` | `{ "lectureId", "noteText" }` (max 20000 chars, upsert) |
| GET | `/api/lecture-notes/:lectureId` | — |

### Lecture progress

| Method | Path | Body |
|--------|------|------|
| POST | `/api/lecture-progress` | `{ "lectureId", "watchedDuration" }` |
| GET | `/api/lecture-progress/:lectureId` | — |

Returns `courseProgress` on POST. Completion when watched ≥ 90% of server `video.duration`.

### Topic quiz

| Method | Path | Body |
|--------|------|------|
| POST | `/api/lecture-quiz-attempts` | `{ "lectureId", "answers": [{ "questionIndex": 0, "selectedOption": 1 }] }` |
| GET | `/api/lecture-quiz-attempts/:lectureId` | — |

### Mains answer

| Method | Path | Body |
|--------|------|------|
| POST | `/api/lecture-answers` | `{ "lectureId", "answerText" }` (upsert) |
| GET | `/api/lecture-answers/:lectureId` | — |

---

## Security

- All routes require JWT (`protect` middleware).
- Students: `assertEnrollmentAccess` on course (active/pending enrollment required).
- Admins: `center_admin` limited to own center courses.
- Quiz answers/explanations only returned after quiz submit.
- Student lecture responses exclude Cloudinary `public_id`.

---

## File structure

```
models/         CourseSubject, RecordedLecture, CourseProgress, LectureNote,
                LectureProgress, LectureQuizAttempt, LectureAnswer
utils/          courseAccess, lectureHelpers, courseProgressService, pagination
middleware/     uploadRecordedLecture.js (200MB)
controllers/    courseSubject, recordedLecture, courseProgress, lectureNote,
                lectureProgress, lectureQuizAttempt, lectureAnswer
routes/         matching route files
app.js          mounts + rate limiters
```

---

## Sample grouped response

`GET http://localhost:5000/api/course-subjects/course/:courseId/grouped`

```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "subject": { "_id": "...", "title": "Geography", "order": 0 },
      "lectures": [
        {
          "_id": "...",
          "lectureTitle": "Intro",
          "video": { "url": "https://...", "duration": 1200 },
          "progressPercent": 80,
          "isCompleted": false
        }
      ]
    }
  ]
}
```

---

## Complete source code

> Synced from repository. Import Postman: RECORDED_LECTURES_POSTMAN_COLLECTION.json

### utils/courseAccess.js

`javascript
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');

const ACTIVE_ENROLLMENT_STATUSES = ['active', 'pending'];

const getActiveEnrollment = async (userId, courseId) => {
  return Enrollment.findOne({
    userId,
    courseId,
    status: { $in: ACTIVE_ENROLLMENT_STATUSES },
    isDeleted: false,
    accessBlocked: { $ne: true }
  });
};

const isEnrollmentAccessValid = (enrollment) => {
  if (!enrollment) return false;

  const now = new Date();
  if (enrollment.accessEndsAt && now > enrollment.accessEndsAt) return false;
  if (enrollment.validUntil && now > enrollment.validUntil) return false;

  return true;
};

const assertEnrollmentAccess = async (req, res, courseId) => {
  const enrollment = await getActiveEnrollment(req.user._id, courseId);

  if (!enrollment || !isEnrollmentAccessValid(enrollment)) {
    res.status(403).json({
      success: false,
      message: 'Access denied. You are not enrolled in this course or access has expired.'
    });
    return null;
  }

  return enrollment;
};

const getCourseForAdmin = async (req, res, courseId) => {
  const course = await Course.findById(courseId);

  if (!course) {
    res.status(404).json({ success: false, message: 'Course not found' });
    return null;
  }

  if (req.user.role === 'center_admin') {
    const userCenter = req.user.center?.toString();
    const courseCenter = course.center?.toString();

    if (!userCenter || userCenter !== courseCenter) {
      res.status(403).json({
        success: false,
        message: 'You can only manage content for your own center courses'
      });
      return null;
    }
  }

  return course;
};

const parseJsonField = (value) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
};

module.exports = {
  ACTIVE_ENROLLMENT_STATUSES,
  getActiveEnrollment,
  isEnrollmentAccessValid,
  assertEnrollmentAccess,
  getCourseForAdmin,
  parseJsonField
};

`

### utils/lectureHelpers.js

`javascript
const cloudinary = require('../config/cloudinary');

const NOT_DELETED = { isDeleted: false };

const stripQuizAnswers = (lecture) => {
  const doc = lecture.toObject ? lecture.toObject() : { ...lecture };
  if (Array.isArray(doc.topicQuiz)) {
    doc.topicQuiz = doc.topicQuiz.map((q) => ({
      question: q.question,
      options: q.options
    }));
  }
  return doc;
};

const sanitizeLectureForStudent = (lecture) => {
  const doc = stripQuizAnswers(lecture);

  if (doc.thumbnail) {
    doc.thumbnail = { url: doc.thumbnail.url || null };
  }

  if (doc.video) {
    doc.video = {
      url: doc.video.url || null,
      duration: doc.video.duration || 0
    };
  }

  if (doc.cheatSheet?.pdf) {
    doc.cheatSheet = {
      ...doc.cheatSheet,
      pdf: { url: doc.cheatSheet.pdf.url || null }
    };
  }

  return doc;
};

const validateTopicQuiz = (quiz) => {
  if (!Array.isArray(quiz)) {
    return 'topicQuiz must be an array';
  }

  for (let i = 0; i < quiz.length; i++) {
    const q = quiz[i];
    if (!q?.question?.trim()) {
      return `Question ${i + 1}: question is required`;
    }
    if (!Array.isArray(q.options) || q.options.length !== 4) {
      return `Question ${i + 1}: exactly 4 options are required`;
    }
    if (q.options.some((opt) => !String(opt).trim())) {
      return `Question ${i + 1}: all options must be non-empty`;
    }
    const correct = Number(q.correctAnswer);
    if (!Number.isInteger(correct) || correct < 0 || correct > 3) {
      return `Question ${i + 1}: correctAnswer must be 0–3`;
    }
  }

  return null;
};

const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (error) {
    console.error('Cloudinary delete error:', error.message);
  }
};

const cleanupUploads = async (uploads) => {
  if (!uploads) return;
  if (uploads.thumbnail?.public_id) {
    await deleteFromCloudinary(uploads.thumbnail.public_id, 'image');
  }
  if (uploads.video?.public_id) {
    await deleteFromCloudinary(uploads.video.public_id, 'video');
  }
  if (uploads.cheatSheetPdf?.public_id) {
    await deleteFromCloudinary(uploads.cheatSheetPdf.public_id, 'raw');
  }
};

const getVideoDurationFromUpload = (videoUpload) => {
  if (!videoUpload) return 0;
  const duration = Number(videoUpload.duration);
  return Number.isFinite(duration) && duration > 0 ? Math.round(duration) : 0;
};

module.exports = {
  NOT_DELETED,
  stripQuizAnswers,
  sanitizeLectureForStudent,
  validateTopicQuiz,
  deleteFromCloudinary,
  cleanupUploads,
  getVideoDurationFromUpload
};

`

### utils/courseProgressService.js

`javascript
const CourseProgress = require('../models/CourseProgress');
const CourseSubject = require('../models/CourseSubject');
const RecordedLecture = require('../models/RecordedLecture');
const LectureProgress = require('../models/LectureProgress');
const { NOT_DELETED } = require('./lectureHelpers');

const syncCourseProgress = async (userId, courseId, lastOpenedLectureId = null) => {
  const lectureFilter = {
    courseId,
    isPublished: true,
    ...NOT_DELETED
  };

  const totalLectures = await RecordedLecture.countDocuments(lectureFilter);

  const publishedLectures = await RecordedLecture.find(lectureFilter).select('_id subjectId').lean();
  const publishedIds = publishedLectures.map((l) => l._id);

  const completedLectures = publishedIds.length
    ? await LectureProgress.countDocuments({
        userId,
        lectureId: { $in: publishedIds },
        isCompleted: true
      })
    : 0;

  const subjects = await CourseSubject.find({
    courseId,
    isActive: true,
    ...NOT_DELETED
  }).select('_id').lean();

  const totalSubjects = subjects.length;
  let completedSubjects = 0;

  for (const subject of subjects) {
    const subjectLectureIds = publishedLectures
      .filter((l) => l.subjectId.toString() === subject._id.toString())
      .map((l) => l._id);

    if (!subjectLectureIds.length) continue;

    const subjectCompleted = await LectureProgress.countDocuments({
      userId,
      lectureId: { $in: subjectLectureIds },
      isCompleted: true
    });

    if (subjectCompleted === subjectLectureIds.length) {
      completedSubjects += 1;
    }
  }

  const progressPercent = totalLectures > 0
    ? Math.min(100, Math.round((completedLectures / totalLectures) * 100))
    : 0;

  const update = {
    completedLectures,
    totalLectures,
    progressPercent,
    completedSubjects,
    totalSubjects,
    lastWatchedAt: new Date()
  };

  if (lastOpenedLectureId) {
    update.lastOpenedLectureId = lastOpenedLectureId;
  }

  return CourseProgress.findOneAndUpdate(
    { userId, courseId },
    update,
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
};

module.exports = { syncCourseProgress };

`

### utils/pagination.js

`javascript
const getPagination = (query, defaultLimit = 20, maxLimit = 50) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

const paginatedResponse = (data, total, page, limit) => ({
  success: true,
  count: data.length,
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit) || 1,
  data
});

module.exports = { getPagination, paginatedResponse };

`

### utils/uploadToCloudinary.js

`javascript
const cloudinary = require('../config/cloudinary');

const uploadToCloudinary = async (file, folder = 'courses', resourceType = 'auto', format = null) => {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder: folder,
      resource_type: resourceType // 'auto' for images/videos, 'raw' for PDFs
    };

    // Add format if specified (e.g., 'pdf' for brochures)
    if (format) {
      uploadOptions.format = format;
    }

    cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve({
            url: result.secure_url,
            public_id: result.public_id,
            format: result.format,
            duration: result.duration ? Math.round(result.duration) : 0,
            bytes: result.bytes
          });
        }
      }
    ).end(file.buffer);
  });
};

module.exports = uploadToCloudinary;

`

### models/CourseSubject.js

`javascript
const mongoose = require('mongoose');

const courseSubjectSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  order: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  deletedAt: {
    type: Date,
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

courseSubjectSchema.index({ courseId: 1, order: 1 });

module.exports = mongoose.model('CourseSubject', courseSubjectSchema);

`

### models/RecordedLecture.js

`javascript
const mongoose = require('mongoose');

const quizQuestionSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
    trim: true
  },
  options: {
    type: [String],
    validate: {
      validator: (v) => Array.isArray(v) && v.length === 4 && v.every((o) => String(o).trim()),
      message: 'Each quiz question must have exactly 4 non-empty options'
    }
  },
  correctAnswer: {
    type: Number,
    required: true,
    min: 0,
    max: 3
  },
  explanation: {
    type: String,
    default: ''
  }
}, { _id: false });

const cheatSheetSchema = new mongoose.Schema({
  title: String,
  paragraph: String,
  pdf: {
    url: String,
    public_id: String
  }
}, { _id: false });

const mainsQuestionSchema = new mongoose.Schema({
  question: String
}, { _id: false });

const recordedLectureSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
    index: true
  },
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CourseSubject',
    required: true,
    index: true
  },
  lectureTitle: {
    type: String,
    required: true,
    trim: true
  },
  lectureDescription: {
    type: String,
    default: ''
  },
  thumbnail: {
    url: String,
    public_id: String
  },
  video: {
    url: String,
    public_id: String,
    duration: Number
  },
  order: {
    type: Number,
    default: 0
  },
  cheatSheet: cheatSheetSchema,
  topicQuiz: [quizQuestionSchema],
  mainsQuestion: mainsQuestionSchema,
  isPreviewFree: {
    type: Boolean,
    default: false
  },
  isPublished: {
    type: Boolean,
    default: true
  },
  publishedAt: {
    type: Date,
    default: null
  },
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  deletedAt: {
    type: Date,
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

recordedLectureSchema.index({ courseId: 1, subjectId: 1, order: 1 });

module.exports = mongoose.model('RecordedLecture', recordedLectureSchema);

`

### models/CourseProgress.js

`javascript
const mongoose = require('mongoose');

const courseProgressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  completedLectures: {
    type: Number,
    default: 0
  },
  totalLectures: {
    type: Number,
    default: 0
  },
  progressPercent: {
    type: Number,
    default: 0
  },
  completedSubjects: {
    type: Number,
    default: 0
  },
  totalSubjects: {
    type: Number,
    default: 0
  },
  lastOpenedLectureId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RecordedLecture',
    default: null
  },
  lastWatchedAt: Date
}, { timestamps: true });

courseProgressSchema.index({ userId: 1, courseId: 1 }, { unique: true });

module.exports = mongoose.model('CourseProgress', courseProgressSchema);

`

### models/LectureNote.js

`javascript
const mongoose = require('mongoose');

const lectureNoteSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lectureId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RecordedLecture',
    required: true
  },
  noteText: {
    type: String,
    default: '',
    maxlength: 20000
  }
}, { timestamps: true });

lectureNoteSchema.index({ userId: 1, lectureId: 1 }, { unique: true });

module.exports = mongoose.model('LectureNote', lectureNoteSchema);

`

### models/LectureProgress.js

`javascript
const mongoose = require('mongoose');

const lectureProgressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lectureId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RecordedLecture',
    required: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  watchedDuration: {
    type: Number,
    default: 0
  },
  totalDuration: {
    type: Number,
    default: 0
  },
  progressPercent: {
    type: Number,
    default: 0
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  lastWatchedAt: Date
}, { timestamps: true });

lectureProgressSchema.index({ userId: 1, lectureId: 1 }, { unique: true });
lectureProgressSchema.index({ userId: 1, courseId: 1 });

module.exports = mongoose.model('LectureProgress', lectureProgressSchema);

`

### models/LectureQuizAttempt.js

`javascript
const mongoose = require('mongoose');

const lectureQuizAttemptSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lectureId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RecordedLecture',
    required: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  answers: [{
    questionIndex: Number,
    selectedOption: Number,
    isCorrect: Boolean
  }],
  score: Number,
  totalQuestions: Number
}, { timestamps: true });

lectureQuizAttemptSchema.index({ userId: 1, lectureId: 1, createdAt: -1 });

module.exports = mongoose.model('LectureQuizAttempt', lectureQuizAttemptSchema);

`

### models/LectureAnswer.js

`javascript
const mongoose = require('mongoose');

const lectureAnswerSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lectureId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RecordedLecture',
    required: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  answerText: {
    type: String,
    default: ''
  }
}, { timestamps: true });

lectureAnswerSchema.index({ userId: 1, lectureId: 1 }, { unique: true });

module.exports = mongoose.model('LectureAnswer', lectureAnswerSchema);

`

### middleware/uploadRecordedLecture.js

`javascript
const multer = require('multer');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif',
    'image/gif',
    'video/mp4',
    'application/pdf'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, MP4 videos, and PDFs are allowed.'), false);
  }
};

const uploadRecordedLecture = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 200 * 1024 * 1024
  }
});

module.exports = uploadRecordedLecture;

`

### controllers/courseSubjectController.js

`javascript
const CourseSubject = require('../models/CourseSubject');
const RecordedLecture = require('../models/RecordedLecture');
const LectureProgress = require('../models/LectureProgress');
const {
  assertEnrollmentAccess,
  getCourseForAdmin
} = require('../utils/courseAccess');
const { NOT_DELETED, sanitizeLectureForStudent } = require('../utils/lectureHelpers');

exports.createSubject = async (req, res) => {
  try {
    const { courseId, title } = req.body;

    if (!courseId || !title?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'courseId and title are required'
      });
    }

    const course = await getCourseForAdmin(req, res, courseId);
    if (!course) return;

    const subject = await CourseSubject.create({
      courseId,
      title: title.trim(),
      createdBy: req.user._id
    });

    res.status(201).json({ success: true, data: formatSubject(subject) });
  } catch (error) {
    console.error('Create Subject Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getSubjectsByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    const enrollment = await assertEnrollmentAccess(req, res, courseId);
    if (!enrollment) return;

    const subjects = await CourseSubject.find({ courseId, isActive: true, ...NOT_DELETED })
      .sort({ order: 1, createdAt: 1 });

    res.json({ success: true, count: subjects.length, data: subjects });
  } catch (error) {
    console.error('Get Subjects Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getSubjectsGrouped = async (req, res) => {
  try {
    const { courseId } = req.params;

    const enrollment = await assertEnrollmentAccess(req, res, courseId);
    if (!enrollment) return;

    const subjects = await CourseSubject.find({ courseId, isActive: true, ...NOT_DELETED })
      .sort({ order: 1, createdAt: 1 })
      .lean();

    const subjectIds = subjects.map((s) => s._id);
    const lectures = subjectIds.length
      ? await RecordedLecture.find({
          courseId,
          subjectId: { $in: subjectIds },
          isPublished: true,
          ...NOT_DELETED
        })
          .select('subjectId lectureTitle lectureDescription thumbnail video order isPreviewFree')
          .sort({ order: 1, createdAt: 1 })
          .lean()
      : [];

    const lectureIds = lectures.map((l) => l._id);
    const progressList = lectureIds.length
      ? await LectureProgress.find({
          userId: req.user._id,
          lectureId: { $in: lectureIds }
        }).lean()
      : [];

    const progressMap = new Map(
      progressList.map((p) => [p.lectureId.toString(), p])
    );

    const lecturesBySubject = new Map();
    for (const lecture of lectures) {
      const key = lecture.subjectId.toString();
      const progress = progressMap.get(lecture._id.toString());
      const entry = {
        ...sanitizeLectureForStudent(lecture),
        progressPercent: progress?.progressPercent ?? 0,
        isCompleted: progress?.isCompleted ?? false
      };
      if (!lecturesBySubject.has(key)) lecturesBySubject.set(key, []);
      lecturesBySubject.get(key).push(entry);
    }

    const data = subjects.map((subject) => ({
      subject,
      lectures: lecturesBySubject.get(subject._id.toString()) || []
    }));

    res.json({ success: true, count: data.length, data });
  } catch (error) {
    console.error('Get Grouped Subjects Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getSubjectsByCourseAdmin = async (req, res) => {
  try {
    const { courseId } = req.params;
    const includeDeleted = req.query.includeDeleted === 'true';

    const course = await getCourseForAdmin(req, res, courseId);
    if (!course) return;

    const filter = { courseId };
    if (!includeDeleted) Object.assign(filter, NOT_DELETED);

    const subjects = await CourseSubject.find(filter).sort({ order: 1, createdAt: 1 });

    res.json({ success: true, count: subjects.length, data: subjects });
  } catch (error) {
    console.error('Admin Get Subjects Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateSubject = async (req, res) => {
  try {
    const subject = await CourseSubject.findOne({ _id: req.params.id, ...NOT_DELETED });
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    const course = await getCourseForAdmin(req, res, subject.courseId);
    if (!course) return;

    const { title } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'title is required'
      });
    }

    subject.title = title.trim();

    await subject.save();

    res.json({ success: true, data: subject });
  } catch (error) {
    console.error('Update Subject Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.deleteSubject = async (req, res) => {
  try {
    const subject = await CourseSubject.findOne({ _id: req.params.id, ...NOT_DELETED });
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    const course = await getCourseForAdmin(req, res, subject.courseId);
    if (!course) return;

    const now = new Date();
    subject.isDeleted = true;
    subject.deletedAt = now;
    subject.isActive = false;
    await subject.save();

    await RecordedLecture.updateMany(
      { subjectId: subject._id, ...NOT_DELETED },
      { $set: { isDeleted: true, deletedAt: now, isPublished: false } }
    );

    res.json({
      success: true,
      message: 'Subject and its lectures soft-deleted successfully'
    });
  } catch (error) {
    console.error('Delete Subject Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.reorderSubjects = async (req, res) => {
  try {
    const { courseId, items } = req.body;

    if (!courseId || !Array.isArray(items) || !items.length) {
      return res.status(400).json({
        success: false,
        message: 'courseId and items array are required'
      });
    }

    const course = await getCourseForAdmin(req, res, courseId);
    if (!course) return;

    const bulkOps = items.map((item) => ({
      updateOne: {
        filter: { _id: item.id, courseId, ...NOT_DELETED },
        update: { $set: { order: item.order } }
      }
    }));

    await CourseSubject.bulkWrite(bulkOps);

    const subjects = await CourseSubject.find({ courseId, ...NOT_DELETED })
      .sort({ order: 1, createdAt: 1 });

    res.json({ success: true, data: subjects });
  } catch (error) {
    console.error('Reorder Subjects Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

`

### controllers/recordedLectureController.js

`javascript
const RecordedLecture = require('../models/RecordedLecture');
const CourseSubject = require('../models/CourseSubject');
const LectureProgress = require('../models/LectureProgress');
const uploadToCloudinary = require('../utils/uploadToCloudinary');
const { getPagination, paginatedResponse } = require('../utils/pagination');
const {
  assertEnrollmentAccess,
  getCourseForAdmin,
  parseJsonField
} = require('../utils/courseAccess');
const {
  NOT_DELETED,
  sanitizeLectureForStudent,
  validateTopicQuiz,
  deleteFromCloudinary,
  cleanupUploads,
  getVideoDurationFromUpload
} = require('../utils/lectureHelpers');

const uploadLectureFiles = async (files) => {
  const uploads = {};

  if (files?.thumbnail?.[0]) {
    uploads.thumbnail = await uploadToCloudinary(
      files.thumbnail[0],
      'courses/recorded/thumbnails',
      'image'
    );
  }

  if (files?.video?.[0]) {
    uploads.video = await uploadToCloudinary(
      files.video[0],
      'courses/recorded/videos',
      'video'
    );
  }

  if (files?.cheatSheetPdf?.[0]) {
    uploads.cheatSheetPdf = await uploadToCloudinary(
      files.cheatSheetPdf[0],
      'courses/recorded/cheat-sheets',
      'raw',
      'pdf'
    );
  }

  return uploads;
};

const applyPublishState = (lecture, isPublished) => {
  lecture.isPublished = isPublished;
  if (isPublished && !lecture.publishedAt) {
    lecture.publishedAt = new Date();
  }
};

exports.createLecture = async (req, res) => {
  let uploads = null;

  try {
    const {
      courseId,
      subjectId,
      lectureTitle,
      lectureDescription,
      order,
      isPreviewFree,
      isPublished
    } = req.body;

    if (!courseId || !subjectId || !lectureTitle) {
      return res.status(400).json({
        success: false,
        message: 'courseId, subjectId, and lectureTitle are required'
      });
    }

    const course = await getCourseForAdmin(req, res, courseId);
    if (!course) return;

    const subject = await CourseSubject.findOne({ _id: subjectId, courseId, ...NOT_DELETED });
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found for this course' });
    }

    const topicQuiz = parseJsonField(req.body.topicQuiz) || [];
    const quizError = validateTopicQuiz(topicQuiz);
    if (quizError) {
      return res.status(400).json({ success: false, message: quizError });
    }

    uploads = await uploadLectureFiles(req.files);
    const cheatSheet = parseJsonField(req.body.cheatSheet) || {};
    const mainsQuestion = parseJsonField(req.body.mainsQuestion) || {};

    if (uploads.cheatSheetPdf) {
      cheatSheet.pdf = {
        url: uploads.cheatSheetPdf.url,
        public_id: uploads.cheatSheetPdf.public_id
      };
    }

    const published = isPublished !== false && isPublished !== 'false';
    const lecture = await RecordedLecture.create({
      courseId,
      subjectId,
      lectureTitle,
      lectureDescription,
      order: order ?? 0,
      thumbnail: uploads.thumbnail || undefined,
      video: uploads.video
        ? {
            url: uploads.video.url,
            public_id: uploads.video.public_id,
            duration: getVideoDurationFromUpload(uploads.video)
          }
        : undefined,
      cheatSheet: Object.keys(cheatSheet).length ? cheatSheet : undefined,
      topicQuiz,
      mainsQuestion: Object.keys(mainsQuestion).length ? mainsQuestion : undefined,
      isPreviewFree: isPreviewFree === true || isPreviewFree === 'true',
      isPublished: published,
      publishedAt: published ? new Date() : null,
      createdBy: req.user._id
    });

    res.status(201).json({ success: true, data: lecture });
  } catch (error) {
    await cleanupUploads(uploads);
    console.error('Create Lecture Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getLecturesBySubject = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const { page, limit, skip } = getPagination(req.query);

    const subject = await CourseSubject.findOne({ _id: subjectId, ...NOT_DELETED });
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    const enrollment = await assertEnrollmentAccess(req, res, subject.courseId);
    if (!enrollment) return;

    const filter = { subjectId, isPublished: true, ...NOT_DELETED };
    const total = await RecordedLecture.countDocuments(filter);

    const lectures = await RecordedLecture.find(filter)
      .sort({ order: 1, createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const lectureIds = lectures.map((l) => l._id);
    const progressList = lectureIds.length
      ? await LectureProgress.find({
          userId: req.user._id,
          lectureId: { $in: lectureIds }
        }).lean()
      : [];

    const progressMap = new Map(
      progressList.map((p) => [p.lectureId.toString(), p])
    );

    const data = lectures.map((lecture) => {
      const progress = progressMap.get(lecture._id.toString());
      return {
        ...sanitizeLectureForStudent(lecture),
        progressPercent: progress?.progressPercent ?? 0,
        isCompleted: progress?.isCompleted ?? false
      };
    });

    res.json(paginatedResponse(data, total, page, limit));
  } catch (error) {
    console.error('Get Lectures Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getLecturesBySubjectAdmin = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const includeDeleted = req.query.includeDeleted === 'true';

    const subject = await CourseSubject.findById(subjectId);
    if (!subject || (!includeDeleted && subject.isDeleted)) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    const course = await getCourseForAdmin(req, res, subject.courseId);
    if (!course) return;

    const filter = { subjectId };
    if (!includeDeleted) Object.assign(filter, NOT_DELETED);

    const lectures = await RecordedLecture.find(filter).sort({ order: 1, createdAt: 1 });

    res.json({ success: true, count: lectures.length, data: lectures });
  } catch (error) {
    console.error('Admin Get Lectures Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getLectureById = async (req, res) => {
  try {
    const lecture = await RecordedLecture.findById(req.params.id);
    if (!lecture || lecture.isDeleted) {
      return res.status(404).json({ success: false, message: 'Lecture not found' });
    }

    if (!lecture.isPublished && !['super_admin', 'center_admin'].includes(req.user.role)) {
      return res.status(404).json({ success: false, message: 'Lecture not found' });
    }

    const isAdmin = ['super_admin', 'center_admin'].includes(req.user.role);

    if (!isAdmin) {
      if (!lecture.isPreviewFree) {
        const enrollment = await assertEnrollmentAccess(req, res, lecture.courseId);
        if (!enrollment) return;
      }

      return res.json({ success: true, data: sanitizeLectureForStudent(lecture) });
    }

    const course = await getCourseForAdmin(req, res, lecture.courseId);
    if (!course) return;

    res.json({ success: true, data: lecture });
  } catch (error) {
    console.error('Get Lecture Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateLecture = async (req, res) => {
  let uploads = null;
  const oldAssets = { thumbnail: null, video: null, cheatSheetPdf: null };

  try {
    const lecture = await RecordedLecture.findOne({ _id: req.params.id, ...NOT_DELETED });
    if (!lecture) {
      return res.status(404).json({ success: false, message: 'Lecture not found' });
    }

    const course = await getCourseForAdmin(req, res, lecture.courseId);
    if (!course) return;

    const topicQuiz = parseJsonField(req.body.topicQuiz);
    if (topicQuiz) {
      const quizError = validateTopicQuiz(topicQuiz);
      if (quizError) {
        return res.status(400).json({ success: false, message: quizError });
      }
      lecture.topicQuiz = topicQuiz;
    }

    uploads = await uploadLectureFiles(req.files);

    if (uploads.thumbnail) {
      oldAssets.thumbnail = lecture.thumbnail?.public_id;
      lecture.thumbnail = uploads.thumbnail;
    }

    if (uploads.video) {
      oldAssets.video = lecture.video?.public_id;
      lecture.video = {
        url: uploads.video.url,
        public_id: uploads.video.public_id,
        duration: getVideoDurationFromUpload(uploads.video) || lecture.video?.duration || 0
      };
    }

    const cheatSheet = parseJsonField(req.body.cheatSheet);
    if (cheatSheet) {
      if (uploads.cheatSheetPdf) {
        oldAssets.cheatSheetPdf = lecture.cheatSheet?.pdf?.public_id;
        cheatSheet.pdf = {
          url: uploads.cheatSheetPdf.url,
          public_id: uploads.cheatSheetPdf.public_id
        };
      }
      lecture.cheatSheet = cheatSheet;
    } else if (uploads.cheatSheetPdf) {
      oldAssets.cheatSheetPdf = lecture.cheatSheet?.pdf?.public_id;
      lecture.cheatSheet = {
        ...(lecture.cheatSheet?.toObject?.() || lecture.cheatSheet || {}),
        pdf: {
          url: uploads.cheatSheetPdf.url,
          public_id: uploads.cheatSheetPdf.public_id
        }
      };
    }

    const mainsQuestion = parseJsonField(req.body.mainsQuestion);
    if (mainsQuestion) lecture.mainsQuestion = mainsQuestion;

    const fields = ['lectureTitle', 'lectureDescription', 'order', 'isPreviewFree', 'subjectId'];

    for (const field of fields) {
      if (req.body[field] !== undefined) {
        if (field === 'isPreviewFree') {
          lecture.isPreviewFree = req.body[field] === true || req.body[field] === 'true';
        } else {
          lecture[field] = req.body[field];
        }
      }
    }

    if (req.body.isPublished !== undefined) {
      const published = req.body.isPublished === true || req.body.isPublished === 'true';
      applyPublishState(lecture, published);
    }

    await lecture.save();

    if (oldAssets.thumbnail) await deleteFromCloudinary(oldAssets.thumbnail, 'image');
    if (oldAssets.video) await deleteFromCloudinary(oldAssets.video, 'video');
    if (oldAssets.cheatSheetPdf) await deleteFromCloudinary(oldAssets.cheatSheetPdf, 'raw');

    res.json({ success: true, data: lecture });
  } catch (error) {
    await cleanupUploads(uploads);
    console.error('Update Lecture Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.deleteLecture = async (req, res) => {
  try {
    const lecture = await RecordedLecture.findOne({ _id: req.params.id, ...NOT_DELETED });
    if (!lecture) {
      return res.status(404).json({ success: false, message: 'Lecture not found' });
    }

    const course = await getCourseForAdmin(req, res, lecture.courseId);
    if (!course) return;

    lecture.isDeleted = true;
    lecture.deletedAt = new Date();
    lecture.isPublished = false;
    await lecture.save();

    res.json({ success: true, message: 'Lecture deleted successfully' });
  } catch (error) {
    console.error('Delete Lecture Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.reorderLectures = async (req, res) => {
  try {
    const { subjectId, items } = req.body;

    if (!subjectId || !Array.isArray(items) || !items.length) {
      return res.status(400).json({
        success: false,
        message: 'subjectId and items array are required'
      });
    }

    const subject = await CourseSubject.findOne({ _id: subjectId, ...NOT_DELETED });
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    const course = await getCourseForAdmin(req, res, subject.courseId);
    if (!course) return;

    const bulkOps = items.map((item) => ({
      updateOne: {
        filter: { _id: item.id, subjectId, ...NOT_DELETED },
        update: { $set: { order: item.order } }
      }
    }));

    await RecordedLecture.bulkWrite(bulkOps);

    const lectures = await RecordedLecture.find({ subjectId, ...NOT_DELETED })
      .sort({ order: 1, createdAt: 1 });

    res.json({ success: true, data: lectures });
  } catch (error) {
    console.error('Reorder Lectures Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

`

### controllers/courseProgressController.js

`javascript
const CourseProgress = require('../models/CourseProgress');
const RecordedLecture = require('../models/RecordedLecture');
const { assertEnrollmentAccess } = require('../utils/courseAccess');
const { syncCourseProgress } = require('../utils/courseProgressService');
const { NOT_DELETED } = require('../utils/lectureHelpers');

exports.getCourseProgress = async (req, res) => {
  try {
    const { courseId } = req.params;

    const enrollment = await assertEnrollmentAccess(req, res, courseId);
    if (!enrollment) return;

    let progress = await CourseProgress.findOne({
      userId: req.user._id,
      courseId
    }).populate('lastOpenedLectureId', 'lectureTitle thumbnail subjectId');

    if (!progress) {
      progress = await syncCourseProgress(req.user._id, courseId);
      progress = await CourseProgress.findById(progress._id)
        .populate('lastOpenedLectureId', 'lectureTitle thumbnail subjectId');
    }

    res.json({ success: true, data: progress });
  } catch (error) {
    console.error('Get Course Progress Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateLastOpened = async (req, res) => {
  try {
    const { courseId, lectureId } = req.body;

    if (!courseId || !lectureId) {
      return res.status(400).json({
        success: false,
        message: 'courseId and lectureId are required'
      });
    }

    const enrollment = await assertEnrollmentAccess(req, res, courseId);
    if (!enrollment) return;

    const lecture = await RecordedLecture.findOne({
      _id: lectureId,
      courseId,
      isPublished: true,
      ...NOT_DELETED
    });

    if (!lecture) {
      return res.status(404).json({ success: false, message: 'Lecture not found' });
    }

    const progress = await syncCourseProgress(req.user._id, courseId, lectureId);

    res.json({ success: true, data: progress });
  } catch (error) {
    console.error('Update Last Opened Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

`

### controllers/lectureNoteController.js

`javascript
const RecordedLecture = require('../models/RecordedLecture');
const LectureNote = require('../models/LectureNote');
const { assertEnrollmentAccess } = require('../utils/courseAccess');
const { NOT_DELETED } = require('../utils/lectureHelpers');

const getLectureWithAccess = async (req, res, lectureId) => {
  const lecture = await RecordedLecture.findOne({
    _id: lectureId,
    isPublished: true,
    ...NOT_DELETED
  });
  if (!lecture) {
    res.status(404).json({ success: false, message: 'Lecture not found' });
    return null;
  }

  if (!lecture.isPreviewFree) {
    const enrollment = await assertEnrollmentAccess(req, res, lecture.courseId);
    if (!enrollment) return null;
  }

  return lecture;
};

exports.saveNote = async (req, res) => {
  try {
    const { lectureId, noteText } = req.body;

    if (!lectureId) {
      return res.status(400).json({ success: false, message: 'lectureId is required' });
    }

    const lecture = await getLectureWithAccess(req, res, lectureId);
    if (!lecture) return;

    const note = await LectureNote.findOneAndUpdate(
      { userId: req.user._id, lectureId },
      { noteText: noteText ?? '' },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.json({ success: true, data: note });
  } catch (error) {
    console.error('Save Note Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getNote = async (req, res) => {
  try {
    const { lectureId } = req.params;

    const lecture = await getLectureWithAccess(req, res, lectureId);
    if (!lecture) return;

    const note = await LectureNote.findOne({
      userId: req.user._id,
      lectureId
    });

    res.json({
      success: true,
      data: note || { lectureId, noteText: '' }
    });
  } catch (error) {
    console.error('Get Note Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

`

### controllers/lectureProgressController.js

`javascript
const RecordedLecture = require('../models/RecordedLecture');
const LectureProgress = require('../models/LectureProgress');
const { assertEnrollmentAccess } = require('../utils/courseAccess');
const { syncCourseProgress } = require('../utils/courseProgressService');
const { NOT_DELETED } = require('../utils/lectureHelpers');

exports.updateProgress = async (req, res) => {
  try {
    const { lectureId, watchedDuration } = req.body;

    if (!lectureId || watchedDuration === undefined) {
      return res.status(400).json({
        success: false,
        message: 'lectureId and watchedDuration are required'
      });
    }

    const lecture = await RecordedLecture.findOne({
      _id: lectureId,
      isPublished: true,
      ...NOT_DELETED
    });
    if (!lecture) {
      return res.status(404).json({ success: false, message: 'Lecture not found' });
    }

    const enrollment = await assertEnrollmentAccess(req, res, lecture.courseId);
    if (!enrollment) return;

    const serverDuration = lecture.video?.duration || 0;
    const totalDuration = serverDuration;
    const watched = totalDuration > 0
      ? Math.min(totalDuration, Math.max(0, Number(watchedDuration)))
      : Math.max(0, Number(watchedDuration));

    let progressPercent = 0;
    if (totalDuration > 0) {
      progressPercent = Math.min(100, Math.round((watched / totalDuration) * 100));
    }

    const isCompleted = totalDuration > 0 && watched >= totalDuration * 0.9;

    const progress = await LectureProgress.findOneAndUpdate(
      { userId: req.user._id, lectureId },
      {
        courseId: lecture.courseId,
        watchedDuration: watched,
        totalDuration,
        progressPercent,
        isCompleted,
        lastWatchedAt: new Date()
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    const courseProgress = await syncCourseProgress(
      req.user._id,
      lecture.courseId,
      lectureId
    );

    res.json({ success: true, data: progress, courseProgress });
  } catch (error) {
    console.error('Update Progress Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getProgress = async (req, res) => {
  try {
    const { lectureId } = req.params;

    const lecture = await RecordedLecture.findById(lectureId);
    if (!lecture) {
      return res.status(404).json({ success: false, message: 'Lecture not found' });
    }

    const enrollment = await assertEnrollmentAccess(req, res, lecture.courseId);
    if (!enrollment) return;

    const progress = await LectureProgress.findOne({
      userId: req.user._id,
      lectureId
    });

    res.json({
      success: true,
      data: progress || {
        lectureId,
        watchedDuration: 0,
        totalDuration: lecture.video?.duration || 0,
        progressPercent: 0,
        isCompleted: false
      }
    });
  } catch (error) {
    console.error('Get Progress Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

`

### controllers/lectureQuizAttemptController.js

`javascript
const RecordedLecture = require('../models/RecordedLecture');
const LectureQuizAttempt = require('../models/LectureQuizAttempt');
const { assertEnrollmentAccess } = require('../utils/courseAccess');

exports.submitQuizAttempt = async (req, res) => {
  try {
    const { lectureId, answers } = req.body;

    if (!lectureId || !Array.isArray(answers)) {
      return res.status(400).json({
        success: false,
        message: 'lectureId and answers array are required'
      });
    }

    const lecture = await RecordedLecture.findById(lectureId);
    if (!lecture) {
      return res.status(404).json({ success: false, message: 'Lecture not found' });
    }

    const enrollment = await assertEnrollmentAccess(req, res, lecture.courseId);
    if (!enrollment) return;

    const questions = lecture.topicQuiz || [];
    if (!questions.length) {
      return res.status(400).json({ success: false, message: 'This lecture has no quiz' });
    }

    const evaluatedAnswers = answers.map((answer) => {
      const question = questions[answer.questionIndex];
      const isCorrect = question
        ? Number(answer.selectedOption) === Number(question.correctAnswer)
        : false;

      return {
        questionIndex: answer.questionIndex,
        selectedOption: answer.selectedOption,
        isCorrect
      };
    });

    const score = evaluatedAnswers.filter((a) => a.isCorrect).length;
    const totalQuestions = questions.length;

    const attempt = await LectureQuizAttempt.create({
      userId: req.user._id,
      lectureId,
      courseId: lecture.courseId,
      answers: evaluatedAnswers,
      score,
      totalQuestions
    });

    const explanations = questions.map((q, index) => ({
      questionIndex: index,
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      isCorrect: evaluatedAnswers.find((a) => a.questionIndex === index)?.isCorrect ?? false
    }));

    res.status(201).json({
      success: true,
      data: {
        attemptId: attempt._id,
        score,
        totalQuestions,
        percentage: Math.round((score / totalQuestions) * 100),
        explanations
      }
    });
  } catch (error) {
    console.error('Submit Quiz Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getQuizAttempts = async (req, res) => {
  try {
    const { lectureId } = req.params;

    const lecture = await RecordedLecture.findById(lectureId);
    if (!lecture) {
      return res.status(404).json({ success: false, message: 'Lecture not found' });
    }

    const enrollment = await assertEnrollmentAccess(req, res, lecture.courseId);
    if (!enrollment) return;

    const attempts = await LectureQuizAttempt.find({
      userId: req.user._id,
      lectureId
    }).sort({ createdAt: -1 });

    res.json({ success: true, count: attempts.length, data: attempts });
  } catch (error) {
    console.error('Get Quiz Attempts Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

`

### controllers/lectureAnswerController.js

`javascript
const RecordedLecture = require('../models/RecordedLecture');
const LectureAnswer = require('../models/LectureAnswer');
const { assertEnrollmentAccess } = require('../utils/courseAccess');

exports.saveAnswer = async (req, res) => {
  try {
    const { lectureId, answerText } = req.body;

    if (!lectureId) {
      return res.status(400).json({ success: false, message: 'lectureId is required' });
    }

    const lecture = await RecordedLecture.findById(lectureId);
    if (!lecture) {
      return res.status(404).json({ success: false, message: 'Lecture not found' });
    }

    const enrollment = await assertEnrollmentAccess(req, res, lecture.courseId);
    if (!enrollment) return;

    const answer = await LectureAnswer.findOneAndUpdate(
      { userId: req.user._id, lectureId },
      {
        courseId: lecture.courseId,
        answerText: answerText ?? ''
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.json({ success: true, data: answer });
  } catch (error) {
    console.error('Save Answer Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getAnswer = async (req, res) => {
  try {
    const { lectureId } = req.params;

    const lecture = await RecordedLecture.findById(lectureId);
    if (!lecture) {
      return res.status(404).json({ success: false, message: 'Lecture not found' });
    }

    const enrollment = await assertEnrollmentAccess(req, res, lecture.courseId);
    if (!enrollment) return;

    const answer = await LectureAnswer.findOne({
      userId: req.user._id,
      lectureId
    });

    res.json({
      success: true,
      data: answer || { lectureId, answerText: '' },
      mainsQuestion: lecture.mainsQuestion || null
    });
  } catch (error) {
    console.error('Get Answer Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

`

### routes/courseSubjectRoutes.js

`javascript
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { allowRoles } = require('../middleware/roleMiddleware');
const {
  createSubject,
  getSubjectsByCourse,
  getSubjectsGrouped,
  getSubjectsByCourseAdmin,
  updateSubject,
  deleteSubject,
  reorderSubjects
} = require('../controllers/courseSubjectController');

router.use(protect);

router.get('/course/:courseId/grouped', getSubjectsGrouped);
router.get('/course/:courseId', getSubjectsByCourse);

router.use(allowRoles('super_admin', 'center_admin'));

router.post('/', createSubject);
router.put('/reorder', reorderSubjects);
router.get('/admin/course/:courseId', getSubjectsByCourseAdmin);
router.put('/:id', updateSubject);
router.delete('/:id', deleteSubject);

module.exports = router;

`

### routes/recordedLectureRoutes.js

`javascript
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { allowRoles } = require('../middleware/roleMiddleware');
const uploadRecordedLecture = require('../middleware/uploadRecordedLecture');
const {
  createLecture,
  getLecturesBySubject,
  getLecturesBySubjectAdmin,
  getLectureById,
  updateLecture,
  deleteLecture,
  reorderLectures
} = require('../controllers/recordedLectureController');

const adminOnly = allowRoles('super_admin', 'center_admin');

const lectureUpload = uploadRecordedLecture.fields([
  { name: 'thumbnail', maxCount: 1 },
  { name: 'video', maxCount: 1 },
  { name: 'cheatSheetPdf', maxCount: 1 }
]);

router.use(protect);

router.get('/subject/:subjectId', getLecturesBySubject);

router.post('/', adminOnly, lectureUpload, createLecture);
router.put('/reorder', adminOnly, reorderLectures);
router.get('/admin/subject/:subjectId', adminOnly, getLecturesBySubjectAdmin);
router.put('/:id', adminOnly, lectureUpload, updateLecture);
router.delete('/:id', adminOnly, deleteLecture);

router.get('/:id', getLectureById);

module.exports = router;

`

### routes/courseProgressRoutes.js

`javascript
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getCourseProgress,
  updateLastOpened
} = require('../controllers/courseProgressController');

router.use(protect);

router.post('/last-opened', updateLastOpened);
router.get('/:courseId', getCourseProgress);

module.exports = router;

`

### routes/lectureNoteRoutes.js

`javascript
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { saveNote, getNote } = require('../controllers/lectureNoteController');

router.use(protect);

router.post('/', saveNote);
router.get('/:lectureId', getNote);

module.exports = router;

`

### routes/lectureProgressRoutes.js

`javascript
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { updateProgress, getProgress } = require('../controllers/lectureProgressController');

router.use(protect);

router.post('/', updateProgress);
router.get('/:lectureId', getProgress);

module.exports = router;

`

### routes/lectureQuizAttemptRoutes.js

`javascript
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  submitQuizAttempt,
  getQuizAttempts
} = require('../controllers/lectureQuizAttemptController');

router.use(protect);

router.post('/', submitQuizAttempt);
router.get('/:lectureId', getQuizAttempts);

module.exports = router;

`

### routes/lectureAnswerRoutes.js

`javascript
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { saveAnswer, getAnswer } = require('../controllers/lectureAnswerController');

router.use(protect);

router.post('/', saveAnswer);
router.get('/:lectureId', getAnswer);

module.exports = router;

`

### app.js snippets

`javascript
const courseSubjectRoutes = require('./routes/courseSubjectRoutes');
const recordedLectureRoutes = require('./routes/recordedLectureRoutes');
const lectureNoteRoutes = require('./routes/lectureNoteRoutes');
const lectureProgressRoutes = require('./routes/lectureProgressRoutes');
const lectureQuizAttemptRoutes = require('./routes/lectureQuizAttemptRoutes');
const lectureAnswerRoutes = require('./routes/lectureAnswerRoutes');
const courseProgressRoutes = require('./routes/courseProgressRoutes');
`

`javascript
// My Courses — recorded lectures LMS
app.use('/api/course-subjects', courseSubjectRoutes);
app.use('/api/recorded-lectures', recordedLectureRoutes);
app.use('/api/lecture-notes', lectureNoteRoutes);
app.use('/api/lecture-progress', lectureProgressRoutes);
app.use('/api/lecture-quiz-attempts', lectureQuizAttemptRoutes);
app.use('/api/lecture-answers', lectureAnswerRoutes);
app.use('/api/course-progress', courseProgressRoutes);
`

`javascript
const lectureProgressLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { success: false, message: 'Too many progress updates. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false
});

const lectureNotesLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many note updates. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Apply rate limiters
app.use('/api/auth/send-otp', otpLimiter);
app.use('/api/auth/verify-otp', otpLimiter);
app.use('/api/lecture-progress', lectureProgressLimiter);
app.use('/api/lecture-notes', lectureNotesLimiter);
`
