const multer = require('multer');
const {
  RECORDING_MAX_BYTES,
  RECORDING_ALLOWED_MIMES
} = require('../utils/facultyContentConstants');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.fieldname !== 'recording') {
    return cb(new Error('Only the recording field is allowed for video upload'), false);
  }
  if (RECORDING_ALLOWED_MIMES.includes(file.mimetype)) {
    return cb(null, true);
  }
  return cb(
    new Error('Invalid file type. Allowed: MP4, MOV, MKV, AVI. Max size: 100 MB.'),
    false
  );
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: RECORDING_MAX_BYTES,
    files: 1
  }
});

const subjectRecordingUpload = (req, res, next) => {
  upload.single('recording')(req, res, (err) => {
    if (err) {
      const message =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'Recording file too large. Max size is 100 MB.'
          : err.message;
      return res.status(400).json({ success: false, message });
    }
    next();
  });
};

module.exports = subjectRecordingUpload;
