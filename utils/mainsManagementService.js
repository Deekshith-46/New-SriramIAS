const mongoose = require('mongoose');
const FacultySubject = require('../models/FacultySubject');
const Topic = require('../models/Topic');
const SubjectMainsAnswerWriting = require('../models/SubjectMainsAnswerWriting');
const MainsAnswerWritingSubmission = require('../models/MainsAnswerWritingSubmission');
const MainsAnswerWritingPdfDownload = require('../models/MainsAnswerWritingPdfDownload');
const Batch = require('../models/Batch');
const BatchEnrollment = require('../models/BatchEnrollment');
const { NOT_DELETED, escapeRegex } = require('./contentMastersHelpers');
const { isValidObjectId } = require('./contentIdGenerator');

const MAINS_CATEGORY = 'MAINS_ANSWER_WRITING';
const ENROLLMENT_ACTIVE = { status: 'ACTIVE', isDeleted: false };

const resolvePassMarks = (test) => {
  const total = Number(test?.totalMarks) || 0;
  const configured = test?.passMarks;
  if (configured !== null && configured !== undefined && !Number.isNaN(Number(configured))) {
    return Number(configured);
  }
  return total > 0 ? Math.ceil(total * 0.4) : 0;
};

const formatFacultySubjectLabel = (subjectName, teacherName) => {
  const sub = String(subjectName || '').trim();
  const teacher = String(teacherName || '').trim();
  if (!teacher) return sub;
  return `${sub} by ${teacher}`;
};

const getBatchIdsForFacultySubject = async (facultySubjectId) => {
  const fsOid = new mongoose.Types.ObjectId(facultySubjectId);
  return Batch.find({
    facultySubjects: fsOid,
    isDeleted: false
  })
    .distinct('_id');
};

const countAssignedStudents = async (facultySubjectId) => {
  const batchIds = await getBatchIdsForFacultySubject(facultySubjectId);
  if (!batchIds.length) return 0;

  const rows = await BatchEnrollment.aggregate([
    { $match: { batch: { $in: batchIds }, ...ENROLLMENT_ACTIVE } },
    {
      $lookup: {
        from: 'students',
        localField: 'student',
        foreignField: '_id',
        as: 'studentDoc'
      }
    },
    { $unwind: '$studentDoc' },
    { $match: { 'studentDoc.userId': { $ne: null } } },
    { $group: { _id: '$studentDoc.userId' } },
    { $count: 'total' }
  ]);

  return rows[0]?.total || 0;
};

const getSubmissionStatsForTests = async (testIds) => {
  if (!testIds.length) return new Map();

  const oids = testIds.map((id) => new mongoose.Types.ObjectId(id));
  const rows = await MainsAnswerWritingSubmission.aggregate([
    { $match: { mainsAnswerWritingId: { $in: oids } } },
    {
      $group: {
        _id: '$mainsAnswerWritingId',
        uploadedAnswerSheets: { $sum: 1 },
        evaluatedCount: {
          $sum: { $cond: [{ $eq: ['$submissionStatus', 'evaluated'] }, 1, 0] }
        }
      }
    }
  ]);

  return new Map(
    rows.map((r) => {
      const uploaded = r.uploadedAnswerSheets || 0;
      const evaluated = r.evaluatedCount || 0;
      return [
        String(r._id),
        {
          uploadedAnswerSheets: uploaded,
          evaluatedCount: evaluated,
          pendingCount: Math.max(0, uploaded - evaluated),
          evaluationPercentage:
            uploaded > 0 ? Math.round((evaluated / uploaded) * 100) : 0
        }
      ];
    })
  );
};

const findMainsFacultySubject = async (facultySubjectId) => {
  if (!isValidObjectId(facultySubjectId)) return null;
  return FacultySubject.findOne({
    _id: facultySubjectId,
    categories: MAINS_CATEGORY,
    ...NOT_DELETED
  })
    .populate('teacher', 'teacherName')
    .populate('subject', 'subjectName')
    .lean();
};

/** Level 1 — latest evaluation progress cards */
const getLatestEvaluationProgress = async (limit = 5) => {
  const tests = await SubjectMainsAnswerWriting.find({
    isDeleted: false,
    publishStatus: 'PUBLISHED'
  })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .populate({
      path: 'facultySubjectId',
      select: 'subjectName teacher',
      populate: { path: 'teacher', select: 'teacherName' }
    })
    .lean();

  if (!tests.length) return [];

  const testIds = tests.map((t) => t._id);
  const statsMap = await getSubmissionStatsForTests(testIds);
  const assignedCache = new Map();

  const cards = [];
  for (const test of tests) {
    const fsId = String(test.facultySubjectId?._id || test.facultySubjectId);
    if (!assignedCache.has(fsId)) {
      assignedCache.set(fsId, await countAssignedStudents(fsId));
    }
    const stats = statsMap.get(String(test._id)) || {
      uploadedAnswerSheets: 0,
      evaluatedCount: 0,
      pendingCount: 0,
      evaluationPercentage: 0
    };
    const fs = test.facultySubjectId;
    const teacherName = fs?.teacher?.teacherName || '';
    cards.push({
      testId: test._id,
      mainsAnswerWritingId: test.mainsAnswerWritingId,
      testName: test.testName,
      facultyName: formatFacultySubjectLabel(fs?.subjectName, teacherName),
      studentsAssigned: assignedCache.get(fsId),
      uploadedAnswerSheets: stats.uploadedAnswerSheets,
      evaluatedCount: stats.evaluatedCount,
      pendingCount: stats.pendingCount,
      evaluationPercentage: stats.evaluationPercentage
    });
  }

  return cards;
};

/** Level 1 — faculty subjects table */
const listMainsFacultySubjects = async ({ search = '', page = 1, limit = 20, sort = 'updatedAt' }) => {
  const match = {
    categories: MAINS_CATEGORY,
    ...NOT_DELETED,
    status: 'ACTIVE'
  };

  if (search.trim()) {
    const regex = new RegExp(escapeRegex(search.trim()), 'i');
    match.$or = [{ subjectName: regex }, { facultySubjectId: regex }];
  }

  const sortField =
    sort === 'subjectName' ? 'subjectName' : sort === 'topicsCount' ? 'topicsCount' : 'lastUpdated';
  const sortDir = sortField === 'subjectName' ? 1 : -1;

  const pipeline = [
    { $match: match },
    {
      $lookup: {
        from: 'teachers',
        localField: 'teacher',
        foreignField: '_id',
        as: 'teacherDoc'
      }
    },
    { $unwind: { path: '$teacherDoc', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'subjectmainsanswerwritings',
        let: { fsId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$facultySubjectId', '$$fsId'] },
              isDeleted: false
            }
          },
          { $project: { updatedAt: 1, topicId: 1 } }
        ],
        as: 'tests'
      }
    },
    {
      $addFields: {
        topicsCount: { $size: { $ifNull: ['$topics', []] } },
        testsPdfCount: { $size: '$tests' },
        lastUpdated: {
          $max: {
            $map: { input: '$tests', as: 't', in: '$$t.updatedAt' }
          }
        }
      }
    },
    {
      $project: {
        facultySubjectId: '$_id',
        facultySubjectCode: '$facultySubjectId',
        facultySubject: {
          $trim: {
            input: {
              $concat: [
                '$subjectName',
                {
                  $cond: [
                    { $gt: [{ $strLenCP: { $ifNull: ['$teacherDoc.teacherName', ''] } }, 0] },
                    { $concat: [' by ', '$teacherDoc.teacherName'] },
                    ''
                  ]
                }
              ]
            }
          }
        },
        subjectName: '$subjectName',
        teacherName: { $ifNull: ['$teacherDoc.teacherName', ''] },
        topicsCount: 1,
        testsPdfCount: 1,
        lastUpdated: { $ifNull: ['$lastUpdated', '$updatedAt'] }
      }
    },
    { $sort: { [sortField]: sortDir } },
    {
      $facet: {
        rows: [{ $skip: (page - 1) * limit }, { $limit: limit }],
        total: [{ $count: 'count' }]
      }
    }
  ];

  const [result] = await FacultySubject.aggregate(pipeline);
  const rows = result?.rows || [];
  const total = result?.total?.[0]?.count || 0;

  return { rows, total, page, limit };
};

/** Level 2 — faculty subject detail + topics */
const getFacultySubjectDetails = async (facultySubjectId) => {
  const fs = await findMainsFacultySubject(facultySubjectId);
  if (!fs) return null;

  const topicIds = (fs.topics || []).map((id) => new mongoose.Types.ObjectId(id));
  const tests = await SubjectMainsAnswerWriting.find({
    facultySubjectId: fs._id,
    isDeleted: false
  })
    .select('topicId updatedAt')
    .lean();

  const testsByTopic = new Map();
  tests.forEach((t) => {
    const key = t.topicId ? String(t.topicId) : '_none';
    testsByTopic.set(key, (testsByTopic.get(key) || 0) + 1);
  });

  let topics = [];
  if (topicIds.length) {
    topics = await Topic.find({ _id: { $in: topicIds }, ...NOT_DELETED })
      .select('_id topicId topicName')
      .sort({ topicName: 1 })
      .lean();
  }

  const subjectName = fs.subject?.subjectName || fs.subjectName;

  return {
    facultySubjectId: fs._id,
    facultySubjectCode: fs.facultySubjectId,
    facultySubjectName: formatFacultySubjectLabel(fs.subjectName, fs.teacher?.teacherName),
    subjectName,
    teacherName: fs.teacher?.teacherName || '',
    topicsCount: topicIds.length,
    testsPdfCount: tests.length,
    cards: {
      topics: topicIds.length,
      testsPdfs: tests.length,
      subject: subjectName
    },
    topics: topics.map((t) => ({
      topicId: t._id,
      topicCode: t.topicId,
      topicName: t.topicName,
      testsPdfCount: testsByTopic.get(String(t._id)) || 0
    }))
  };
};

/** Level 3 — tests under a topic */
const getTopicTests = async (topicId, { search = '', page = 1, limit = 10 }) => {
  if (!isValidObjectId(topicId)) return null;

  const topic = await Topic.findOne({ _id: topicId, ...NOT_DELETED }).lean();
  if (!topic) return { notFound: true };

  const filter = {
    topicId: new mongoose.Types.ObjectId(topicId),
    isDeleted: false
  };

  if (search.trim()) {
    filter.testName = new RegExp(escapeRegex(search.trim()), 'i');
  }

  const [tests, total] = await Promise.all([
    SubjectMainsAnswerWriting.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('_id mainsAnswerWritingId testName createdAt facultySubjectId pdf')
      .lean(),
    SubjectMainsAnswerWriting.countDocuments(filter)
  ]);

  if (!tests.length) {
    return {
      topic: { topicId: topic._id, topicName: topic.topicName },
      rows: [],
      total,
      page,
      limit
    };
  }

  const testIds = tests.map((t) => t._id);
  const fsId = tests[0].facultySubjectId;
  const [statsMap, studentsAssigned, downloadCounts] = await Promise.all([
    getSubmissionStatsForTests(testIds),
    countAssignedStudents(fsId),
    MainsAnswerWritingPdfDownload.aggregate([
      { $match: { mainsAnswerWritingId: { $in: testIds } } },
      { $group: { _id: '$mainsAnswerWritingId', count: { $sum: 1 } } }
    ])
  ]);

  const downloadMap = new Map(downloadCounts.map((d) => [String(d._id), d.count]));

  const fs = await FacultySubject.findById(fsId)
    .populate('teacher', 'teacherName')
    .lean();

  const rows = tests.map((t) => {
    const stats = statsMap.get(String(t._id)) || {
      uploadedAnswerSheets: 0,
      evaluatedCount: 0
    };
    return {
      testId: t._id,
      mainsAnswerWritingId: t.mainsAnswerWritingId,
      testName: t.testName,
      uploadedDate: t.createdAt,
      studentsAssigned,
      pdfDownloads: downloadMap.get(String(t._id)) || 0,
      answerSheetUploads: stats.uploadedAnswerSheets
    };
  });

  return {
    topic: {
      topicId: topic._id,
      topicName: topic.topicName,
      facultySubjectName: fs
        ? formatFacultySubjectLabel(fs.subjectName, fs.teacher?.teacherName)
        : ''
    },
    rows,
    total,
    page,
    limit
  };
};

const buildRankMap = (evaluatedRows) => {
  const sorted = [...evaluatedRows].sort((a, b) => b.marks - a.marks);
  const rankMap = new Map();
  let rank = 0;
  let prevMarks = null;
  sorted.forEach((row, index) => {
    if (prevMarks === null || row.marks < prevMarks) {
      rank = index + 1;
      prevMarks = row.marks;
    }
    rankMap.set(String(row.studentId), rank);
  });
  return rankMap;
};

const computeAnalytics = (evaluatedRows, passMarks, totalMarks) => {
  if (!evaluatedRows.length) {
    return {
      highestMarks: 0,
      lowestMarks: 0,
      averageMarks: 0,
      topRanker: null,
      totalPassed: 0,
      totalFailed: 0
    };
  }

  const marksList = evaluatedRows.map((r) => r.marks);
  const highest = Math.max(...marksList);
  const lowest = Math.min(...marksList);
  const average = marksList.reduce((a, b) => a + b, 0) / marksList.length;
  const passed = evaluatedRows.filter((r) => r.marks >= passMarks).length;
  const failed = evaluatedRows.filter((r) => r.marks < passMarks).length;
  const top = evaluatedRows.find((r) => r.marks === highest);

  return {
    highestMarks: highest,
    lowestMarks: lowest,
    averageMarks: Math.round(average * 10) / 10,
    topRanker: top
      ? { studentName: top.studentName, marks: top.marks, totalMarks }
      : null,
    totalPassed: passed,
    totalFailed: failed
  };
};

/** Level 4 — full test results */
const getTestResults = async (
  testId,
  { search = '', statusFilter = 'all', page = 1, limit = 20 }
) => {
  if (!isValidObjectId(testId)) return null;

  const test = await SubjectMainsAnswerWriting.findOne({
    _id: testId,
    isDeleted: false
  })
    .populate({
      path: 'facultySubjectId',
      select: 'subjectName teacher topics',
      populate: { path: 'teacher', select: 'teacherName' }
    })
    .populate('topicId', 'topicName')
    .lean();

  if (!test) return { notFound: true };

  const passMarks = resolvePassMarks(test);
  const totalMarks = test.totalMarks;
  const fsId = test.facultySubjectId?._id || test.facultySubjectId;
  const batchIds = await getBatchIdsForFacultySubject(fsId);

  const [studentsAssigned, pdfDownloads, submissionAgg] = await Promise.all([
    countAssignedStudents(fsId),
    MainsAnswerWritingPdfDownload.countDocuments({ mainsAnswerWritingId: test._id }),
    MainsAnswerWritingSubmission.aggregate([
      { $match: { mainsAnswerWritingId: test._id } },
      {
        $group: {
          _id: null,
          uploaded: { $sum: 1 },
          evaluated: {
            $sum: { $cond: [{ $eq: ['$submissionStatus', 'evaluated'] }, 1, 0] }
          }
        }
      }
    ])
  ]);

  const subStats = submissionAgg[0] || { uploaded: 0, evaluated: 0 };
  const uploaded = subStats.uploaded || 0;
  const evaluated = subStats.evaluated || 0;
  const pending = Math.max(0, uploaded - evaluated);

  if (!batchIds.length) {
    return {
      test: formatTestHeader(test),
      evaluationSummary: {
        assigned: 0,
        downloads: pdfDownloads,
        uploaded: 0,
        evaluated: 0,
        pending: 0,
        uploadProgressPercent: 0,
        evaluationProgressPercent: 0
      },
      resultCards: { totalStudents: 0, evaluated: 0, passed: 0, failed: 0 },
      analytics: computeAnalytics([], passMarks, totalMarks),
      students: { total: 0, page, limit, totalPages: 0, data: [] },
      passMarks,
      totalMarks
    };
  }

  const searchRegex = search.trim() ? new RegExp(escapeRegex(search.trim()), 'i') : null;

  const enrollmentPipeline = [
    { $match: { batch: { $in: batchIds }, ...ENROLLMENT_ACTIVE } },
    {
      $lookup: {
        from: 'students',
        localField: 'student',
        foreignField: '_id',
        as: 'studentDoc'
      }
    },
    { $unwind: '$studentDoc' },
    { $match: { 'studentDoc.userId': { $ne: null } } },
    {
      $lookup: {
        from: 'mainsanswerwritingsubmissions',
        let: { uid: '$studentDoc.userId' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$mainsAnswerWritingId', new mongoose.Types.ObjectId(testId)] },
                  { $eq: ['$studentId', '$$uid'] }
                ]
              }
            }
          },
          {
            $lookup: {
              from: 'adminaccesses',
              localField: 'evaluatedBy',
              foreignField: '_id',
              as: 'evaluator'
            }
          },
          { $limit: 1 }
        ],
        as: 'submission'
      }
    },
    {
      $addFields: {
        submission: { $arrayElemAt: ['$submission', 0] },
        userId: '$studentDoc.userId'
      }
    },
    {
      $project: {
        studentName: '$studentDoc.studentName',
        registerNumber: '$studentDoc.studentId',
        email: '$studentDoc.email',
        userId: 1,
        submission: 1
      }
    }
  ];

  if (searchRegex) {
    enrollmentPipeline.push({
      $match: {
        $or: [{ studentName: searchRegex }, { registerNumber: searchRegex }]
      }
    });
  }

  const status = String(statusFilter || 'all').toLowerCase();
  if (status === 'uploaded') {
    enrollmentPipeline.push({ $match: { submission: { $ne: null } } });
  } else if (status === 'not_uploaded') {
    enrollmentPipeline.push({
      $match: { $or: [{ submission: null }, { submission: { $exists: false } }] }
    });
  } else if (status === 'pending' || status === 'pending_evaluation') {
    enrollmentPipeline.push({
      $match: { 'submission.submissionStatus': 'submitted' }
    });
  } else if (status === 'passed') {
    enrollmentPipeline.push({
      $match: {
        'submission.submissionStatus': 'evaluated',
        'submission.marks': { $gte: passMarks }
      }
    });
  } else if (status === 'failed') {
    enrollmentPipeline.push({
      $match: {
        'submission.submissionStatus': 'evaluated',
        'submission.marks': { $lt: passMarks }
      }
    });
  }

  const allRows = await BatchEnrollment.aggregate(enrollmentPipeline);

  const evaluatedForRank = allRows
    .filter((r) => r.submission?.submissionStatus === 'evaluated')
    .map((r) => ({
      studentId: r.userId,
      marks: r.submission.marks ?? 0,
      studentName: r.studentName
    }));

  const rankMap = buildRankMap(evaluatedForRank);
  const analytics = computeAnalytics(
    evaluatedForRank.map((r) => ({ ...r, studentName: r.studentName })),
    passMarks,
    totalMarks
  );

  const formatted = allRows.map((row) => {
    const sub = row.submission;
    const hasUpload = Boolean(sub);
    const isEvaluated = sub?.submissionStatus === 'evaluated';
    const marks = isEvaluated ? sub.marks ?? 0 : null;
    let passFailStatus = 'Pending';
    if (!hasUpload) passFailStatus = 'Pending';
    else if (!isEvaluated) passFailStatus = 'Pending';
    else if (marks >= passMarks) passFailStatus = 'Passed';
    else passFailStatus = 'Failed';

    const evaluator = sub?.evaluator?.[0];

    return {
      studentId: row.userId,
      studentName: row.studentName,
      registerNumber: row.registerNumber || '',
      uploadedStatus: hasUpload ? 'Uploaded' : 'Not Uploaded',
      marks: isEvaluated ? `${marks}/${totalMarks}` : '—',
      marksValue: marks,
      rank: isEvaluated ? rankMap.get(String(row.userId)) ?? '—' : '—',
      evaluatedBy: evaluator?.fullName || '—',
      evaluationDate: sub?.evaluatedAt
        ? sub.evaluatedAt.toISOString().slice(0, 10)
        : '—',
      passFailStatus
    };
  });

  const total = formatted.length;
  const skip = (page - 1) * limit;
  const pageRows = formatted.slice(skip, skip + limit);

  const passedCount = evaluatedForRank.filter((r) => r.marks >= passMarks).length;
  const failedCount = evaluatedForRank.filter((r) => r.marks < passMarks).length;

  return {
    test: formatTestHeader(test),
    evaluationSummary: {
      assigned: studentsAssigned,
      downloads: pdfDownloads,
      uploaded,
      evaluated,
      pending,
      uploadProgressPercent:
        studentsAssigned > 0 ? Math.round((uploaded / studentsAssigned) * 100) : 0,
      evaluationProgressPercent: uploaded > 0 ? Math.round((evaluated / uploaded) * 100) : 0
    },
    resultCards: {
      totalStudents: studentsAssigned,
      evaluated,
      passed: passedCount,
      failed: failedCount
    },
    analytics,
    passMarks,
    totalMarks,
    students: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 0,
      data: pageRows
    }
  };
};

const formatTestHeader = (test) => {
  const fs = test.facultySubjectId;
  const teacherName = fs?.teacher?.teacherName || '';
  return {
    testId: test._id,
    mainsAnswerWritingId: test.mainsAnswerWritingId,
    testName: test.testName,
    facultySubjectName: formatFacultySubjectLabel(fs?.subjectName, teacherName),
    subjectName: fs?.subjectName || '',
    teacherName,
    topicName: test.topicId?.topicName || ''
  };
};

const trackPdfDownload = async (testId, studentUserId) => {
  const test = await SubjectMainsAnswerWriting.findOne({
    _id: testId,
    isDeleted: false,
    publishStatus: 'PUBLISHED'
  }).lean();

  if (!test) return { ok: false, status: 404, message: 'Test not found' };

  await MainsAnswerWritingPdfDownload.findOneAndUpdate(
    {
      mainsAnswerWritingId: test._id,
      studentId: studentUserId
    },
    {
      $set: {
        facultySubjectId: test.facultySubjectId,
        downloadedAt: new Date()
      }
    },
    { upsert: true, new: true }
  );

  const count = await MainsAnswerWritingPdfDownload.countDocuments({
    mainsAnswerWritingId: test._id
  });

  return { ok: true, pdfUrl: test.pdf?.url || '', totalDownloads: count };
};

module.exports = {
  MAINS_CATEGORY,
  resolvePassMarks,
  getLatestEvaluationProgress,
  listMainsFacultySubjects,
  getFacultySubjectDetails,
  getTopicTests,
  getTestResults,
  trackPdfDownload,
  findMainsFacultySubject
};
