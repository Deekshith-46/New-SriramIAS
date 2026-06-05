const multer = require('multer');
const {
  BULK_MAX_FILE_SIZE_BYTES,
  QUESTION_IMAGE_MAX_BYTES
} = require('../utils/dailyPracticeConstants');

const memoryStorage = multer.memoryStorage();

const bulkFileFilter = (req, file, cb) => {
  const allowed = [
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];
  const ext = file.originalname.split('.').pop().toLowerCase();

  if (
    allowed.includes(file.mimetype) ||
    ['csv', 'xlsx', 'xls'].includes(ext)
  ) {
    cb(null, true);
    return;
  }

  cb(new Error('Only XLSX and CSV files are allowed'), false);
};

const imageFileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
    return;
  }
  cb(new Error('Only JPG, PNG, and WEBP images are allowed'), false);
};

const bulkUpload = multer({
  storage: memoryStorage,
  fileFilter: bulkFileFilter,
  limits: { fileSize: BULK_MAX_FILE_SIZE_BYTES }
}).single('file');

const questionImageUpload = multer({
  storage: memoryStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: QUESTION_IMAGE_MAX_BYTES }
}).single('image');

const handleBulkUpload = (req, res, next) => {
  bulkUpload(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: [{ field: 'file', message: 'File size must not exceed 15 MB' }]
      });
    }

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: [{ field: 'file', message: err.message }]
    });
  });
};

const handleQuestionImageUpload = (req, res, next) => {
  questionImageUpload(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: [{ field: 'image', message: 'Image size must not exceed 5 MB' }]
      });
    }

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: [{ field: 'image', message: err.message }]
    });
  });
};

const handleDailyPracticeCreate = (req, res, next) => {
  if (!req.is('multipart/form-data')) {
    return next();
  }

  bulkUpload(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: [{ field: 'file', message: 'File size must not exceed 15 MB' }]
      });
    }

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: [{ field: 'file', message: err.message }]
    });
  });
};

module.exports = {
  handleBulkUpload,
  handleDailyPracticeCreate,
  handleQuestionImageUpload
};
