const multer = require('multer');
const { MAX_PDF_SIZE_BYTES } = require('../utils/currentAffairConstants');

const storage = multer.memoryStorage();

const pdfFileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
    return;
  }
  cb(new Error('Only PDF files are allowed'), false);
};

const uploadCurrentAffairPdf = multer({
  storage,
  fileFilter: pdfFileFilter,
  limits: {
    fileSize: MAX_PDF_SIZE_BYTES
  }
}).single('pdf');

const handleCurrentAffairUpload = (req, res, next) => {
  uploadCurrentAffairPdf(req, res, (err) => {
    if (!err) {
      return next();
    }

    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: [{ field: 'pdf', message: 'PDF file size must not exceed 10 MB' }]
        });
      }

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: [{ field: 'pdf', message: err.message }]
      });
    }

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: [{ field: 'pdf', message: err.message }]
    });
  });
};

module.exports = {
  handleCurrentAffairUpload
};
