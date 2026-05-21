const GMAIL_DOMAIN = '@gmail.com';

const normalizeEmail = (email) => {
  if (!email || typeof email !== 'string') return null;
  return email.toLowerCase().trim();
};

const isGmailAddress = (email) => {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  return normalized.endsWith(GMAIL_DOMAIN);
};

const assertStudentGmail = (email) => {
  if (!email) return null;
  const normalized = normalizeEmail(email);
  if (!isGmailAddress(normalized)) {
    const err = new Error('Student email must be a Gmail address (e.g. name@gmail.com)');
    err.statusCode = 400;
    throw err;
  }
  return normalized;
};

module.exports = {
  GMAIL_DOMAIN,
  normalizeEmail,
  isGmailAddress,
  assertStudentGmail
};
