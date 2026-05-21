# LMS Tests — API Guide & Complete Source Code

**Base URL:** `http://localhost:5000`  
**Postman:** [`LMS_TEST_POSTMAN_COLLECTION.json`](../LMS_TEST_POSTMAN_COLLECTION.json)  
**Auth:** `Authorization: Bearer <JWT_TOKEN>`

---

## Production improvements (v2)

| Fix | Details |
|-----|---------|
| Route order | Static routes (`/attempts/*`, `/questions/*`) before `/:id` |
| Question snapshot | Frozen in `LmsTestAttempt.questionSnapshot` on start — admin edits do not change scored results |
| Soft delete | `isDeleted` on `LmsTest` + `LmsTestQuestion` |
| DELETE test | `DELETE /api/tests/:id` — soft-deletes test + questions; attempts kept |
| 4 options | Schema enforces exactly 4 options |
| correctAnswer | Validated 0–3 and against options length |
| maxAttempts | On `LmsTest` (default 1) |
| shuffleQuestions / shuffleOptions | Optional per test |
| questionImage | Optional on questions |
| Bulk add | `POST /api/tests/questions/bulk` |
| Pagination | `GET /api/tests/attempts/me/list?page=1&limit=20` |
| Indexes | `userId + submittedAt` on attempts |
| Category seed | On server startup (`utils/lmsTestSeed.js`) |
| Input sanitize | `utils/sanitizeText.js` on question/explanation |

---

## Quick start

1. Import Postman collection.
2. `GET /api/tests/categories` → weekly / daily / monthly IDs.
3. Admin: `POST /api/tests` → `POST /api/tests/questions/bulk` (or single) → `PATCH /api/tests/:id/publish`.
4. Student: list → start → submit → result.

---

## API reference

### Categories

| Method | Path | Access |
|--------|------|--------|
| GET | `/api/tests/categories` | Public |
| POST | `/api/tests/categories` | Admin |
| PUT | `/api/tests/categories/:id` | Admin |
| DELETE | `/api/tests/categories/:id` | Admin (core slugs blocked) |

### Tests

| Method | Path | Access |
|--------|------|--------|
| POST | `/api/tests` | Admin |
| PUT | `/api/tests/:id` | Admin |
| DELETE | `/api/tests/:id` | Admin (soft) |
| PATCH | `/api/tests/:id/publish` | Admin |
| GET | `/api/tests/course/:courseId/category/:categoryId` | Student |
| GET | `/api/tests/course/:courseId/category/:categoryId/admin` | Admin |
| GET | `/api/tests/:id/start` | Student |
| POST | `/api/tests/:id/submit` | Student |

### Questions

| Method | Path | Access |
|--------|------|--------|
| POST | `/api/tests/questions` | Admin (single) |
| POST | `/api/tests/questions/bulk` | Admin (array) |
| GET | `/api/tests/questions/test/:testId` | Admin |
| PUT | `/api/tests/questions/:id` | Admin |
| DELETE | `/api/tests/questions/:id` | Admin (hard delete) |

### Attempts

| Method | Path | Access |
|--------|------|--------|
| GET | `/api/tests/attempts/:attemptId` | Student |
| GET | `/api/test-attempts/:attemptId` | Student (alias) |
| GET | `/api/tests/attempts/me/list?page=1&limit=20` | Student |

---

## Security

- `correctAnswer` / `explanation` never in `GET .../start`
- Scoring uses `questionSnapshot` only
- Enrollment via `assertEnrollmentAccess`
- Server timer: `durationInMinutes * 60 + 30s` grace

---

## Create test body (example)

```json
{
  "courseId": "COURSE_ID",
  "categoryId": "CATEGORY_ID",
  "title": "Geography Test 1",
  "durationInMinutes": 60,
  "passMarks": 40,
  "negativeMarkPerWrongAnswer": 0.33,
  "maxAttempts": 1,
  "shuffleQuestions": false,
  "shuffleOptions": false
}
```

## Bulk add questions

```json
POST /api/tests/questions/bulk
{
  "testId": "TEST_ID",
  "questions": [
    {
      "question": "Capital of India?",
      "options": ["Delhi", "Mumbai", "Hyderabad", "Pune"],
      "correctAnswer": 0,
      "marks": 2
    }
  ]
}
```

## Update one question

```json
PUT /api/tests/questions/:questionId
{
  "marks": 3,
  "question": "Updated text?"
}
```

---

# Complete source code


---

## `models/LmsTestCategory.js`

```javascript
const mongoose = require('mongoose');

const lmsTestCategorySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    slug: {
      type: String,
      enum: ['weekly', 'daily', 'monthly'],
      required: true,
      unique: true,
      lowercase: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('LmsTestCategory', lmsTestCategorySchema);
```

---

## `models/LmsTest.js`

```javascript
const mongoose = require('mongoose');

const lmsTestSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LmsTestCategory',
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    durationInMinutes: {
      type: Number,
      required: true,
      min: 1
    },
    totalQuestions: {
      type: Number,
      default: 0
    },
    totalMarks: {
      type: Number,
      default: 0
    },
    passMarks: {
      type: Number,
      default: 0
    },
    negativeMarkPerWrongAnswer: {
      type: Number,
      default: 0
    },
    maxAttempts: {
      type: Number,
      default: 1,
      min: 1
    },
    shuffleQuestions: {
      type: Boolean,
      default: false
    },
    shuffleOptions: {
      type: Boolean,
      default: false
    },
    instructions: {
      type: String,
      default: ''
    },
    startDateTime: Date,
    endDateTime: Date,
    isPublished: {
      type: Boolean,
      default: false
    },
    isDeleted: {
      type: Boolean,
      default: false
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  { timestamps: true }
);

lmsTestSchema.index({ courseId: 1, categoryId: 1, isDeleted: 1 });
lmsTestSchema.index({ courseId: 1, isPublished: 1, isDeleted: 1 });

module.exports = mongoose.model('LmsTest', lmsTestSchema);
```

---

## `models/LmsTestQuestion.js`

```javascript
const mongoose = require('mongoose');

const lmsTestQuestionSchema = new mongoose.Schema(
  {
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LmsTest',
      required: true
    },
    question: {
      type: String,
      required: true,
      trim: true
    },
    options: {
      type: [String],
      required: true,
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length === 4,
        message: 'Exactly 4 options are required'
      }
    },
    correctAnswer: {
      type: Number,
      required: true,
      min: 0,
      max: 3,
      validate: {
        validator: function (v) {
          return Array.isArray(this.options) && v >= 0 && v < this.options.length;
        },
        message: 'correctAnswer must be a valid option index (0–3)'
      }
    },
    explanation: {
      type: String,
      default: ''
    },
    marks: {
      type: Number,
      default: 1,
      min: 0
    },
    negativeMarks: {
      type: Number,
      default: 0,
      min: 0
    },
    questionImage: {
      url: String,
      public_id: String
    },
    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

lmsTestQuestionSchema.index({ testId: 1, createdAt: 1 });
lmsTestQuestionSchema.index({ testId: 1, isDeleted: 1 });

module.exports = mongoose.model('LmsTestQuestion', lmsTestQuestionSchema);
```

---

## `models/LmsTestAttempt.js`

```javascript
const mongoose = require('mongoose');

const questionSnapshotSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LmsTestQuestion',
      required: true
    },
    question: String,
    options: [String],
    correctAnswer: Number,
    explanation: String,
    marks: Number,
    negativeMarks: Number,
    questionImage: {
      url: String,
      public_id: String
    }
  },
  { _id: false }
);

const lmsTestAttemptSchema = new mongoose.Schema(
  {
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
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LmsTest',
      required: true
    },
    questionSnapshot: [questionSnapshotSchema],
    answers: [
      {
        questionId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'LmsTestQuestion'
        },
        selectedOption: Number,
        isCorrect: Boolean,
        obtainedMarks: Number
      }
    ],
    totalQuestions: Number,
    correctAnswers: Number,
    wrongAnswers: Number,
    unanswered: Number,
    obtainedMarks: Number,
    totalMarks: Number,
    percentage: Number,
    isPassed: Boolean,
    startedAt: Date,
    submittedAt: Date,
    timeTakenInSeconds: Number,
    status: {
      type: String,
      enum: ['in_progress', 'submitted'],
      default: 'in_progress'
    }
  },
  { timestamps: true }
);

lmsTestAttemptSchema.index({ userId: 1, testId: 1 });
lmsTestAttemptSchema.index({ userId: 1, submittedAt: -1 });
lmsTestAttemptSchema.index({ testId: 1, status: 1 });

module.exports = mongoose.model('LmsTestAttempt', lmsTestAttemptSchema);
```

---

## `utils/sanitizeText.js`

```javascript
/** Strip script tags and trim user HTML/text input */
const sanitizeText = (value) => {
  if (value == null || typeof value !== 'string') return value;
  return value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .trim();
};

const sanitizeOptionalText = (value) => {
  if (value == null || value === '') return value;
  return sanitizeText(value);
};

module.exports = { sanitizeText, sanitizeOptionalText };
```

---

## `utils/lmsTestSeed.js`

```javascript
const LmsTestCategory = require('../models/LmsTestCategory');
const { DEFAULT_CATEGORIES } = require('./lmsTestHelpers');

const seedLmsTestCategories = async () => {
  for (const cat of DEFAULT_CATEGORIES) {
    await LmsTestCategory.findOneAndUpdate(
      { slug: cat.slug },
      { $setOnInsert: cat },
      { upsert: true }
    );
  }
  console.log('✅ LMS test categories seeded (weekly, daily, monthly)');
};

module.exports = { seedLmsTestCategories };
```

---

## `utils/lmsTestHelpers.js`

```javascript
const LmsTest = require('../models/LmsTest');
const LmsTestQuestion = require('../models/LmsTestQuestion');

const NOT_DELETED = { isDeleted: false };

const DEFAULT_CATEGORIES = [
  { title: 'Weekly Test', slug: 'weekly' },
  { title: 'Daily Test', slug: 'daily' },
  { title: 'Monthly Test', slug: 'monthly' }
];

const shuffleArray = (arr) => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const buildSnapshotFromQuestion = (q) => ({
  questionId: q._id,
  question: q.question,
  options: [...q.options],
  correctAnswer: q.correctAnswer,
  explanation: q.explanation || '',
  marks: q.marks ?? 1,
  negativeMarks: q.negativeMarks ?? 0,
  questionImage: q.questionImage?.url
    ? { url: q.questionImage.url, public_id: q.questionImage.public_id }
    : undefined
});

/** Apply option shuffle; returns new snapshot rows with remapped correctAnswer */
const applyOptionShuffle = (snapshots) =>
  snapshots.map((snap) => {
    const indexed = snap.options.map((text, idx) => ({ text, idx }));
    const shuffled = shuffleArray(indexed);
    const newOptions = shuffled.map((o) => o.text);
    const newCorrect = shuffled.findIndex((o) => o.idx === snap.correctAnswer);
    return { ...snap, options: newOptions, correctAnswer: newCorrect };
  });

const buildQuestionSnapshot = (questions, test) => {
  let rows = questions.map(buildSnapshotFromQuestion);
  if (test.shuffleQuestions) {
    rows = shuffleArray(rows);
  }
  if (test.shuffleOptions) {
    rows = applyOptionShuffle(rows);
  }
  return rows;
};

const sanitizeQuestionForAttempt = (snap) => ({
  _id: snap.questionId,
  question: snap.question,
  options: snap.options,
  marks: snap.marks,
  questionImage: snap.questionImage?.url ? { url: snap.questionImage.url } : undefined
});

const isTestWithinSchedule = (test) => {
  const now = new Date();
  if (test.startDateTime && now < new Date(test.startDateTime)) {
    return { ok: false, message: 'Test has not started yet' };
  }
  if (test.endDateTime && now > new Date(test.endDateTime)) {
    return { ok: false, message: 'Test has ended' };
  }
  return { ok: true };
};

const syncTestTotals = async (testId) => {
  const questions = await LmsTestQuestion.find({ testId, ...NOT_DELETED }).lean();
  const totalQuestions = questions.length;
  const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 0), 0);

  await LmsTest.findByIdAndUpdate(testId, { totalQuestions, totalMarks });
  return { totalQuestions, totalMarks };
};

const scoreAnswers = (snapshotQuestions, answerPayload, test) => {
  const answerMap = new Map(
    (answerPayload || []).map((a) => [String(a.questionId), a.selectedOption])
  );

  const gradedAnswers = [];
  let correctAnswers = 0;
  let wrongAnswers = 0;
  let unanswered = 0;
  let obtainedMarks = 0;
  const totalMarks = snapshotQuestions.reduce((s, q) => s + (q.marks || 0), 0);
  const defaultNegative = test.negativeMarkPerWrongAnswer || 0;

  for (const q of snapshotQuestions) {
    const qid = String(q.questionId);
    const hasSelection =
      answerMap.has(qid) && answerMap.get(qid) !== null && answerMap.get(qid) !== undefined;
    const selectedOption = hasSelection ? Number(answerMap.get(qid)) : null;

    if (!hasSelection) {
      unanswered += 1;
      gradedAnswers.push({
        questionId: q.questionId,
        selectedOption: null,
        isCorrect: false,
        obtainedMarks: 0
      });
      continue;
    }

    const isCorrect = selectedOption === q.correctAnswer;
    let marksForQuestion = 0;

    if (isCorrect) {
      correctAnswers += 1;
      marksForQuestion = q.marks || 0;
    } else {
      wrongAnswers += 1;
      const neg = q.negativeMarks > 0 ? q.negativeMarks : defaultNegative;
      marksForQuestion = neg > 0 ? -neg : 0;
    }

    obtainedMarks += marksForQuestion;
    gradedAnswers.push({
      questionId: q.questionId,
      selectedOption,
      isCorrect,
      obtainedMarks: marksForQuestion
    });
  }

  obtainedMarks = Math.max(0, obtainedMarks);
  const percentage =
    totalMarks > 0 ? Math.round((obtainedMarks / totalMarks) * 10000) / 100 : 0;
  const isPassed = obtainedMarks >= (test.passMarks || 0);

  return {
    gradedAnswers,
    totalQuestions: snapshotQuestions.length,
    correctAnswers,
    wrongAnswers,
    unanswered,
    obtainedMarks,
    totalMarks,
    percentage,
    isPassed,
    score: obtainedMarks
  };
};

const formatQuestionForReview = (snap, answerRow) => ({
  _id: snap.questionId,
  question: snap.question,
  options: snap.options,
  correctAnswer: snap.correctAnswer,
  explanation: snap.explanation,
  marks: snap.marks,
  negativeMarks: snap.negativeMarks,
  questionImage: snap.questionImage,
  selectedOption: answerRow?.selectedOption ?? null,
  isCorrect: answerRow?.isCorrect ?? false,
  obtainedMarks: answerRow?.obtainedMarks ?? 0
});

module.exports = {
  NOT_DELETED,
  DEFAULT_CATEGORIES,
  shuffleArray,
  buildQuestionSnapshot,
  sanitizeQuestionForAttempt,
  isTestWithinSchedule,
  syncTestTotals,
  scoreAnswers,
  formatQuestionForReview
};
```

---

## `controllers/lmsTestCategoryController.js`

```javascript
const LmsTestCategory = require('../models/LmsTestCategory');

exports.getCategories = async (req, res) => {
  try {
    const categories = await LmsTestCategory.find().sort({ slug: 1 }).lean();

    res.json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    console.error('Get LMS test categories error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const { title, slug } = req.body;

    if (!title || !slug) {
      return res.status(400).json({ success: false, message: 'title and slug are required' });
    }

    const category = await LmsTestCategory.create({ title, slug: slug.toLowerCase() });

    res.status(201).json({
      success: true,
      message: 'Test category created',
      data: category
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Category slug already exists' });
    }
    console.error('Create LMS test category error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
```

---

## `controllers/lmsTestController.js`

```javascript
const LmsTest = require('../models/LmsTest');
const LmsTestCategory = require('../models/LmsTestCategory');
const LmsTestQuestion = require('../models/LmsTestQuestion');
const LmsTestAttempt = require('../models/LmsTestAttempt');
const { assertEnrollmentAccess, getCourseForAdmin } = require('../utils/courseAccess');
const { sanitizeOptionalText } = require('../utils/sanitizeText');
const {
  NOT_DELETED,
  sanitizeQuestionForAttempt,
  isTestWithinSchedule,
  scoreAnswers,
  buildQuestionSnapshot
} = require('../utils/lmsTestHelpers');

const findActiveTest = async (id) => LmsTest.findOne({ _id: id, ...NOT_DELETED });

const formatTestListItem = (test) => ({
  _id: test._id,
  courseId: test.courseId,
  categoryId: test.categoryId,
  title: test.title,
  durationInMinutes: test.durationInMinutes,
  totalQuestions: test.totalQuestions,
  totalMarks: test.totalMarks,
  passMarks: test.passMarks,
  maxAttempts: test.maxAttempts,
  startDateTime: test.startDateTime,
  endDateTime: test.endDateTime,
  isPublished: test.isPublished
});

exports.createTest = async (req, res) => {
  try {
    const {
      courseId,
      categoryId,
      title,
      durationInMinutes,
      passMarks,
      negativeMarkPerWrongAnswer,
      maxAttempts,
      shuffleQuestions,
      shuffleOptions,
      instructions,
      startDateTime,
      endDateTime,
      isPublished
    } = req.body;

    if (!courseId || !categoryId || !title || !durationInMinutes) {
      return res.status(400).json({
        success: false,
        message: 'courseId, categoryId, title, and durationInMinutes are required'
      });
    }

    const course = await getCourseForAdmin(req, res, courseId);
    if (!course) return;

    const category = await LmsTestCategory.findById(categoryId);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Test category not found' });
    }

    const test = await LmsTest.create({
      courseId,
      categoryId,
      title,
      durationInMinutes,
      passMarks,
      negativeMarkPerWrongAnswer,
      maxAttempts: maxAttempts ?? 1,
      shuffleQuestions: shuffleQuestions ?? false,
      shuffleOptions: shuffleOptions ?? false,
      instructions: sanitizeOptionalText(instructions) || '',
      startDateTime,
      endDateTime,
      isPublished: isPublished ?? false,
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      message: 'Test created',
      data: test
    });
  } catch (error) {
    console.error('Create LMS test error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateTest = async (req, res) => {
  try {
    const test = await findActiveTest(req.params.id);
    if (!test) {
      return res.status(404).json({ success: false, message: 'Test not found' });
    }

    const course = await getCourseForAdmin(req, res, test.courseId);
    if (!course) return;

    const updates = { ...req.body };
    delete updates.courseId;
    delete updates.createdBy;
    if (updates.instructions) updates.instructions = sanitizeOptionalText(updates.instructions);

    const updated = await LmsTest.findByIdAndUpdate(test._id, updates, {
      new: true,
      runValidators: true
    });

    res.json({
      success: true,
      message: 'Test updated',
      data: updated
    });
  } catch (error) {
    console.error('Update LMS test error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.deleteTest = async (req, res) => {
  try {
    const test = await findActiveTest(req.params.id);
    if (!test) {
      return res.status(404).json({ success: false, message: 'Test not found' });
    }

    const course = await getCourseForAdmin(req, res, test.courseId);
    if (!course) return;

    test.isDeleted = true;
    test.isPublished = false;
    await test.save();

    await LmsTestQuestion.updateMany({ testId: test._id }, { $set: { isDeleted: true } });

    res.json({
      success: true,
      message: 'Test deleted (soft). Questions soft-deleted. Attempts preserved for audit.'
    });
  } catch (error) {
    console.error('Delete LMS test error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.publishTest = async (req, res) => {
  try {
    const test = await findActiveTest(req.params.id);
    if (!test) {
      return res.status(404).json({ success: false, message: 'Test not found' });
    }

    const course = await getCourseForAdmin(req, res, test.courseId);
    if (!course) return;

    if (test.totalQuestions < 1) {
      return res.status(400).json({
        success: false,
        message: 'Add at least one question before publishing'
      });
    }

    test.isPublished = true;
    await test.save();

    res.json({
      success: true,
      message: 'Test published',
      data: test
    });
  } catch (error) {
    console.error('Publish LMS test error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getTestsByCourseAndCategory = async (req, res) => {
  try {
    const { courseId, categoryId } = req.params;

    const enrollment = await assertEnrollmentAccess(req, res, courseId);
    if (!enrollment) return;

    const tests = await LmsTest.find({
      courseId,
      categoryId,
      isPublished: true,
      ...NOT_DELETED
    })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      count: tests.length,
      data: tests.map(formatTestListItem)
    });
  } catch (error) {
    console.error('Get LMS tests by category error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getTestsByCourseAndCategoryAdmin = async (req, res) => {
  try {
    const { courseId, categoryId } = req.params;

    const course = await getCourseForAdmin(req, res, courseId);
    if (!course) return;

    const tests = await LmsTest.find({ courseId, categoryId, ...NOT_DELETED })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      count: tests.length,
      data: tests
    });
  } catch (error) {
    console.error('Admin get LMS tests error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.startTest = async (req, res) => {
  try {
    const test = await findActiveTest(req.params.id);
    if (!test || !test.isPublished) {
      return res.status(404).json({ success: false, message: 'Test not found or not published' });
    }

    const schedule = isTestWithinSchedule(test);
    if (!schedule.ok) {
      return res.status(403).json({ success: false, message: schedule.message });
    }

    const enrollment = await assertEnrollmentAccess(req, res, test.courseId);
    if (!enrollment) return;

    const submittedCount = await LmsTestAttempt.countDocuments({
      userId: req.user._id,
      testId: test._id,
      status: 'submitted'
    });

    if (submittedCount >= (test.maxAttempts || 1)) {
      return res.status(400).json({
        success: false,
        message: `Maximum attempts (${test.maxAttempts}) reached for this test`
      });
    }

    let attempt = await LmsTestAttempt.findOne({
      userId: req.user._id,
      testId: test._id,
      status: 'in_progress'
    });

    if (attempt?.questionSnapshot?.length) {
      return res.json({
        success: true,
        attemptId: attempt._id,
        startedAt: attempt.startedAt,
        durationInMinutes: test.durationInMinutes,
        test: formatTestListItem(test),
        questions: attempt.questionSnapshot.map(sanitizeQuestionForAttempt)
      });
    }

    const questions = await LmsTestQuestion.find({ testId: test._id, ...NOT_DELETED })
      .sort({ order: 1 })
      .lean();

    if (!questions.length) {
      return res.status(400).json({ success: false, message: 'Test has no questions yet' });
    }

    const snapshot = buildQuestionSnapshot(questions, test);

    if (!attempt) {
      attempt = await LmsTestAttempt.create({
        userId: req.user._id,
        courseId: test.courseId,
        testId: test._id,
        questionSnapshot: snapshot,
        answers: [],
        startedAt: new Date(),
        status: 'in_progress'
      });
    } else {
      attempt.questionSnapshot = snapshot;
      await attempt.save();
    }

    res.json({
      success: true,
      attemptId: attempt._id,
      startedAt: attempt.startedAt,
      durationInMinutes: test.durationInMinutes,
      test: formatTestListItem(test),
      questions: snapshot.map(sanitizeQuestionForAttempt)
    });
  } catch (error) {
    console.error('Start LMS test error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.submitTest = async (req, res) => {
  try {
    const test = await findActiveTest(req.params.id);
    if (!test || !test.isPublished) {
      return res.status(404).json({ success: false, message: 'Test not found or not published' });
    }

    const enrollment = await assertEnrollmentAccess(req, res, test.courseId);
    if (!enrollment) return;

    const attempt = await LmsTestAttempt.findOne({
      userId: req.user._id,
      testId: test._id,
      status: 'in_progress'
    });

    if (!attempt) {
      return res.status(400).json({
        success: false,
        message: 'No active attempt found. Call GET /api/tests/:id/start first'
      });
    }

    if (!attempt.questionSnapshot?.length) {
      return res.status(400).json({
        success: false,
        message: 'Attempt has no question snapshot. Restart the test.'
      });
    }

    const now = new Date();
    const allowedSeconds = test.durationInMinutes * 60;
    const elapsed = Math.floor((now - attempt.startedAt) / 1000);

    if (elapsed > allowedSeconds + 30) {
      return res.status(400).json({
        success: false,
        message: 'Time limit exceeded. Test auto-closed.',
        allowedSeconds
      });
    }

    const result = scoreAnswers(attempt.questionSnapshot, req.body.answers, test);

    attempt.answers = result.gradedAnswers;
    attempt.totalQuestions = result.totalQuestions;
    attempt.correctAnswers = result.correctAnswers;
    attempt.wrongAnswers = result.wrongAnswers;
    attempt.unanswered = result.unanswered;
    attempt.obtainedMarks = result.obtainedMarks;
    attempt.totalMarks = result.totalMarks;
    attempt.percentage = result.percentage;
    attempt.isPassed = result.isPassed;
    attempt.submittedAt = now;
    attempt.timeTakenInSeconds = elapsed;
    attempt.status = 'submitted';
    await attempt.save();

    res.json({
      success: true,
      attemptId: attempt._id,
      score: result.score,
      percentage: result.percentage,
      correctAnswers: result.correctAnswers,
      wrongAnswers: result.wrongAnswers,
      unanswered: result.unanswered,
      obtainedMarks: result.obtainedMarks,
      totalMarks: result.totalMarks,
      isPassed: result.isPassed,
      timeTakenInSeconds: elapsed
    });
  } catch (error) {
    console.error('Submit LMS test error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
```

---

## `controllers/lmsTestQuestionController.js`

```javascript
const LmsTest = require('../models/LmsTest');
const LmsTestQuestion = require('../models/LmsTestQuestion');
const { getCourseForAdmin } = require('../utils/courseAccess');
const { NOT_DELETED, syncTestTotals } = require('../utils/lmsTestHelpers');
const { sanitizeText, sanitizeOptionalText } = require('../utils/sanitizeText');

const findActiveTest = async (testId) =>
  LmsTest.findOne({ _id: testId, ...NOT_DELETED });

exports.createQuestion = async (req, res) => {
  try {
    const {
      testId,
      question,
      options,
      correctAnswer,
      explanation,
      marks,
      negativeMarks,
      order,
      questionImage
    } = req.body;

    if (!testId || !question || !options || correctAnswer === undefined) {
      return res.status(400).json({
        success: false,
        message: 'testId, question, options, and correctAnswer are required'
      });
    }

    const test = await findActiveTest(testId);
    if (!test) {
      return res.status(404).json({ success: false, message: 'Test not found' });
    }

    const course = await getCourseForAdmin(req, res, test.courseId);
    if (!course) return;

    const optionList = Array.isArray(options) ? options : JSON.parse(options);
    if (optionList.length !== 4) {
      return res.status(400).json({ success: false, message: 'Exactly 4 options are required' });
    }

    const correctIdx = Number(correctAnswer);
    if (correctIdx < 0 || correctIdx >= 4) {
      return res.status(400).json({
        success: false,
        message: 'correctAnswer must be between 0 and 3'
      });
    }

    let questionOrder = order;
    if (questionOrder === undefined || questionOrder === null) {
      const last = await LmsTestQuestion.findOne({ testId, ...NOT_DELETED })
        .sort({ order: -1 })
        .lean();
      questionOrder = last ? last.order + 1 : 0;
    }

    const doc = await LmsTestQuestion.create({
      testId,
      question: sanitizeText(question),
      options: optionList.map((o) => sanitizeText(o)),
      correctAnswer: correctIdx,
      explanation: sanitizeOptionalText(explanation) || '',
      marks: marks ?? 1,
      negativeMarks: negativeMarks ?? 0,
      order: questionOrder,
      questionImage: questionImage || undefined
    });

    const totals = await syncTestTotals(testId);

    res.status(201).json({
      success: true,
      message: 'Question added',
      data: doc,
      testTotals: totals
    });
  } catch (error) {
    console.error('Create LMS test question error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getQuestionsByTest = async (req, res) => {
  try {
    const test = await findActiveTest(req.params.testId);
    if (!test) {
      return res.status(404).json({ success: false, message: 'Test not found' });
    }

    const course = await getCourseForAdmin(req, res, test.courseId);
    if (!course) return;

    const questions = await LmsTestQuestion.find({ testId: test._id, ...NOT_DELETED })
      .sort({ order: 1 })
      .lean();

    res.json({
      success: true,
      count: questions.length,
      data: questions
    });
  } catch (error) {
    console.error('Get LMS test questions error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.updateQuestion = async (req, res) => {
  try {
    const question = await LmsTestQuestion.findOne({ _id: req.params.id, ...NOT_DELETED });
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    const test = await findActiveTest(question.testId);
    const course = await getCourseForAdmin(req, res, test.courseId);
    if (!course) return;

    const updates = { ...req.body };
    delete updates.testId;

    if (updates.question) updates.question = sanitizeText(updates.question);
    if (updates.explanation) updates.explanation = sanitizeOptionalText(updates.explanation);
    if (updates.options && typeof updates.options === 'string') {
      updates.options = JSON.parse(updates.options);
    }
    if (updates.options) {
      if (updates.options.length !== 4) {
        return res.status(400).json({ success: false, message: 'Exactly 4 options are required' });
      }
      updates.options = updates.options.map((o) => sanitizeText(o));
    }

    const updated = await LmsTestQuestion.findByIdAndUpdate(question._id, updates, {
      new: true,
      runValidators: true
    });

    const totals = await syncTestTotals(question.testId);

    res.json({
      success: true,
      message: 'Question updated',
      data: updated,
      testTotals: totals
    });
  } catch (error) {
    console.error('Update LMS test question error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.deleteQuestion = async (req, res) => {
  try {
    const question = await LmsTestQuestion.findOne({ _id: req.params.id, ...NOT_DELETED });
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    const test = await findActiveTest(question.testId);
    if (!test) {
      return res.status(404).json({ success: false, message: 'Test not found' });
    }

    const course = await getCourseForAdmin(req, res, test.courseId);
    if (!course) return;

    await LmsTestQuestion.deleteOne({ _id: question._id });

    const totals = await syncTestTotals(question.testId);

    res.json({
      success: true,
      message: 'Question deleted',
      testTotals: totals
    });
  } catch (error) {
    console.error('Delete LMS test question error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.reorderQuestions = async (req, res) => {
  try {
    const { testId, orders } = req.body;

    if (!testId || !Array.isArray(orders) || !orders.length) {
      return res.status(400).json({
        success: false,
        message: 'testId and orders array [{ questionId, order }] are required'
      });
    }

    const test = await findActiveTest(testId);
    if (!test) {
      return res.status(404).json({ success: false, message: 'Test not found' });
    }

    const course = await getCourseForAdmin(req, res, test.courseId);
    if (!course) return;

    await Promise.all(
      orders.map(({ questionId, order }) =>
        LmsTestQuestion.updateOne(
          { _id: questionId, testId, ...NOT_DELETED },
          { $set: { order: Number(order) } }
        )
      )
    );

    const questions = await LmsTestQuestion.find({ testId, ...NOT_DELETED })
      .sort({ order: 1 })
      .lean();

    res.json({
      success: true,
      message: 'Questions reordered',
      data: questions
    });
  } catch (error) {
    console.error('Reorder LMS test questions error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
```

---

## `controllers/lmsTestAttemptController.js`

```javascript
const LmsTestAttempt = require('../models/LmsTestAttempt');
const LmsTest = require('../models/LmsTest');
const { formatQuestionForReview, NOT_DELETED } = require('../utils/lmsTestHelpers');
const { getPagination, paginatedResponse } = require('../utils/pagination');

exports.getAttemptResult = async (req, res) => {
  try {
    const attempt = await LmsTestAttempt.findById(req.params.attemptId).lean();

    if (!attempt) {
      return res.status(404).json({ success: false, message: 'Attempt not found' });
    }

    if (String(attempt.userId) !== String(req.user._id)) {
      const isAdmin = ['super_admin', 'center_admin', 'employee'].includes(req.user.role);
      if (!isAdmin) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

    if (attempt.status !== 'submitted') {
      return res.status(400).json({
        success: false,
        message: 'Test not submitted yet'
      });
    }

    const test = await LmsTest.findOne({ _id: attempt.testId, ...NOT_DELETED }).lean();

    const snapshot = attempt.questionSnapshot || [];
    const answerMap = new Map(
      (attempt.answers || []).map((a) => [String(a.questionId), a])
    );

    res.json({
      success: true,
      data: {
        attempt: {
          _id: attempt._id,
          testId: attempt.testId,
          courseId: attempt.courseId,
          score: attempt.obtainedMarks,
          percentage: attempt.percentage,
          correctAnswers: attempt.correctAnswers,
          wrongAnswers: attempt.wrongAnswers,
          unanswered: attempt.unanswered,
          obtainedMarks: attempt.obtainedMarks,
          totalMarks: attempt.totalMarks,
          isPassed: attempt.isPassed,
          startedAt: attempt.startedAt,
          submittedAt: attempt.submittedAt,
          timeTakenInSeconds: attempt.timeTakenInSeconds
        },
        test: test
          ? {
              _id: test._id,
              title: test.title,
              durationInMinutes: test.durationInMinutes,
              passMarks: test.passMarks
            }
          : { title: 'Test (removed)' },
        questions: snapshot.map((snap) =>
          formatQuestionForReview(snap, answerMap.get(String(snap.questionId)))
        )
      }
    });
  } catch (error) {
    console.error('Get LMS test attempt error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

exports.getMyAttempts = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query, 20, 50);

    const filter = { userId: req.user._id, status: 'submitted' };
    if (req.query.courseId) filter.courseId = req.query.courseId;
    if (req.query.testId) filter.testId = req.query.testId;

    const [attempts, total] = await Promise.all([
      LmsTestAttempt.find(filter)
        .sort({ submittedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('testId', 'title categoryId durationInMinutes')
        .lean(),
      LmsTestAttempt.countDocuments(filter)
    ]);

    res.json(paginatedResponse(attempts, total, page, limit));
  } catch (error) {
    console.error('Get my LMS attempts error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
```

---

## `routes/lmsTestRoutes.js`

```javascript
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  getCategories,
  createCategory
} = require('../controllers/lmsTestCategoryController');
const {
  createTest,
  updateTest,
  deleteTest,
  publishTest,
  getTestsByCourseAndCategory,
  getTestsByCourseAndCategoryAdmin,
  startTest,
  submitTest
} = require('../controllers/lmsTestController');
const {
  createQuestion,
  getQuestionsByTest,
  updateQuestion,
  deleteQuestion,
  reorderQuestions
} = require('../controllers/lmsTestQuestionController');
const {
  getAttemptResult,
  getMyAttempts
} = require('../controllers/lmsTestAttemptController');

const admin = authorize('super_admin', 'center_admin', 'employee');

// Static routes first (avoid /:id capturing "attempts", "questions", etc.)
router.get('/categories', getCategories);
router.post('/categories', protect, admin, createCategory);

router.get('/attempts/me/list', protect, getMyAttempts);
router.get('/attempts/:attemptId', protect, getAttemptResult);

router.post('/questions', protect, admin, createQuestion);
router.put('/questions/reorder', protect, admin, reorderQuestions);
router.get('/questions/test/:testId', protect, admin, getQuestionsByTest);
router.put('/questions/:id', protect, admin, updateQuestion);
router.delete('/questions/:id', protect, admin, deleteQuestion);

router.get(
  '/course/:courseId/category/:categoryId',
  protect,
  getTestsByCourseAndCategory
);
router.get(
  '/course/:courseId/category/:categoryId/admin',
  protect,
  admin,
  getTestsByCourseAndCategoryAdmin
);

router.post('/', protect, admin, createTest);
router.put('/:id', protect, admin, updateTest);
router.delete('/:id', protect, admin, deleteTest);
router.patch('/:id/publish', protect, admin, publishTest);

router.get('/:id/start', protect, startTest);
router.post('/:id/submit', protect, submitTest);

module.exports = router;
```

---

## `server.js` additions

```javascript
const { seedLmsTestCategories } = require('./utils/lmsTestSeed');

seedLmsTestCategories().catch((err) => {
  console.error('LMS test category seed failed:', err.message);
});
```

## `app.js` registration

```javascript
const lmsTestRoutes = require('./routes/lmsTestRoutes');
app.use('/api/tests', lmsTestRoutes);
```

## `routes/testAttemptRoutes.js` (result alias)

```javascript
const { getAttemptResult } = require('../controllers/lmsTestAttemptController');
router.get('/:attemptId', protect, getAttemptResult);
```

Place before `router.post('/:paperId', ...)` for legacy paper routes.
