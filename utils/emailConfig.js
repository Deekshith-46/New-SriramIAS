const trimEnvValue = (value) => {
  if (value == null || value === '') return '';
  let v = String(value).trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1).trim();
  }
  return v;
};

const getEmailUser = () => trimEnvValue(process.env.EMAIL_USER);

// Gmail app passwords are 16 chars; users often paste with spaces
const getEmailPass = () => trimEnvValue(process.env.EMAIL_PASS).replace(/\s+/g, '');

const isEmailConfigured = () => Boolean(getEmailUser() && getEmailPass());

const maskEmail = (email) => {
  if (!email || !email.includes('@')) return null;
  const [local, domain] = email.split('@');
  const visible = local.length <= 2 ? '*' : local.slice(0, 2);
  return `${visible}***@${domain}`;
};

const assertEmailConfigured = () => {
  if (!isEmailConfigured()) {
    const err = new Error(
      'Email service is not configured. On Render, add EMAIL_USER and EMAIL_PASS in Dashboard → Environment (a .env file in the repo is not used in production).'
    );
    err.statusCode = 503;
    throw err;
  }
};

module.exports = {
  trimEnvValue,
  getEmailUser,
  getEmailPass,
  isEmailConfigured,
  maskEmail,
  assertEmailConfigured
};
