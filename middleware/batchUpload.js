const multer = require('multer');

const storage = multer.memoryStorage();

const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];

const fileFilter = (req, file, cb) => {
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid banner image. Allowed: JPEG, PNG, WEBP.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 }
}).single('bannerImage');

const batchUpload = (req, res, next) => {
  upload(req, res, (err) => {
    if (err) {
      const message =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'Banner image too large. Max 5 MB.'
          : err.message;
      return res.status(400).json({ success: false, message });
    }
    next();
  });
};

module.exports = batchUpload;
