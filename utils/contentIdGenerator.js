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

const generateSubjectId = () => generateSequentialId(require('../models/Subject'), 'subjectId', 'SUB');
const generateTopicId = () => generateSequentialId(require('../models/Topic'), 'topicId', 'TOP');
const generateTeacherId = () => generateSequentialId(require('../models/Teacher'), 'teacherId', 'TCH');
const generateClassroomId = () =>
  generateSequentialId(require('../models/Classroom'), 'classroomId', 'CLS');
const generateFacultySubjectId = () =>
  generateSequentialId(require('../models/FacultySubject'), 'facultySubjectId', 'FSU');
const generateBatchId = () => generateSequentialId(require('../models/Batch'), 'batchId', 'BAT');
const generateAcademicStudentId = () =>
  generateSequentialId(require('../models/AcademicStudent'), 'studentId', 'STU');
const generateBatchEnrollmentId = () =>
  generateSequentialId(require('../models/BatchEnrollment'), 'enrollmentId', 'ENR');
const generateBatchTransferId = () =>
  generateSequentialId(require('../models/BatchTransfer'), 'transferId', 'BTR');
const generateSubjectContentFolderId = () =>
  generateSequentialId(require('../models/SubjectContentFolder'), 'folderId', 'FLD');
const generateSubjectLiveClassId = () =>
  generateSequentialId(require('../models/SubjectLiveClass'), 'liveClassId', 'LVC');
const generateSubjectRecordingId = () =>
  generateSequentialId(require('../models/SubjectRecording'), 'recordingId', 'REC');
const generateSubjectMainsAnswerWritingId = () =>
  generateSequentialId(
    require('../models/SubjectMainsAnswerWriting'),
    'mainsAnswerWritingId',
    'MAW'
  );
const generateSubjectPdfId = () =>
  generateSequentialId(require('../models/SubjectPdf'), 'subjectPdfId', 'SPF');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

module.exports = {
  generateSubjectId,
  generateTopicId,
  generateTeacherId,
  generateClassroomId,
  generateFacultySubjectId,
  generateBatchId,
  generateAcademicStudentId,
  generateBatchEnrollmentId,
  generateBatchTransferId,
  generateSubjectContentFolderId,
  generateSubjectLiveClassId,
  generateSubjectRecordingId,
  generateSubjectMainsAnswerWritingId,
  generateSubjectPdfId,
  isValidObjectId
};
