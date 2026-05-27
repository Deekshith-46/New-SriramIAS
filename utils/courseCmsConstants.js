/** CMS section limits — enforced on create/update */
const MAX_KEY_FEATURES = 10;
const MAX_FEATURE_CARDS = 20;
const MAX_HELP_SECTIONS = 10;

/** File size limits (bytes) */
const SIZE_KEY_FEATURE_IMAGE = 5 * 1024 * 1024; // 5 MB
const SIZE_FEATURE_CARD_ICON = 1 * 1024 * 1024; // 1 MB
const SIZE_HELP_IMAGE = 5 * 1024 * 1024; // 5 MB
const SIZE_HELP_VIDEO = 50 * 1024 * 1024; // 50 MB

const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_ICON_MIMES = [...ALLOWED_IMAGE_MIMES, 'image/svg+xml'];
const ALLOWED_VIDEO_MIMES = ['video/mp4', 'video/webm'];

module.exports = {
  MAX_KEY_FEATURES,
  MAX_FEATURE_CARDS,
  MAX_HELP_SECTIONS,
  SIZE_KEY_FEATURE_IMAGE,
  SIZE_FEATURE_CARD_ICON,
  SIZE_HELP_IMAGE,
  SIZE_HELP_VIDEO,
  ALLOWED_IMAGE_MIMES,
  ALLOWED_ICON_MIMES,
  ALLOWED_VIDEO_MIMES
};
