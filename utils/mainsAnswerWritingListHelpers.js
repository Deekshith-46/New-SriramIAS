const mongoose = require('mongoose');
const FacultySubject = require('../models/FacultySubject');
const Topic = require('../models/Topic');
const SubjectMainsAnswerWriting = require('../models/SubjectMainsAnswerWriting');
const { isValidObjectId } = require('./contentIdGenerator');
const { escapeRegex, NOT_DELETED } = require('./contentMastersHelpers');
const { PUBLISH_STATUSES } = require('./facultyContentConstants');

const formatDurationLabel = (minutes = 0) => {
  const mins = Math.max(0, Number(minutes) || 0);
  if (mins < 60) return `${mins} mins`;
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem ? `${hours} hr ${rem} mins` : `${hours} hr`;
};

const formatMainsAnswerWritingRow = (doc) => ({
  _id: doc._id,
  mainsAnswerWritingId: doc.mainsAnswerWritingId,
  facultySubjectId: doc.facultySubjectId,
  folderId: doc.folderId,
  topicId: doc.topicId || null,
  testName: doc.testName,
  scheduleDate: doc.scheduleDate,
  durationPreset: doc.durationPreset,
  durationMinutes: doc.durationMinutes,
  durationLabel: formatDurationLabel(doc.durationMinutes),
  totalMarks: doc.totalMarks,
  resultDate: doc.resultDate,
  questionsText: doc.questionsText,
  pdf: doc.pdf,
  publishStatus: doc.publishStatus,
  folderName: doc.folderName || doc.folder?.folderName || '',
  facultySubjectName: doc.facultySubjectName || doc.facultySubject?.subjectName || '',
  topicName: doc.topicName || doc.topic?.topicName || '',
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt
});

const resolveFacultySubjectIdsForFilter = async ({
  facultySubjectId,
  subjectId,
  subjectName
}) => {
  if (facultySubjectId && isValidObjectId(facultySubjectId)) {
    return [new mongoose.Types.ObjectId(facultySubjectId)];
  }

  const query = {
    status: 'ACTIVE',
    categories: { $in: ['MAINS_ANSWER_WRITING'] },
    ...NOT_DELETED
  };

  if (subjectId && isValidObjectId(subjectId)) {
    query.subject = new mongoose.Types.ObjectId(subjectId);
  }

  const nameTerm = String(subjectName || '').trim();
  if (nameTerm) {
    const regex = escapeRegex(nameTerm);
    query.subjectName = { $regex: regex, $options: 'i' };
  }

  if (!subjectId && !nameTerm) {
    return null;
  }

  const rows = await FacultySubject.find(query).select('_id').lean();
  return rows.map((r) => r._id);
};

const resolveTopicIdsForFilter = async ({ topicId, topicName }) => {
  if (topicId && isValidObjectId(topicId)) {
    return [new mongoose.Types.ObjectId(topicId)];
  }

  const nameTerm = String(topicName || '').trim();
  if (!nameTerm) return null;

  const topics = await Topic.find({
    topicName: { $regex: escapeRegex(nameTerm), $options: 'i' },
    status: 'ACTIVE',
    ...NOT_DELETED
  })
    .select('_id')
    .lean();

  return topics.map((t) => t._id);
};

/**
 * Match tests tagged with topicId OR legacy rows (topicId null) on a faculty
 * subject that includes that topic in topics[].
 */
const buildTopicFilterMatch = async (topicIds, facultySubjectId) => {
  if (!topicIds?.length) return null;

  const topicOids = topicIds.map((id) =>
    id instanceof mongoose.Types.ObjectId ? id : new mongoose.Types.ObjectId(id)
  );

  const fsQuery = {
    topics: { $in: topicOids },
    status: 'ACTIVE',
    categories: { $in: ['MAINS_ANSWER_WRITING'] },
    ...NOT_DELETED
  };

  if (facultySubjectId && isValidObjectId(facultySubjectId)) {
    fsQuery._id = new mongoose.Types.ObjectId(facultySubjectId);
  }

  const facultySubjects = await FacultySubject.find(fsQuery).select('_id').lean();
  const fsIds = facultySubjects.map((f) => f._id);

  const legacyNullTopic = [{ topicId: null }, { topicId: { $exists: false } }];

  if (!fsIds.length) {
    return { topicId: { $in: topicOids } };
  }

  return {
    $or: [
      { topicId: { $in: topicOids } },
      {
        facultySubjectId: { $in: fsIds },
        $or: legacyNullTopic
      }
    ]
  };
};

const buildMainsAnswerWritingListPipeline = ({
  facultySubjectId,
  folderId,
  topicId,
  topicName,
  subjectId,
  subjectName,
  publishStatus,
  search = '',
  sort,
  skip,
  limit,
  extraMatch = {}
}) => {
  const match = { isDeleted: false, ...extraMatch };

  if (facultySubjectId && isValidObjectId(facultySubjectId)) {
    match.facultySubjectId = new mongoose.Types.ObjectId(facultySubjectId);
  }
  if (folderId && isValidObjectId(folderId)) {
    match.folderId = new mongoose.Types.ObjectId(folderId);
  }
  if (publishStatus && PUBLISH_STATUSES.includes(publishStatus)) {
    match.publishStatus = publishStatus;
  }

  const pipeline = [{ $match: match }];

  pipeline.push(
    {
      $lookup: {
        from: 'subjectcontentfolders',
        localField: 'folderId',
        foreignField: '_id',
        as: 'folderDoc'
      }
    },
    {
      $lookup: {
        from: 'facultysubjects',
        localField: 'facultySubjectId',
        foreignField: '_id',
        as: 'facultySubjectDoc'
      }
    },
    {
      $lookup: {
        from: 'topics',
        localField: 'topicId',
        foreignField: '_id',
        as: 'topicDoc'
      }
    },
    { $unwind: { path: '$folderDoc', preserveNullAndEmptyArrays: true } },
    { $unwind: { path: '$facultySubjectDoc', preserveNullAndEmptyArrays: true } },
    { $unwind: { path: '$topicDoc', preserveNullAndEmptyArrays: true } }
  );

  const postLookupMatch = {};

  const trimmedSearch = String(search).trim();
  if (trimmedSearch) {
    const term = escapeRegex(trimmedSearch);
    postLookupMatch.$or = [
      { testName: { $regex: term, $options: 'i' } },
      { 'folderDoc.folderName': { $regex: term, $options: 'i' } },
      { 'facultySubjectDoc.subjectName': { $regex: term, $options: 'i' } },
      { 'topicDoc.topicName': { $regex: term, $options: 'i' } }
    ];
  }

  const subjectNameTerm = String(subjectName || '').trim();
  if (subjectNameTerm && !facultySubjectId) {
    const term = escapeRegex(subjectNameTerm);
    postLookupMatch['facultySubjectDoc.subjectName'] = { $regex: term, $options: 'i' };
  }

  if (Object.keys(postLookupMatch).length) {
    pipeline.push({ $match: postLookupMatch });
  }

  pipeline.push({
    $facet: {
      rows: [
        { $sort: sort },
        { $skip: skip },
        { $limit: limit },
        {
          $project: {
            _id: 1,
            mainsAnswerWritingId: 1,
            facultySubjectId: 1,
            folderId: 1,
            topicId: 1,
            testName: 1,
            scheduleDate: 1,
            durationPreset: 1,
            durationMinutes: 1,
            totalMarks: 1,
            resultDate: 1,
            questionsText: 1,
            pdf: 1,
            publishStatus: 1,
            createdAt: 1,
            updatedAt: 1,
            folderName: '$folderDoc.folderName',
            facultySubjectName: '$facultySubjectDoc.subjectName',
            topicName: '$topicDoc.topicName'
          }
        }
      ],
      total: [{ $count: 'count' }]
    }
  });

  return pipeline;
};

const enrichRowsWithInferredTopic = async (rows, filterTopicIds) => {
  const needsEnrich = rows.filter((r) => !r.topicId && !r.topicName);
  if (!needsEnrich.length) return rows;

  const fsIds = [
    ...new Set(needsEnrich.map((r) => String(r.facultySubjectId)).filter(Boolean))
  ];
  const facultySubjects = await FacultySubject.find({ _id: { $in: fsIds } })
    .populate('topics', 'topicId topicName')
    .lean();
  const fsById = new Map(facultySubjects.map((fs) => [String(fs._id), fs]));

  return rows.map((row) => {
    if (row.topicId || row.topicName) return row;
    const fs = fsById.get(String(row.facultySubjectId));
    if (!fs?.topics?.length) return row;

    let topic = null;
    if (filterTopicIds?.length) {
      const allowed = new Set(filterTopicIds.map((id) => String(id)));
      topic = fs.topics.find((t) => allowed.has(String(t._id)));
    }
    if (!topic && fs.topics.length === 1) {
      topic = fs.topics[0];
    }
    if (!topic) return row;

    return {
      ...row,
      topicName: topic.topicName,
      topicInferredFromFacultySubject: true
    };
  });
};

const runMainsAnswerWritingList = async (filterInput, pagination) => {
  const facultySubjectIds = await resolveFacultySubjectIdsForFilter(filterInput);
  if (facultySubjectIds && facultySubjectIds.length === 0) {
    return { rows: [], total: 0 };
  }

  const topicIds = await resolveTopicIdsForFilter(filterInput);
  if (topicIds && topicIds.length === 0) {
    return { rows: [], total: 0 };
  }

  const matchExtras = {};
  if (facultySubjectIds?.length) {
    matchExtras.facultySubjectId = { $in: facultySubjectIds };
  }

  const topicFilter = await buildTopicFilterMatch(
    topicIds,
    filterInput.facultySubjectId
  );
  if (topicFilter) {
    Object.assign(matchExtras, topicFilter);
  }

  const pipeline = buildMainsAnswerWritingListPipeline({
    ...filterInput,
    topicId: undefined,
    topicName: undefined,
    extraMatch: matchExtras,
    sort: pagination.sort,
    skip: pagination.skip,
    limit: pagination.limit
  });

  const [result] = await SubjectMainsAnswerWriting.aggregate(pipeline);
  const rawRows = result?.rows || [];
  const rows = await enrichRowsWithInferredTopic(rawRows, topicIds);

  return {
    rows,
    total: result?.total?.[0]?.count || 0
  };
};

/** Attach facultySubjectName + topicName for student submission views */
const hydrateMainsTestsForStudent = async (rawTests) => {
  const map = new Map();
  if (!rawTests?.length) return map;

  const fsIds = [...new Set(rawTests.map((t) => String(t.facultySubjectId)).filter(Boolean))];
  const facultySubjects = await FacultySubject.find({ _id: { $in: fsIds } })
    .select('subjectName topics')
    .lean();
  const fsMap = new Map(facultySubjects.map((f) => [String(f._id), f]));

  const topicIdSet = new Set();
  rawTests.forEach((t) => {
    if (t.topicId) topicIdSet.add(String(t.topicId));
  });
  facultySubjects.forEach((fs) => {
    (fs.topics || []).forEach((tid) => topicIdSet.add(String(tid)));
  });

  const topics = topicIdSet.size
    ? await Topic.find({ _id: { $in: [...topicIdSet] } }).select('topicName').lean()
    : [];
  const topicMap = new Map(topics.map((t) => [String(t._id), t.topicName]));

  rawTests.forEach((test) => {
    const fs = fsMap.get(String(test.facultySubjectId));
    let topicName = '';
    if (test.topicId) {
      topicName = topicMap.get(String(test.topicId)) || '';
    } else if (fs?.topics?.length === 1) {
      topicName = topicMap.get(String(fs.topics[0])) || '';
    }

    map.set(String(test._id), {
      ...test,
      facultySubjectName: fs?.subjectName || '',
      topicName
    });
  });

  return map;
};

const formatTestSummaryForStudent = (test) => ({
  _id: test._id,
  mainsAnswerWritingId: test.mainsAnswerWritingId,
  testName: test.testName,
  scheduleDate: test.scheduleDate,
  resultDate: test.resultDate,
  totalMarks: test.totalMarks,
  durationMinutes: test.durationMinutes,
  questionsText: test.questionsText,
  pdf: test.pdf,
  facultySubjectName: test.facultySubjectName || '',
  topicName: test.topicName || ''
});

module.exports = {
  formatMainsAnswerWritingRow,
  buildMainsAnswerWritingListPipeline,
  runMainsAnswerWritingList,
  resolveFacultySubjectIdsForFilter,
  formatDurationLabel,
  hydrateMainsTestsForStudent,
  formatTestSummaryForStudent
};
