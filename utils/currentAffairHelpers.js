const cloudinary = require('../config/cloudinary');
const uploadToCloudinary = require('./uploadToCloudinary');
const { CLOUDINARY_FOLDER } = require('./currentAffairConstants');

const uploadPdfToCloudinary = async (file) => {
  const uploaded = await uploadToCloudinary(
    file,
    CLOUDINARY_FOLDER,
    'image',
    'pdf'
  );

  const imageUrl = cloudinary.url(uploaded.public_id, {
    secure: true,
    format: 'jpg',
    page: 1
  });

  return {
    pdfUrl: uploaded.url,
    pdfPublicId: uploaded.public_id,
    imageUrl
  };
};

const deleteCloudinaryPdf = async (publicId) => {
  if (!publicId) return;

  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
  } catch (error) {
    console.error('Cloudinary delete error:', error.message);
  }
};

const getCreatedById = (req) => {
  if (req.user?._id) return req.user._id;
  if (req.adminAccess?._id) return req.adminAccess._id;
  return null;
};

const formatCurrentAffairResponse = (doc) => {
  if (!doc) return null;

  const item = doc.toObject ? doc.toObject() : { ...doc };
  const { pdfPublicId, ...rest } = item;

  return {
    ...rest,
    pdfUrl: rest.pdfUrl || null,
    imageUrl: rest.imageUrl || null
  };
};

module.exports = {
  uploadPdfToCloudinary,
  deleteCloudinaryPdf,
  getCreatedById,
  formatCurrentAffairResponse
};
