const QuestionBank = require('../models/QuestionBank');
const { normalizeTextKey } = require('./questionBankHelpers');

/**
 * Duplicate = same category + type + unique content.
 * Category is required so the same question text can exist in PRELIMS and MAINS separately.
 */
const getRowNumber = (row, fallbackIndex) => row.sourceRow || fallbackIndex + 2;

const getDuplicateContent = (row) => {
  if (row.type === 'ASSERTION_REASON') {
    return { field: 'assertion', value: row.assertion };
  }
  if (row.type === 'MATCH_THE_FOLLOWING') {
    const value = row.matchData?.prompt || row.prompt;
    return { field: 'prompt', value };
  }
  return { field: 'questionText', value: row.questionText };
};

const getDuplicateKey = (row) => {
  const type = row.type;
  const category = row.category;
  if (!type || !category) return null;

  if (type === 'ASSERTION_REASON') {
    return `${category}::${type}::${normalizeTextKey(row.assertion)}`;
  }
  if (type === 'MATCH_THE_FOLLOWING') {
    return `${category}::${type}::${normalizeTextKey(row.matchData?.prompt || row.prompt)}`;
  }
  return `${category}::${type}::${normalizeTextKey(row.questionText)}`;
};

const findDuplicateInBatch = (rows) => {
  const seen = new Map();
  const duplicates = [];

  rows.forEach((row, index) => {
    const key = getDuplicateKey(row);
    if (!key) return;
    const rowNumber = getRowNumber(row, index);
    if (seen.has(key)) {
      const content = getDuplicateContent(row);
      duplicates.push({
        row: rowNumber,
        reason: 'Duplicate within uploaded file (same category + type + content)',
        category: row.category,
        type: row.type,
        [content.field]: content.value,
        duplicateOfRow: seen.get(key)
      });
    } else {
      seen.set(key, rowNumber);
    }
  });

  return duplicates;
};

const findDuplicatesInDatabase = async (rows) => {
  const duplicates = [];

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const key = getDuplicateKey(row);
    if (!key) continue;

    let existing = null;

    if (row.type === 'ASSERTION_REASON') {
      existing = await QuestionBank.findOne({
        category: row.category,
        type: row.type,
        assertion: row.assertion
      })
        .select('questionCode category assertion')
        .lean();
    } else if (row.type === 'MATCH_THE_FOLLOWING') {
      existing = await QuestionBank.findOne({
        category: row.category,
        type: row.type,
        'matchData.prompt': row.matchData?.prompt || row.prompt
      })
        .select('questionCode category matchData')
        .lean();
    } else {
      existing = await QuestionBank.findOne({
        category: row.category,
        type: row.type,
        questionText: row.questionText
      })
        .select('questionCode category questionText')
        .lean();
    }

    if (existing) {
      const content = getDuplicateContent(row);
      duplicates.push({
        row: getRowNumber(row, index),
        reason: `Duplicate of existing ${existing.category} question in database`,
        category: row.category,
        type: row.type,
        [content.field]: content.value,
        existingQuestionCode: existing.questionCode,
        existingQuestionId: existing._id,
        existingQuestionText: existing.questionText || existing.assertion || existing.matchData?.prompt
      });
    }
  }

  return duplicates;
};

module.exports = {
  getDuplicateKey,
  findDuplicateInBatch,
  findDuplicatesInDatabase
};
