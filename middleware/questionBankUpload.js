const multer = require('multer');

const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const BULK_MAX_BYTES = 5 * 1024 * 1024;

const memoryStorage = multer.memoryStorage();

const imageFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
    return;
  }
  cb(new Error('Only JPG, PNG, and WEBP images are allowed'), false);
};

const bulkFilter = (req, file, cb) => {
  const allowed = [
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];
  const ext = file.originalname.split('.').pop().toLowerCase();
  if (allowed.includes(file.mimetype) || ['csv', 'xlsx', 'xls'].includes(ext)) {
    cb(null, true);
    return;
  }
  cb(new Error('Only XLSX and CSV files are allowed'), false);
};

const questionImageUpload = multer({
  storage: memoryStorage,
  fileFilter: imageFilter,
  limits: { fileSize: IMAGE_MAX_BYTES }
}).single('image');

const bulkFileUpload = multer({
  storage: memoryStorage,
  fileFilter: bulkFilter,
  limits: { fileSize: BULK_MAX_BYTES }
}).single('file');

const handleQuestionImageUpload = (req, res, next) => {
  if (!req.is('multipart/form-data')) return next();

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

const handleBulkFileUpload = (req, res, next) => {
  bulkFileUpload(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: [{ field: 'file', message: 'File size must not exceed 5 MB' }]
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
  handleQuestionImageUpload,
  handleBulkFileUpload
};
