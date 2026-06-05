const XLSX = require('xlsx');
const {
  normalizeQuestionType,
  normalizeCategory,
  normalizeStatus,
  normalizeDifficulty,
  normalizeAssertionAnswer,
  BULK_TEMPLATE_TYPES
} = require('./questionBankEnums');
const {
  parseTags,
  parseMatchPairsFromColumns,
  normalizeMcqAnswer,
  normalizeNumericalAnswer
} = require('./questionBankHelpers');
const { validateTypeSpecificFields } = require('./questionBankTypeValidators');

const TEMPLATE_HEADERS = {
  MCQ: [
    'category',
    'questionType',
    'questionText',
    'optionA',
    'optionB',
    'optionC',
    'optionD',
    'correctAnswer',
    'explanation',
    'difficulty',
    'subject',
    'topic',
    'tags',
    'status'
  ],
  NUMERICAL: [
    'category',
    'questionType',
    'questionText',
    'numericalAnswer',
    'explanation',
    'difficulty',
    'subject',
    'topic',
    'tags',
    'status'
  ],
  MATCH_THE_FOLLOWING: [
    'category',
    'questionType',
    'questionText',
    'prompt',
    'leftColumn',
    'rightColumn',
    'correctMapping',
    'explanation',
    'difficulty',
    'subject',
    'topic',
    'tags',
    'status'
  ],
  ASSERTION_REASON: [
    'category',
    'questionType',
    'questionText',
    'assertion',
    'reason',
    'correctAnswer',
    'explanation',
    'difficulty',
    'subject',
    'topic',
    'tags',
    'status'
  ],
  DESCRIPTIVE: [
    'category',
    'questionType',
    'questionText',
    'explanation',
    'difficulty',
    'subject',
    'topic',
    'tags',
    'status'
  ]
};

const normalizeHeader = (value) =>
  String(value || '')
    .trim()
    .replace(/\s+/g, '')
    .toLowerCase();

const HEADER_ALIASES = {
  category: 'category',
  questiontype: 'questionType',
  questiontext: 'questionText',
  optiona: 'optionA',
  optionb: 'optionB',
  optionc: 'optionC',
  optiond: 'optionD',
  correctanswer: 'correctAnswer',
  numericalanswer: 'numericalAnswer',
  leftcolumn: 'leftColumn',
  rightcolumn: 'rightColumn',
  correctmapping: 'correctMapping',
  assertion: 'assertion',
  reason: 'reason',
  explanation: 'explanation',
  difficulty: 'difficulty',
  subject: 'subject',
  topic: 'topic',
  tags: 'tags',
  status: 'status',
  prompt: 'prompt'
};

const mapRow = (row) => {
  const mapped = {};
  Object.entries(row).forEach(([key, value]) => {
    const alias = HEADER_ALIASES[normalizeHeader(key)];
    if (alias) mapped[alias] = value;
  });
  return mapped;
};

const readRowsFromFile = (file) => {
  const ext = file.originalname.split('.').pop().toLowerCase();
  let rows = [];

  if (ext === 'csv') {
    const text = file.buffer.toString('utf8');
    const workbook = XLSX.read(text, { type: 'string' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  } else if (['xlsx', 'xls'].includes(ext)) {
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  } else {
    const error = new Error('Only XLSX and CSV files are allowed');
    error.statusCode = 400;
    throw error;
  }

  return rows;
};

const rowToQuestionData = (mapped, rowIndex) => {
  const type = normalizeQuestionType(mapped.questionType);
  const data = {
    category: normalizeCategory(mapped.category),
    type,
    questionText: String(mapped.questionText || '').trim(),
    explanation: mapped.explanation ? String(mapped.explanation).trim() : '',
    difficulty: normalizeDifficulty(mapped.difficulty),
    subject: String(mapped.subject || '').trim(),
    topic: String(mapped.topic || '').trim(),
    tags: parseTags(mapped.tags),
    status: normalizeStatus(mapped.status) || 'ACTIVE'
  };

  if (type === 'MCQ') {
    data.optionA = String(mapped.optionA || '').trim();
    data.optionB = String(mapped.optionB || '').trim();
    data.optionC = String(mapped.optionC || '').trim();
    data.optionD = String(mapped.optionD || '').trim();
    data.correctAnswer = normalizeMcqAnswer(mapped.correctAnswer);
  }

  if (type === 'NUMERICAL') {
    data.numericalAnswer = normalizeNumericalAnswer(mapped.numericalAnswer);
  }

  if (type === 'MATCH_THE_FOLLOWING') {
    const prompt = String(mapped.prompt || mapped.questionText || '').trim();
    const pairResult = parseMatchPairsFromColumns(
      mapped.leftColumn,
      mapped.rightColumn,
      mapped.correctMapping
    );
    if (pairResult.error) {
      return { error: pairResult.error };
    }
    data.matchData = { prompt, pairs: pairResult.pairs };
  }

  if (type === 'ASSERTION_REASON') {
    data.assertion = String(mapped.assertion || '').trim();
    data.reason = String(mapped.reason || '').trim();
    data.assertionAnswer = normalizeAssertionAnswer(mapped.correctAnswer);
  }

  return data;
};

const parseBulkFile = (file) => {
  const rows = readRowsFromFile(file);
  if (!rows.length) {
    const error = new Error('Uploaded file has no question rows');
    error.statusCode = 400;
    throw error;
  }

  const parsed = [];
  const errors = [];

  rows.forEach((row, index) => {
    const mapped = mapRow(row);
    const line = index + 2;
    const data = rowToQuestionData(mapped, index);

    if (data?.error) {
      errors.push({ row: line, field: 'matchData', message: data.error });
      return;
    }

    const rowErrors = [];
    validateTypeSpecificFields(data, rowErrors, line);
    if (rowErrors.length) {
      errors.push(...rowErrors);
    } else {
      parsed.push({ ...data, sourceRow: line });
    }
  });

  return { rows: parsed, errors, totalRows: rows.length };
};

const buildTemplate = (templateKey) => {
  const type = BULK_TEMPLATE_TYPES[templateKey];
  if (!type) {
    const error = new Error('Invalid template type');
    error.statusCode = 400;
    throw error;
  }

  const headers = TEMPLATE_HEADERS[type];
  const sampleByType = {
    MCQ: {
      category: 'PRELIMS',
      questionType: 'MCQ',
      questionText: 'What is the capital of India?',
      optionA: 'Mumbai',
      optionB: 'New Delhi',
      optionC: 'Kolkata',
      optionD: 'Chennai',
      correctAnswer: 'B',
      explanation: 'New Delhi is the capital of India',
      difficulty: 'Easy',
      subject: 'Polity',
      topic: 'Basics',
      tags: 'india,capital',
      status: 'Active'
    },
    NUMERICAL: {
      category: 'PRELIMS',
      questionType: 'Numerical',
      questionText: 'How many Fundamental Duties are in the Indian Constitution?',
      numericalAnswer: '11',
      explanation: 'Originally 10, added one more by 86th Amendment',
      difficulty: 'Medium',
      subject: 'Polity',
      topic: 'Fundamental Duties',
      tags: 'constitution',
      status: 'Active'
    },
    MATCH_THE_FOLLOWING: {
      category: 'PRELIMS',
      questionType: 'Match the Following',
      questionText: 'Match the rivers with states',
      prompt: 'Match the rivers with states',
      leftColumn: 'Kosi,Narmada,Godavari,Yamuna',
      rightColumn: 'Bihar,Madhya Pradesh,Andhra Pradesh,Uttar Pradesh',
      correctMapping: 'A-1,B-2,C-3,D-4',
      explanation: 'Pair rivers with correct states',
      difficulty: 'Medium',
      subject: 'Geography',
      topic: 'Rivers',
      tags: 'geography,rivers',
      status: 'Active'
    },
    ASSERTION_REASON: {
      category: 'PRELIMS',
      questionType: 'Assertion Reason',
      questionText: 'Consider the following statements',
      assertion: 'The Preamble is part of the Constitution',
      reason: 'It was held in Kesavananda Bharati case',
      correctAnswer: 'Both true & R explains A',
      explanation: 'Both are true and reason explains assertion',
      difficulty: 'Medium',
      subject: 'Polity',
      topic: 'Preamble',
      tags: 'constitution',
      status: 'Active'
    },
    DESCRIPTIVE: {
      category: 'MAINS',
      questionType: 'Descriptive',
      questionText: 'Discuss the doctrine of basic structure',
      explanation: 'Cover checks on amending power',
      difficulty: 'Hard',
      subject: 'Polity',
      topic: 'Constitution',
      tags: 'constitution,basic-structure',
      status: 'Active'
    }
  };

  const worksheet = XLSX.utils.json_to_sheet([sampleByType[type]], { header: headers });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Questions');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
};

module.exports = {
  TEMPLATE_HEADERS,
  parseBulkFile,
  buildTemplate,
  readRowsFromFile
};
