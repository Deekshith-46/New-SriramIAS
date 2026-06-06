const mongoose = require('mongoose');
const SubjectContentFolder = require('../models/SubjectContentFolder');
const SubjectLiveClass = require('../models/SubjectLiveClass');
const SubjectRecording = require('../models/SubjectRecording');
const SubjectMainsAnswerWriting = require('../models/SubjectMainsAnswerWriting');
const SubjectPdf = require('../models/SubjectPdf');
const FacultySubject = require('../models/FacultySubject');
const { isValidObjectId } = require('../utils/contentIdGenerator');
const { NOT_DELETED, escapeRegex, parsePagination, parseSort } = require('../utils/contentMastersHelpers');
const { validateCategory } = require('../utils/facultyContentHelpers');
const {
  runMainsAnswerWritingList,
  formatMainsAnswerWritingRow
} = require('../utils/mainsAnswerWritingListHelpers');

const formatDurationLabel = (seconds = 0) => {
  const total = Math.max(0, Number(seconds) || 0);
  if (total < 60) return `${total} sec`;
  const mins = Math.floor(total / 60);
  const rem = total % 60;
  if (mins < 60) return rem ? `${mins} mins ${rem} sec` : `${mins} mins`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins ? `${hours} hr ${remMins} mins` : `${hours} hr`;
};

const validateFolderScope = async ({ facultySubjectId, category, folderId }) => {
  if (!facultySubjectId || !isValidObjectId(facultySubjectId)) {
    return { ok: false, status: 400, message: 'Valid facultySubjectId is required' };
  }
  if (!folderId || !isValidObjectId(folderId)) {
    return { ok: false, status: 400, message: 'Valid folderId is required' };
  }

  const cat = validateCategory(category);
  if (!cat.ok) {
    return { ok: false, status: 400, message: cat.message };
  }

  const [folder, facultySubject] = await Promise.all([
    SubjectContentFolder.findOne({ _id: folderId, ...NOT_DELETED }).lean(),
    FacultySubject.findOne({ _id: facultySubjectId, ...NOT_DELETED })
      .populate('teacher', 'teacherId teacherName')
      .lean()
  ]);

  if (!facultySubject) {
    return { ok: false, status: 404, message: 'FacultySubject not found' };
  }
  if (!folder) {
    return { ok: false, status: 404, message: 'Content folder not found' };
  }
  if (String(folder.facultySubjectId) !== String(facultySubjectId)) {
    return {
      ok: false,
      status: 400,
      message: 'folderId does not belong to the given facultySubjectId'
    };
  }
  if (folder.category !== cat.value) {
    return {
      ok: false,
      status: 400,
      message: `Folder category is ${folder.category}, expected ${cat.value}`
    };
  }

  return {
    ok: true,
    category: cat.value,
    folder,
    facultySubject
  };
};

const listLiveClassesInFolder = async ({ facultySubjectId, folderId, page, limit, skip, sort }) => {
  const match = {
    isDeleted: false,
    facultySubjectId: new mongoose.Types.ObjectId(facultySubjectId),
    folderId: new mongoose.Types.ObjectId(folderId)
  };

  const pipeline = [
    { $match: match },
    {
      $lookup: {
        from: 'batches',
        localField: 'batchId',
        foreignField: '_id',
        as: 'batchDoc'
      }
    },
    {
      $lookup: {
        from: 'centers',
        localField: 'centerId',
        foreignField: '_id',
        as: 'centerDoc'
      }
    },
    {
      $lookup: {
        from: 'classrooms',
        localField: 'classroomId',
        foreignField: '_id',
        as: 'classroomDoc'
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
        from: 'teachers',
        localField: 'facultySubjectDoc.teacher',
        foreignField: '_id',
        as: 'teacherDoc'
      }
    },
    { $unwind: { path: '$batchDoc', preserveNullAndEmptyArrays: true } },
    { $unwind: { path: '$centerDoc', preserveNullAndEmptyArrays: true } },
    { $unwind: { path: '$classroomDoc', preserveNullAndEmptyArrays: true } },
    { $unwind: { path: '$facultySubjectDoc', preserveNullAndEmptyArrays: true } },
    { $unwind: { path: '$teacherDoc', preserveNullAndEmptyArrays: true } },
    {
      $facet: {
        rows: [
          { $sort: sort },
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              _id: 1,
              liveClassId: 1,
              facultySubjectId: 1,
              folderId: 1,
              batchId: 1,
              centerId: 1,
              classroomId: 1,
              classTitle: 1,
              scheduledDate: 1,
              startTime: 1,
              durationHours: 1,
              durationMinutes: 1,
              durationSeconds: 1,
              timezone: 1,
              attendanceEnabled: 1,
              publishStatus: 1,
              classStatus: 1,
              recurrence: 1,
              createdAt: 1,
              updatedAt: 1,
              batchName: '$batchDoc.batchName',
              centerName: { $ifNull: ['$centerDoc.centerName', '$centerDoc.name'] },
              classroomName: '$classroomDoc.classroomName',
              facultyName: '$teacherDoc.teacherName',
              facultySubjectName: '$facultySubjectDoc.subjectName'
            }
          }
        ],
        total: [{ $count: 'count' }]
      }
    }
  ];

  const [result] = await SubjectLiveClass.aggregate(pipeline);
  return {
    rows: result?.rows || [],
    total: result?.total?.[0]?.count || 0
  };
};

const listRecordingsInFolder = async ({ facultySubjectId, folderId, page, limit, skip, sort }) => {
  const match = {
    isDeleted: false,
    facultySubjectId: new mongoose.Types.ObjectId(facultySubjectId),
    folderId: new mongoose.Types.ObjectId(folderId)
  };

  const pipeline = [
    { $match: match },
    {
      $lookup: {
        from: 'topics',
        localField: 'topicId',
        foreignField: '_id',
        as: 'topicDoc'
      }
    },
    {
      $lookup: {
        from: 'teachers',
        localField: 'teacherId',
        foreignField: '_id',
        as: 'teacherDoc'
      }
    },
    {
      $lookup: {
        from: 'batches',
        localField: 'batchId',
        foreignField: '_id',
        as: 'batchDoc'
      }
    },
    {
      $lookup: {
        from: 'centers',
        localField: 'centerId',
        foreignField: '_id',
        as: 'centerDoc'
      }
    },
    { $unwind: { path: '$topicDoc', preserveNullAndEmptyArrays: true } },
    { $unwind: { path: '$teacherDoc', preserveNullAndEmptyArrays: true } },
    { $unwind: { path: '$batchDoc', preserveNullAndEmptyArrays: true } },
    { $unwind: { path: '$centerDoc', preserveNullAndEmptyArrays: true } },
    {
      $facet: {
        rows: [
          { $sort: sort },
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              _id: 1,
              recordingId: 1,
              facultySubjectId: 1,
              folderId: 1,
              batchId: 1,
              centerId: 1,
              topicId: 1,
              teacherId: 1,
              lessonName: 1,
              visibility: 1,
              recording: 1,
              description: 1,
              viewCount: 1,
              tags: 1,
              createdAt: 1,
              updatedAt: 1,
              topicName: '$topicDoc.topicName',
              teacherName: '$teacherDoc.teacherName',
              batchName: '$batchDoc.batchName',
              centerName: { $ifNull: ['$centerDoc.centerName', '$centerDoc.name'] }
            }
          }
        ],
        total: [{ $count: 'count' }]
      }
    }
  ];

  const [result] = await SubjectRecording.aggregate(pipeline);
  const rows = (result?.rows || []).map((row) => ({
    ...row,
    durationLabel: formatDurationLabel(row.recording?.durationSeconds)
  }));

  return {
    rows,
    total: result?.total?.[0]?.count || 0
  };
};

const listMainsAnswerWritingInFolder = async ({ facultySubjectId, folderId, skip, limit, sort }) => {
  const { rows, total } = await runMainsAnswerWritingList(
    { facultySubjectId, folderId },
    { sort, skip, limit }
  );

  return {
    rows: rows.map((row) => formatMainsAnswerWritingRow(row)),
    total
  };
};

const listPdfsInFolder = async ({ facultySubjectId, folderId, page, limit, skip, sort }) => {
  const match = {
    isDeleted: false,
    facultySubjectId: new mongoose.Types.ObjectId(facultySubjectId),
    folderId: new mongoose.Types.ObjectId(folderId)
  };

  const pipeline = [
    { $match: match },
    {
      $lookup: {
        from: 'batches',
        localField: 'batchId',
        foreignField: '_id',
        as: 'batchDoc'
      }
    },
    { $unwind: { path: '$batchDoc', preserveNullAndEmptyArrays: true } },
    {
      $facet: {
        rows: [
          { $sort: sort },
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              _id: 1,
              subjectPdfId: 1,
              facultySubjectId: 1,
              folderId: 1,
              batchId: 1,
              pdfTitle: 1,
              tags: 1,
              visibility: 1,
              pdf: 1,
              description: 1,
              viewCount: 1,
              createdAt: 1,
              updatedAt: 1,
              batchName: '$batchDoc.batchName'
            }
          }
        ],
        total: [{ $count: 'count' }]
      }
    }
  ];

  const [result] = await SubjectPdf.aggregate(pipeline);
  return {
    rows: result?.rows || [],
    total: result?.total?.[0]?.count || 0
  };
};

const listFolderContent = async ({ facultySubjectId, category, folderId, query = {} }) => {
  const scope = await validateFolderScope({ facultySubjectId, category, folderId });
  if (!scope.ok) {
    return scope;
  }

  const { page, limit, skip } = parsePagination(query);
  const cat = scope.category;

  let rows = [];
  let total = 0;

  if (cat === 'LIVE_CLASS') {
    const sort = parseSort(query, ['createdAt', 'scheduledDate', 'classTitle', 'liveClassId']);
    ({ rows, total } = await listLiveClassesInFolder({
      facultySubjectId,
      folderId,
      page,
      limit,
      skip,
      sort
    }));
  } else if (cat === 'RECORDING') {
    const sort = parseSort(query, ['createdAt', 'lessonName', 'recordingId', 'viewCount']);
    ({ rows, total } = await listRecordingsInFolder({
      facultySubjectId,
      folderId,
      page,
      limit,
      skip,
      sort
    }));
  } else if (cat === 'MAINS_ANSWER_WRITING') {
    const sort = parseSort(query, [
      'createdAt',
      'testName',
      'mainsAnswerWritingId',
      'scheduleDate',
      'resultDate'
    ]);
    ({ rows, total } = await listMainsAnswerWritingInFolder({
      facultySubjectId,
      folderId,
      skip,
      limit,
      sort
    }));
  } else if (cat === 'PDF') {
    const sort = parseSort(query, ['createdAt', 'pdfTitle', 'subjectPdfId', 'viewCount']);
    ({ rows, total } = await listPdfsInFolder({
      facultySubjectId,
      folderId,
      page,
      limit,
      skip,
      sort
    }));
  } else if (cat === 'PRELIMS_TEST') {
    rows = [];
    total = 0;
  }

  return {
    ok: true,
    page,
    limit,
    total,
    count: rows.length,
    totalPages: Math.ceil(total / limit) || 0,
    facultySubjectId,
    category: cat,
    facultySubjectName: scope.facultySubject.subjectName,
    teacherName: scope.facultySubject.teacher?.teacherName || '',
    folder: {
      _id: scope.folder._id,
      folderId: scope.folder.folderId,
      folderName: scope.folder.folderName,
      description: scope.folder.description || '',
      status: scope.folder.status,
      category: scope.folder.category
    },
    data: rows,
    ...(cat === 'PRELIMS_TEST'
      ? { note: 'PRELIMS_TEST content list is not implemented yet.' }
      : {})
  };
};

module.exports = {
  listFolderContent,
  validateFolderScope
};
