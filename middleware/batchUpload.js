const multer = require('multer');

const storage = multer.memoryStorage();

const BANNER_MAX_BYTES = 5 * 1024 * 1024;
const BROCHURE_MAX_BYTES = 10 * 1024 * 1024;

const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'bannerImage') {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      return cb(null, true);
    }
    return cb(new Error('Invalid banner image. Allowed: JPEG, PNG, WEBP.'), false);
  }

  if (file.fieldname === 'brochure') {
    if (file.mimetype === 'application/pdf') {
      return cb(null, true);
    }
    return cb(new Error('Invalid brochure. Only PDF files are allowed.'), false);
  }

  return cb(new Error(`Unexpected upload field: ${file.fieldname}`), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: BROCHURE_MAX_BYTES, files: 2 }
}).fields([
  { name: 'bannerImage', maxCount: 1 },
  { name: 'brochure', maxCount: 1 }
]);

const batchUpload = (req, res, next) => {
  upload(req, res, (err) => {
    if (err) {
      const message =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'File too large. Banner max 5 MB, brochure max 10 MB.'
          : err.message;
      return res.status(400).json({ success: false, message });
    }

    const banner = req.files?.bannerImage?.[0];
    if (banner && banner.size > BANNER_MAX_BYTES) {
      return res.status(400).json({
        success: false,
        message: 'Banner image too large. Max 5 MB.'
      });
    }

    next();
  });
};

module.exports = batchUpload;
