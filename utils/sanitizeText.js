/** Strip script tags and trim user HTML/text input */
const sanitizeText = (value) => {
  if (value == null || typeof value !== 'string') return value;
  return value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .trim();
};

const sanitizeOptionalText = (value) => {
  if (value == null || value === '') return value;
  return sanitizeText(value);
};

module.exports = { sanitizeText, sanitizeOptionalText };
