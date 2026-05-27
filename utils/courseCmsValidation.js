const { safeParseJson } = require('./coursePayloadHelpers');
const {
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
} = require('./courseCmsConstants');

const normalizeFilesList = (req) => {
  if (!req.files) return [];
  if (Array.isArray(req.files)) return req.files;
  return Object.values(req.files).flat();
};

const parseMetaArray = (body, key) => {
  if (body[key] === undefined || body[key] === '') return [];
  const parsed = safeParseJson(body[key], null);
  return Array.isArray(parsed) ? parsed : [];
};

const maxIndexedIndex = (files, prefix) => {
  const regex = new RegExp(`^${prefix}_(\\d+)$`);
  let max = -1;
  for (const file of files) {
    const match = file.fieldname.match(regex);
    if (match) max = Math.max(max, parseInt(match[1], 10));
  }
  return max;
};

const countRepeatedField = (files, fieldName) =>
  files.filter((f) => f.fieldname === fieldName).length;

const resolveIncomingCount = (metaLen, files, indexedPrefix, repeatedName) => {
  const indexedMax = maxIndexedIndex(files, indexedPrefix);
  const repeated = countRepeatedField(files, repeatedName);
  const fromFiles = Math.max(indexedMax + 1, repeated);
  return Math.max(metaLen, fromFiles);
};

/**
 * Estimate how many CMS rows the client is sending (JSON + files).
 */
const getIncomingCmsCounts = (req) => {
  const files = normalizeFilesList(req);
  const keyFeaturesMeta = parseMetaArray(req.body, 'keyFeatures');
  const featureCardsMeta = parseMetaArray(req.body, 'featureCards');
  const helpSectionsMeta = parseMetaArray(req.body, 'helpSections');

  const keyFeatures = resolveIncomingCount(
    keyFeaturesMeta.length,
    files,
    'keyFeatureImage',
    'keyFeatureImage'
  );
  const featureCards = resolveIncomingCount(
    featureCardsMeta.length,
    files,
    'featureCardIcon',
    'featureCardIcon'
  );
  const helpSections = resolveIncomingCount(
    helpSectionsMeta.length,
    files,
    'helpSectionVideo',
    'helpSectionVideo'
  );

  const helpFromImages = Math.max(
    maxIndexedIndex(files, 'helpSectionImage1') + 1,
    maxIndexedIndex(files, 'helpSectionImage2') + 1,
    countRepeatedField(files, 'helpSectionImage1'),
    countRepeatedField(files, 'helpSectionImage2')
  );

  return {
    keyFeatures,
    featureCards,
    helpSections: Math.max(helpSections, helpFromImages)
  };
};

const validateCmsLimits = (req) => {
  const counts = getIncomingCmsCounts(req);
  const errors = [];

  if (counts.keyFeatures > MAX_KEY_FEATURES) {
    errors.push(`Maximum ${MAX_KEY_FEATURES} key feature rows allowed`);
  }
  if (counts.featureCards > MAX_FEATURE_CARDS) {
    errors.push(`Maximum ${MAX_FEATURE_CARDS} feature cards allowed`);
  }
  if (counts.helpSections > MAX_HELP_SECTIONS) {
    errors.push(`Maximum ${MAX_HELP_SECTIONS} help sections allowed`);
  }

  if (errors.length) {
    return { ok: false, status: 400, message: errors.join('. ') };
  }
  return { ok: true };
};

const assertMime = (file, allowed, label) => {
  if (!allowed.includes(file.mimetype)) {
    return `${label}: invalid type "${file.mimetype}". Allowed: ${allowed.join(', ')}`;
  }
  return null;
};

const assertSize = (file, maxBytes, label) => {
  if (file.size > maxBytes) {
    const maxMb = (maxBytes / (1024 * 1024)).toFixed(0);
    return `${label}: file exceeds ${maxMb} MB limit`;
  }
  return null;
};

/**
 * Validate every uploaded CMS file (mimetype + size) after multer.
 */
const validateCourseUploadFiles = (req) => {
  const files = normalizeFilesList(req);
  const errors = [];

  for (const file of files) {
    const { fieldname } = file;

    if (/^keyFeatureImage(_\d+)?$/.test(fieldname)) {
      errors.push(
        assertMime(file, ALLOWED_IMAGE_MIMES, fieldname),
        assertSize(file, SIZE_KEY_FEATURE_IMAGE, fieldname)
      );
    } else if (/^featureCardIcon(_\d+)?$/.test(fieldname)) {
      errors.push(
        assertMime(file, ALLOWED_ICON_MIMES, fieldname),
        assertSize(file, SIZE_FEATURE_CARD_ICON, fieldname)
      );
    } else if (/^helpSectionImage1(_\d+)?$/.test(fieldname) || /^helpSectionImage2(_\d+)?$/.test(fieldname)) {
      errors.push(
        assertMime(file, ALLOWED_IMAGE_MIMES, fieldname),
        assertSize(file, SIZE_HELP_IMAGE, fieldname)
      );
    } else if (/^helpSectionVideo(_\d+)?$/.test(fieldname)) {
      errors.push(
        assertMime(file, ALLOWED_VIDEO_MIMES, fieldname),
        assertSize(file, SIZE_HELP_VIDEO, fieldname)
      );
    } else {
      errors.push(`Unexpected upload field "${fieldname}"`);
    }
  }

  const messages = errors.filter(Boolean);
  if (messages.length) {
    return { ok: false, status: 400, message: messages.join('. ') };
  }
  return { ok: true };
};

const resolveDisplayOrder = (row, index) => {
  const n = Number(row?.displayOrder);
  if (Number.isFinite(n) && n > 0) return n;
  return index + 1;
};

/** displayOrder only from featureCards[i].displayOrder in JSON — never separate form keys */
const resolveFeatureCardDisplayOrder = (row, prevCard, index) => {
  if (row?.displayOrder !== undefined && row?.displayOrder !== null && row?.displayOrder !== '') {
    const n = Number(row.displayOrder);
    if (Number.isFinite(n) && n > 0) return n;
  }
  if (prevCard?.displayOrder !== undefined && prevCard?.displayOrder !== null) {
    const n = Number(prevCard.displayOrder);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return index + 1;
};

/** Reject displayOrder sent outside the featureCards JSON array */
const validateFeatureCardFormFields = (req) => {
  const body = req.body || {};
  const badKeys = Object.keys(body).filter((key) =>
    /^featureCardDisplayOrder(_\d+)?$/.test(key)
  );
  if (badKeys.length) {
    return {
      ok: false,
      status: 400,
      message:
        'displayOrder must be inside the featureCards JSON array (e.g. [{"featureTitle":"...","displayOrder":1}]), not as separate form fields like featureCardDisplayOrder_0.'
    };
  }
  return { ok: true };
};

module.exports = {
  validateCmsLimits,
  validateCourseUploadFiles,
  validateFeatureCardFormFields,
  getIncomingCmsCounts,
  resolveDisplayOrder,
  resolveFeatureCardDisplayOrder,
  MAX_KEY_FEATURES,
  MAX_FEATURE_CARDS,
  MAX_HELP_SECTIONS
};
