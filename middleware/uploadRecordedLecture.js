const multer = require('multer');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif',
    'image/gif',
    'video/mp4',
    'application/pdf'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, MP4 videos, and PDFs are allowed.'), false);
  }
};

const uploadRecordedLecture = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 200 * 1024 * 1024
  }
});

module.exports = uploadRecordedLecture;
