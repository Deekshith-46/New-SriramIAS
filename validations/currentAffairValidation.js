const Joi = require('joi');
const {
  CATEGORY_LIST,
  PDF_REQUIRED_CATEGORIES,
  YEAR_MONTH_REQUIRED_CATEGORIES,
  MONTHS,
  YEAR_OPTIONS,
  CATEGORIES
} = require('../utils/currentAffairConstants');
const { normalizeMainsCategory } = require('../utils/currentAffairEnums');

const yearField = Joi.number()
  .integer()
  .valid(...YEAR_OPTIONS)
  .messages({
    'number.base': 'Year must be a valid number',
    'any.only': `Year must be one of: ${YEAR_OPTIONS.join(', ')}`
  });

const monthField = Joi.string()
  .valid(...MONTHS)
  .messages({
    'any.only': `Month must be one of: ${MONTHS.join(', ')}`
  });

const categoryField = Joi.string()
  .valid(...CATEGORY_LIST)
  .messages({
    'any.only': `Category must be one of: ${CATEGORY_LIST.join(', ')}`
  });

const currentAffairsCreateSchema = Joi.object({
  category: Joi.valid(CATEGORIES.CURRENT_AFFAIRS).required(),
  title: Joi.string().trim().max(300).required().messages({
    'any.required': 'title is required',
    'string.empty': 'title is required'
  }),
  status: Joi.boolean().optional()
});

const pdfCategoryCreateSchema = Joi.object({
  category: categoryField
    .valid(
      CATEGORIES.MONTHLY_MAGAZINE,
      CATEGORIES.INFOGRAPHICS,
      CATEGORIES.MONTHLY_RECAP
    )
    .required(),
  title: Joi.string().trim().max(300).required().messages({
    'any.required': 'title is required',
    'string.empty': 'title is required'
  }),
  year: yearField.required().messages({
    'any.required': 'year is required for this category'
  }),
  month: monthField.required().messages({
    'any.required': 'month is required for this category'
  }),
  description: Joi.string().trim().max(5000).allow('', null).optional(),
  status: Joi.boolean().optional()
});

/** Partial update — only validate fields that are sent */
const updateCurrentAffairSchema = Joi.object({
  category: categoryField.optional(),
  title: Joi.string().trim().max(300).optional(),
  year: yearField.optional(),
  month: monthField.optional(),
  description: Joi.string().trim().max(5000).allow('', null).optional(),
  status: Joi.boolean().optional(),
  mainsCategory: Joi.string().trim().optional(),
  paperName: Joi.string().trim().max(300).optional(),
  date: Joi.string().trim().optional(),
  sectionFrom: Joi.number().integer().min(1).optional(),
  sectionTo: Joi.number().integer().min(1).optional()
}).custom((value, helpers) => {
  if (value.title === '') {
    return helpers.error('any.custom', { message: 'title cannot be empty' });
  }
  if (value.paperName === '') {
    return helpers.error('any.custom', { message: 'paperName cannot be empty' });
  }
  if (value.mainsCategory !== undefined) {
    const normalized = normalizeMainsCategory(value.mainsCategory);
    if (!normalized) {
      return helpers.error('any.custom', {
        message: 'mainsCategory must be PRELIMS or MAINS'
      });
    }
    value.mainsCategory = normalized;
  }
  if (
    value.sectionFrom !== undefined &&
    value.sectionTo !== undefined &&
    Number(value.sectionFrom) > Number(value.sectionTo)
  ) {
    return helpers.error('any.custom', {
      message: 'sectionTo must be greater than or equal to sectionFrom'
    });
  }
  return value;
});

const updateStatusSchema = Joi.object({
  status: Joi.boolean().required().messages({
    'any.required': 'status is required',
    'boolean.base': 'status must be a boolean value'
  })
});

const parseFormDataBody = (body) => {
  const parsed = { ...body };

  if (parsed.category) {
    parsed.category = String(parsed.category).trim();
  }

  if (parsed.magazineName && !parsed.title && !parsed.paperName) {
    parsed.title = parsed.magazineName;
  }
  delete parsed.magazineName;

  if (parsed.year !== undefined && parsed.year !== '') {
    const n = Number(parsed.year);
    if (!Number.isNaN(n)) parsed.year = n;
    else delete parsed.year;
  } else {
    delete parsed.year;
  }

  if (!parsed.month) {
    delete parsed.month;
  }

  if (parsed.sectionFrom !== undefined && parsed.sectionFrom !== '') {
    parsed.sectionFrom = Number(parsed.sectionFrom);
  } else {
    delete parsed.sectionFrom;
  }

  if (parsed.sectionTo !== undefined && parsed.sectionTo !== '') {
    parsed.sectionTo = Number(parsed.sectionTo);
  } else {
    delete parsed.sectionTo;
  }

  if (parsed.status !== undefined && parsed.status !== '') {
    parsed.status = parsed.status === 'true' || parsed.status === true;
  } else {
    delete parsed.status;
  }

  if (parsed.description === '') {
    parsed.description = null;
  }

  return parsed;
};

const formatJoiErrors = (error) =>
  error.details.map((detail) => ({
    field: detail.path.join('.') || 'body',
    message: detail.message.replace(/"/g, '')
  }));

const validateCreate = (req, res, next) => {
  const body = parseFormDataBody(req.body);

  if (body.category === CATEGORIES.DAILY_PRACTICE_QUESTIONS) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: [
        {
          field: 'category',
          message:
            'Use POST /api/current-affairs/daily-practice for Daily Practice Questions'
        }
      ]
    });
  }

  let schema;
  if (body.category === CATEGORIES.CURRENT_AFFAIRS) {
    delete body.year;
    delete body.month;
    delete body.description;
    schema = currentAffairsCreateSchema;
  } else if (YEAR_MONTH_REQUIRED_CATEGORIES.includes(body.category)) {
    schema = pdfCategoryCreateSchema;
  } else {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: [{ field: 'category', message: 'Invalid category' }]
    });
  }

  const { error, value } = schema.validate(body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formatJoiErrors(error)
    });
  }

  if (PDF_REQUIRED_CATEGORIES.includes(value.category) && !req.file) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: [{ field: 'pdf', message: 'PDF file is required for this category' }]
    });
  }

  req.body = value;
  next();
};

const validateUpdate = (req, res, next) => {
  const body = parseFormDataBody(req.body);

  if (!req.file && Object.keys(body).length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: [
        {
          field: 'body',
          message: 'Send at least one field to update or attach a new pdf file'
        }
      ]
    });
  }

  const { error, value } = updateCurrentAffairSchema.validate(body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formatJoiErrors(error)
    });
  }

  req.body = value;
  next();
};

const validateStatusUpdate = (req, res, next) => {
  const { error, value } = updateStatusSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formatJoiErrors(error)
    });
  }

  req.body = value;
  next();
};

module.exports = {
  validateCreate,
  validateUpdate,
  validateStatusUpdate
};
