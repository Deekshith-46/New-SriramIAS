const uploadToCloudinary = require('./uploadToCloudinary');
const { safeParseJson } = require('./coursePayloadHelpers');
const { resolveDisplayOrder, resolveFeatureCardDisplayOrder } = require('./courseCmsValidation');
const {
  MAX_KEY_FEATURES,
  MAX_FEATURE_CARDS,
  MAX_HELP_SECTIONS
} = require('./courseCmsConstants');

const isVideoMime = (mimetype = '') => mimetype.startsWith('video/');

const normalizeFilesMap = (req) => {
  const map = {};
  if (!req.files) return map;

  if (Array.isArray(req.files)) {
    for (const file of req.files) {
      if (!map[file.fieldname]) map[file.fieldname] = [];
      map[file.fieldname].push(file);
    }
    return map;
  }

  return { ...req.files };
};

const collectIndexedFiles = (fileMap, prefix) => {
  const out = {};
  const regex = new RegExp(`^${prefix}_(\\d+)$`);
  for (const [field, files] of Object.entries(fileMap)) {
    const match = field.match(regex);
    if (match && files?.[0]) {
      out[parseInt(match[1], 10)] = files[0];
    }
  }
  return out;
};

const collectArrayFiles = (fileMap, fieldName) => {
  return fileMap[fieldName] || [];
};

const parseMetaArray = (body, ...keys) => {
  for (const key of keys) {
    if (body[key] === undefined || body[key] === '') continue;
    const parsed = safeParseJson(body[key], null);
    if (Array.isArray(parsed)) return parsed;
  }
  return [];
};

/**
 * Flat list of point strings for one key-feature row (UI: 5 text boxes → 5 strings).
 * NOT nested objects / sub-points.
 */
const parsePoints = (raw) => {
  if (raw === undefined || raw === null) return [];

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    const parsed = safeParseJson(trimmed, null);
    if (parsed !== null) return parsePoints(parsed);
    if (trimmed.includes('\n')) {
      return trimmed.split('\n').map((s) => s.trim()).filter(Boolean);
    }
    return [trimmed];
  }

  if (!Array.isArray(raw)) {
    if (typeof raw === 'object' && raw !== null) {
      if (Array.isArray(raw.points)) return parsePoints(raw.points);
      const text = raw.text ?? raw.point ?? raw.value ?? raw.label;
      return text ? [String(text).trim()] : [];
    }
    const s = String(raw).trim();
    return s && s !== '[object Object]' ? [s] : [];
  }

  const out = [];
  for (const item of raw) {
    if (item === null || item === undefined) continue;
    if (typeof item === 'string' || typeof item === 'number') {
      const s = String(item).trim();
      if (s) out.push(s);
      continue;
    }
    if (Array.isArray(item)) {
      out.push(...parsePoints(item));
      continue;
    }
    if (typeof item === 'object') {
      if (Array.isArray(item.points)) {
        out.push(...parsePoints(item.points));
        continue;
      }
      const text = item.text ?? item.point ?? item.value ?? item.label;
      if (text) {
        const s = String(text).trim();
        if (s) out.push(s);
      }
    }
  }
  return out;
};

/** Optional form-data: keyFeaturePoints_0 = ["a","b"] OR keyFeaturePoint_0_0 … keyFeaturePoint_0_4 */
const collectKeyFeaturePointsFromBody = (body, index) => {
  const bulkKey = `keyFeaturePoints_${index}`;
  if (body[bulkKey] !== undefined && body[bulkKey] !== '') {
    return parsePoints(body[bulkKey]);
  }

  const indexed = [];
  const regex = new RegExp(`^keyFeaturePoint_${index}_(\\d+)$`);
  for (const [field, value] of Object.entries(body)) {
    const match = field.match(regex);
    if (match && String(value).trim()) {
      indexed.push({ order: parseInt(match[1], 10), text: String(value).trim() });
    }
  }
  if (indexed.length) {
    return indexed.sort((a, b) => a.order - b.order).map((x) => x.text);
  }
  return null;
};

const parsePointsFromRow = (row, body, index, fallbackPoints) => {
  const fromFields = collectKeyFeaturePointsFromBody(body, index);
  if (fromFields?.length) return fromFields;

  const fromRowNumberedKeys = [];
  for (let p = 0; p < 20; p++) {
    const val = row[`point${p}`] ?? row[`point_${p}`];
    if (val !== undefined && String(val).trim()) {
      fromRowNumberedKeys.push(String(val).trim());
    }
  }
  if (fromRowNumberedKeys.length) return fromRowNumberedKeys;

  return parsePoints(row.points !== undefined ? row.points : fallbackPoints);
};

const parseBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  return ['true', '1', 'yes', 'on'].includes(String(value).toLowerCase());
};

const uploadMediaUrl = async (file, folder) => {
  if (!file) return '';
  const resourceType = isVideoMime(file.mimetype) ? 'video' : 'auto';
  const format = file.mimetype === 'application/pdf' ? 'pdf' : null;
  const result = await uploadToCloudinary(file, folder, resourceType, format);
  return result.url;
};

const resolveRowCount = (...sources) => {
  let max = -1;
  for (const source of sources) {
    if (Array.isArray(source)) {
      max = Math.max(max, source.length - 1);
    } else if (source && typeof source === 'object') {
      max = Math.max(max, ...Object.keys(source).map((k) => parseInt(k, 10)));
    }
  }
  return Math.max(0, max + 1);
};

/**
 * One UI block = { image, points: string[] }
 * - JSON keyFeatures: [{ "points": ["Daily tests", "Mentor support", ...] }, ...]
 * - Image file: keyFeatureImage_0 (one per row)
 * - Optional separate point fields: keyFeaturePoints_0 or keyFeaturePoint_0_0 … _4
 */
const buildKeyFeatures = async (req, existing = []) => {
  const meta = parseMetaArray(req.body, 'keyFeatures', 'keyFeaturesMeta');
  const fileMap = normalizeFilesMap(req);
  const indexed = collectIndexedFiles(fileMap, 'keyFeatureImage');
  const arrayFiles = collectArrayFiles(fileMap, 'keyFeatureImage');

  const pointFieldIndices = Object.keys(req.body)
    .map((k) => {
      const m = k.match(/^keyFeaturePoints?_(\d+)/);
      return m ? parseInt(m[1], 10) : -1;
    })
    .filter((i) => i >= 0);

  const count = resolveRowCount(
    meta,
    indexed,
    arrayFiles,
    existing,
    pointFieldIndices.length ? { length: Math.max(...pointFieldIndices) + 1 } : []
  );
  const result = [];

  for (let i = 0; i < count; i++) {
    const row = meta[i] || {};
    const prev = existing[i] || {};
    const file = indexed[i] || arrayFiles[i];

    let image = row.image || prev.image || '';
    if (file) {
      image = await uploadMediaUrl(file, 'courses/key-features');
    }

    const points = parsePointsFromRow(row, req.body, i, prev.points);

    if (!image && !points.length && !file) continue;

    result.push({ image, points });
  }

  return result.slice(0, MAX_KEY_FEATURES);
};

/**
 * whyChooseSection — text: whyChooseTitle, whyChooseSubtitle, featureCards (JSON)
 * Files: featureCardIcon_0 OR featureCardIcon[]
 */
const buildWhyChooseSection = async (req, existing = {}) => {
  const prev = existing || {};
  const sectionJson = safeParseJson(req.body.whyChooseSection, {});

  const title =
    req.body.whyChooseTitle ??
    sectionJson.title ??
    prev.title ??
    '';
  const subtitle =
    req.body.whyChooseSubtitle ??
    sectionJson.subtitle ??
    prev.subtitle ??
    '';

  const cardsMeta = parseMetaArray(req.body, 'featureCards', 'featureCardsMeta');
  const nestedCards = Array.isArray(sectionJson.featureCards) ? sectionJson.featureCards : [];
  const meta = cardsMeta.length ? cardsMeta : nestedCards;
  const prevCards = Array.isArray(prev.featureCards) ? prev.featureCards : [];

  const fileMap = normalizeFilesMap(req);
  const indexed = collectIndexedFiles(fileMap, 'featureCardIcon');
  const arrayFiles = collectArrayFiles(fileMap, 'featureCardIcon');

  const count = resolveRowCount(meta, indexed, arrayFiles, prevCards);
  const featureCards = [];

  for (let i = 0; i < count; i++) {
    const row = meta[i] || {};
    const prevCard = prevCards[i] || {};
    const file = indexed[i] || arrayFiles[i];

    let image = row.image || prevCard.image || '';
    if (file) {
      image = await uploadMediaUrl(file, 'courses/feature-cards');
    }

    const featureTitle = (row.featureTitle ?? prevCard.featureTitle ?? '').trim();
    const featureDescription = (row.featureDescription ?? prevCard.featureDescription ?? '').trim();
    // displayOrder must live inside each featureCards[] object (not separate form fields)
    const displayOrder = resolveFeatureCardDisplayOrder(row, prevCard, i);
    const highlightOnWebsite = parseBoolean(
      row.highlightOnWebsite ?? prevCard.highlightOnWebsite,
      false
    );

    if (!image && !featureTitle && !featureDescription && !file) continue;

    featureCards.push({
      image,
      featureTitle,
      displayOrder,
      featureDescription,
      highlightOnWebsite
    });
  }

  featureCards.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

  return {
    title: String(title).trim(),
    subtitle: String(subtitle).trim(),
    featureCards: featureCards.slice(0, MAX_FEATURE_CARDS)
  };
};

/**
 * helpSections — text: helpSections (JSON array, optional row count)
 * Files per row: helpSectionVideo_0, helpSectionImage1_0, helpSectionImage2_0
 */
const buildHelpSections = async (req, existing = []) => {
  const meta = parseMetaArray(req.body, 'helpSections', 'helpSectionsMeta');
  const prev = Array.isArray(existing) ? existing : [];
  const fileMap = normalizeFilesMap(req);

  const videoIndexed = collectIndexedFiles(fileMap, 'helpSectionVideo');
  const image1Indexed = collectIndexedFiles(fileMap, 'helpSectionImage1');
  const image2Indexed = collectIndexedFiles(fileMap, 'helpSectionImage2');

  const videoArray = collectArrayFiles(fileMap, 'helpSectionVideo');
  const image1Array = collectArrayFiles(fileMap, 'helpSectionImage1');
  const image2Array = collectArrayFiles(fileMap, 'helpSectionImage2');

  const count = resolveRowCount(
    meta,
    videoIndexed,
    image1Indexed,
    image2Indexed,
    videoArray,
    prev
  );

  const result = [];

  for (let i = 0; i < count; i++) {
    const row = meta[i] || {};
    const prevRow = prev[i] || {};

    const videoFile = videoIndexed[i] || videoArray[i];
    const image1File = image1Indexed[i] || image1Array[i];
    const image2File = image2Indexed[i] || image2Array[i];

    let video = row.video || prevRow.video || '';
    let image1 = row.image1 || prevRow.image1 || '';
    let image2 = row.image2 || prevRow.image2 || '';

    if (videoFile) video = await uploadMediaUrl(videoFile, 'courses/help-videos');
    if (image1File) image1 = await uploadMediaUrl(image1File, 'courses/help-images');
    if (image2File) image2 = await uploadMediaUrl(image2File, 'courses/help-images');

    const displayOrder = resolveDisplayOrder(
      { displayOrder: row.displayOrder ?? prevRow.displayOrder },
      i
    );

    if (!video && !image1 && !image2) continue;

    result.push({ displayOrder, video, image1, image2 });
  }

  result.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  return result.slice(0, MAX_HELP_SECTIONS);
};

const buildCourseCmsPayload = async (req, existingCourse = null) => {
  const existing = existingCourse || {};

  const [keyFeatures, whyChooseSection, helpSections] = await Promise.all([
    buildKeyFeatures(req, existing.keyFeatures),
    buildWhyChooseSection(req, existing.whyChooseSection),
    buildHelpSections(req, existing.helpSections)
  ]);

  return { keyFeatures, whyChooseSection, helpSections };
};

const shouldRebuildCms = (body, req) => {
  if (hasCmsFiles(req)) return true;
  const keys = [
    'keyFeatures',
    'keyFeaturesMeta',
    'featureCards',
    'featureCardsMeta',
    'helpSections',
    'helpSectionsMeta',
    'whyChooseTitle',
    'whyChooseSubtitle',
    'whyChooseSection'
  ];
  return keys.some((k) => body[k] !== undefined);
};

const hasCmsFiles = (req) => {
  if (!req.files) return false;
  const list = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
  return list.some((f) =>
    /^(keyFeatureImage|featureCardIcon|helpSectionVideo|helpSectionImage1|helpSectionImage2)/.test(
      f.fieldname
    )
  );
};

module.exports = {
  buildCourseCmsPayload,
  buildKeyFeatures,
  buildWhyChooseSection,
  buildHelpSections,
  shouldRebuildCms,
  hasCmsFiles
};
