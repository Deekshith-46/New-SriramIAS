const Joi = require('joi');
const {
  CATEGORY_LIST,
  PDF_REQUIRED_CATEGORIES,
  MONTHS,
  CATEGORIES
} = require('../utils/currentAffairConstants');

const yearField = Joi.number().integer().min(2000).max(2100).messages({
  'number.base': 'Year must be a valid number',
  'number.min': 'Year must be 2000 or later',
  'number.max': 'Year must be 2100 or earlier'
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

const baseBodySchema = Joi.object({
  category: categoryField.required(),
  title: Joi.string().trim().max(300),
  magazineName: Joi.string().trim().max(300),
  year: yearField.required(),
  month: monthField.required(),
  description: Joi.string().trim().max(5000).allow('', null),
  status: Joi.boolean()
});

const createCurrentAffairSchema = baseBodySchema.custom((value, helpers) => {
  const { category } = value;

  if (category === CATEGORIES.MONTHLY_MAGAZINE) {
    if (!value.magazineName) {
      return helpers.error('any.custom', {
        message: 'magazineName is required for Monthly Magazine'
      });
    }
  } else if (!value.title) {
    return helpers.error('any.custom', {
      message: 'title is required for this category'
    });
  }

  if (
    (category === CATEGORIES.CURRENT_AFFAIRS ||
      category === CATEGORIES.DAILY_PRACTICE_QUESTIONS) &&
    !value.description
  ) {
    return helpers.error('any.custom', {
      message: 'description is required for this category'
    });
  }

  return value;
});

const updateCurrentAffairSchema = Joi.object({
  category: categoryField,
  title: Joi.string().trim().max(300).allow('', null),
  magazineName: Joi.string().trim().max(300).allow('', null),
  year: yearField,
  month: monthField,
  description: Joi.string().trim().max(5000).allow('', null),
  status: Joi.boolean()
})
  .min(1)
  .custom((value, helpers) => {
    if (value.category === CATEGORIES.MONTHLY_MAGAZINE && value.magazineName === '') {
      return helpers.error('any.custom', {
        message: 'magazineName cannot be empty for Monthly Magazine'
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

  if (parsed.year !== undefined && parsed.year !== '') {
    parsed.year = Number(parsed.year);
  }

  if (parsed.status !== undefined && parsed.status !== '') {
    parsed.status = parsed.status === 'true' || parsed.status === true;
  }

  return parsed;
};

const validateCreate = (req, res, next) => {
  const body = parseFormDataBody(req.body);
  const { error, value } = createCurrentAffairSchema.validate(body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errors = error.details.map((detail) => ({
      field: detail.path.join('.') || 'body',
      message: detail.message.replace(/"/g, '')
    }));

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
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
  const { error, value } = updateCurrentAffairSchema.validate(body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errors = error.details.map((detail) => ({
      field: detail.path.join('.') || 'body',
      message: detail.message.replace(/"/g, '')
    }));

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
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
    const errors = error.details.map((detail) => ({
      field: detail.path.join('.') || 'body',
      message: detail.message.replace(/"/g, '')
    }));

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
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
