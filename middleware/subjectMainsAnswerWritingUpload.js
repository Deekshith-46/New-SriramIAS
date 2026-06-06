const multer = require('multer');
const {
  MAINS_ANSWER_PDF_MAX_BYTES,
  MAINS_ANSWER_PDF_ALLOWED_MIMES
} = require('../utils/facultyContentConstants');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.fieldname !== 'pdf') {
    return cb(new Error('Only the pdf field is allowed for PDF upload'), false);
  }
  if (MAINS_ANSWER_PDF_ALLOWED_MIMES.includes(file.mimetype)) {
    return cb(null, true);
  }
  return cb(new Error('Invalid file type. PDF files only. Max size: 20 MB.'), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAINS_ANSWER_PDF_MAX_BYTES,
    files: 1
  }
});

const subjectMainsAnswerWritingUpload = (req, res, next) => {
  upload.single('pdf')(req, res, (err) => {
    if (err) {
      const message =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'PDF file too large. Max size is 20 MB.'
          : err.message;
      return res.status(400).json({ success: false, message });
    }
    next();
  });
};

module.exports = subjectMainsAnswerWritingUpload;
