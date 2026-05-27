const multer = require('multer');

const storage = multer.memoryStorage();

/** Global allow-list; per-field stricter checks run in courseCmsValidation */
const allowedMimes = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/svg+xml',
  'video/mp4',
  'video/webm'
];

const fileFilter = (req, file, cb) => {
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        'Invalid file type. Allowed images: JPEG, PNG, WEBP, SVG (icons only). Videos: MP4, WebM.'
      ),
      false
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024,
    files: 50
  }
}).any();

/** Accept dynamic field names: keyFeatureImage_0, featureCardIcon_1, helpSectionVideo_0, etc. */
const courseUpload = (req, res, next) => {
  upload(req, res, (err) => {
    if (err) {
      const message =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'File too large. Max video 50 MB; key/help images 5 MB; feature icons 1 MB.'
          : err.message;
      return res.status(400).json({ success: false, message });
    }
    next();
  });
};

module.exports = courseUpload;
