const XLSX = require('xlsx');
const {
  BULK_TEMPLATE_HEADERS,
  CORRECT_ANSWER_OPTIONS
} = require('./dailyPracticeConstants');

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
  correctanswer: 'correctAnswer',
  answer: 'correctAnswer',
  explanation: 'explanation'
};

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
  if (!Number.isNaN(index) && index >= 0 && index <= 3) {
    return CORRECT_ANSWER_OPTIONS[index];
  }

  return null;
};

const validateQuestionRow = (row, rowIndex) => {
  const errors = [];
  const line = rowIndex + 2;

  if (!row.questionNumber && row.questionNumber !== 0) {
    errors.push({ row: line, field: 'questionNumber', message: 'questionNumber is required' });
  }

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
      message: 'correctAnswer must be A, B, C, or D'
    });
  }

  if (errors.length) {
    return { errors };
  }

  return {
    data: {
      questionNumber: Number(row.questionNumber),
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

const parseBulkQuestionFile = (file) => {
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

  return questions;
};

const buildCsvTemplate = () => {
  const sampleRows = [
    {
      questionNumber: 1,
      question: 'What is the capital of India?',
      optionA: 'Mumbai',
      optionB: 'New Delhi',
      optionC: 'Kolkata',
      optionD: 'Chennai',
      correctAnswer: 'B',
      explanation: 'New Delhi is the capital of India'
    },
    {
      questionNumber: 2,
      question: 'Which river is the longest in India?',
      optionA: 'Yamuna',
      optionB: 'Godavari',
      optionC: 'Ganga',
      optionD: 'Narmada',
      correctAnswer: 'C',
      explanation: 'Ganga is the longest river in India'
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
  buildCsvTemplate,
  normalizeCorrectAnswer
};
