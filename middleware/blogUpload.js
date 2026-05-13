const multer = require('multer');

// Store in memory (for Cloudinary upload)
const storage = multer.memoryStorage();

// File filter for blog images only
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif',
    'image/gif'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, WebP, AVIF, and GIF images allowed.'), false);
  }
};

const blogUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit per image
    maxCount: 6 // 1 thumbnail + 5 article images
  }
});

module.exports = blogUpload;
