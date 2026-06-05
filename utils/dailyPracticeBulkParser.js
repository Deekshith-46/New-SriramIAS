const XLSX = require('xlsx');
const {
  BULK_TEMPLATE_HEADERS,
  CORRECT_ANSWER_OPTIONS
} = require('./currentAffairEnums');

const normalizeHeader = (value) =>
  String(value || '')
    .trim()
    .replace(/\s+/g, '')
    .toLowerCase();

const HEADER_ALIASES = {
  questionnumber: 'questionNumber',
  questionno: 'questionNumber',
  qno: 'questionNumber',
  question: 'question',
  optiona: 'optionA',
  optionb: 'optionB',
  optionc: 'optionC',
  optiond: 'optionD',
  option1: 'optionA',
  option2: 'optionB',
  option3: 'optionC',
  option4: 'optionD',
  correctanswer: 'correctAnswer',
  answer: 'correctAnswer',
  explanation: 'explanation'
};

const REQUIRED_FIELDS = [
  'questionNumber',
  'question',
  'optionA',
  'optionB',
  'optionC',
  'optionD',
  'correctAnswer'
];

const mapRow = (row) => {
  const mapped = {};

  Object.entries(row).forEach(([key, value]) => {
    const alias = HEADER_ALIASES[normalizeHeader(key)];
    if (alias) {
      mapped[alias] = value;
    }
  });

  return mapped;
};

const normalizeCorrectAnswer = (value) => {
  const raw = String(value || '').trim().toUpperCase();

  if (CORRECT_ANSWER_OPTIONS.includes(raw)) {
    return raw;
  }

  if (raw === 'OPTION A' || raw === 'A') return 'A';
  if (raw === 'OPTION B' || raw === 'B') return 'B';
  if (raw === 'OPTION C' || raw === 'C') return 'C';
  if (raw === 'OPTION D' || raw === 'D') return 'D';

  const index = Number(raw);
  if (!Number.isNaN(index)) {
    if (index >= 1 && index <= 4) return CORRECT_ANSWER_OPTIONS[index - 1];
    if (index >= 0 && index <= 3) return CORRECT_ANSWER_OPTIONS[index];
  }

  return null;
};

const validateQuestionRow = (row, rowIndex) => {
  const errors = [];
  const line = rowIndex + 2;

  if (!row.question) {
    errors.push({ row: line, field: 'question', message: 'question is required' });
  }

  ['optionA', 'optionB', 'optionC', 'optionD'].forEach((field) => {
    if (!row[field]) {
      errors.push({ row: line, field, message: `${field} is required` });
    }
  });

  const correctAnswer = normalizeCorrectAnswer(row.correctAnswer);
  if (!correctAnswer) {
    errors.push({
      row: line,
      field: 'correctAnswer',
      message: 'correctAnswer must be A, B, C, D, or 1–4'
    });
  }

  if (errors.length) {
    return { errors };
  }

  return {
    data: {
      questionNumber:
        row.questionNumber !== undefined && row.questionNumber !== ''
          ? Number(row.questionNumber)
          : rowIndex + 1,
      question: String(row.question).trim(),
      optionA: String(row.optionA).trim(),
      optionB: String(row.optionB).trim(),
      optionC: String(row.optionC).trim(),
      optionD: String(row.optionD).trim(),
      correctAnswer,
      explanation: row.explanation ? String(row.explanation).trim() : ''
    }
  };
};

const assertRequiredColumns = (rows) => {
  if (!rows.length) return;

  const presentFields = new Set();
  rows.forEach((row) => {
    Object.keys(row).forEach((key) => {
      const alias = HEADER_ALIASES[normalizeHeader(key)];
      if (alias) presentFields.add(alias);
    });
  });

  const missing = REQUIRED_FIELDS.filter((field) => !presentFields.has(field));
  if (missing.length) {
    const error = new Error(
      `Missing required columns: ${missing.join(', ')}. Expected: ${BULK_TEMPLATE_HEADERS.join(', ')}`
    );
    error.statusCode = 400;
    throw error;
  }
};

/** Renumber questions sequentially by row order (fixes gaps, duplicates, wrong numbers). */
const normalizeQuestionNumberSeries = (questions, startFrom = 1) =>
  questions.map((q, index) => ({
    ...q,
    questionNumber: startFrom + index
  }));

const parseBulkQuestionFile = (file, { startFrom = 1 } = {}) => {
  const ext = file.originalname.split('.').pop().toLowerCase();
  let rows = [];

  if (ext === 'csv') {
    const text = file.buffer.toString('utf8');
    const workbook = XLSX.read(text, { type: 'string' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  } else if (ext === 'xlsx' || ext === 'xls') {
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  } else {
    const error = new Error('Only XLSX and CSV files are allowed');
    error.statusCode = 400;
    throw error;
  }

  if (!rows.length) {
    const error = new Error('Uploaded file has no question rows');
    error.statusCode = 400;
    throw error;
  }

  assertRequiredColumns(rows);

  const questions = [];
  const errors = [];

  rows.forEach((row, index) => {
    const mapped = mapRow(row);
    const result = validateQuestionRow(mapped, index);

    if (result.errors) {
      errors.push(...result.errors);
    } else {
      questions.push(result.data);
    }
  });

  if (errors.length) {
    const error = new Error('Bulk upload validation failed');
    error.statusCode = 400;
    error.errors = errors;
    throw error;
  }

  return normalizeQuestionNumberSeries(questions, startFrom);
};

const buildCsvTemplate = () => {
  const sampleRows = [
    {
      'Question No': 1,
      Question: 'Sample question',
      'Option 1': 'Option A',
      'Option 2': 'Option B',
      'Option 3': 'Option C',
      'Option 4': 'Option D',
      'Correct Answer': 1,
      Explanation: 'Optional explanation'
    },
    {
      'Question No': 2,
      Question: 'Second sample question',
      'Option 1': 'Yes',
      'Option 2': 'No',
      'Option 3': 'Maybe',
      'Option 4': 'N/A',
      'Correct Answer': 2,
      Explanation: ''
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleRows, {
    header: [...BULK_TEMPLATE_HEADERS]
  });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Questions');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
};

module.exports = {
  parseBulkQuestionFile,
  normalizeQuestionNumberSeries,
  buildCsvTemplate,
  normalizeCorrectAnswer
};
