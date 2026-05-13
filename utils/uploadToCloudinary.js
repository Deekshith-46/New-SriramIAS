const cloudinary = require('../config/cloudinary');

const uploadToCloudinary = async (file, folder = 'courses', resourceType = 'auto', format = null) => {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder: folder,
      resource_type: resourceType // 'auto' for images/videos, 'raw' for PDFs
    };

    // Add format if specified (e.g., 'pdf' for brochures)
    if (format) {
      uploadOptions.format = format;
    }

    cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve({
            url: result.secure_url,
            public_id: result.public_id,
            format: result.format
          });
        }
      }
    ).end(file.buffer);
  });
};

module.exports = uploadToCloudinary;
