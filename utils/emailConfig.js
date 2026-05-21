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

const getEmailHost = () => trimEnvValue(process.env.EMAIL_HOST) || 'smtp.gmail.com';

const getEmailPort = () => Number(trimEnvValue(process.env.EMAIL_PORT)) || 587;

const getEmailUser = () => trimEnvValue(process.env.EMAIL_USER);

const getEmailPass = () => trimEnvValue(process.env.EMAIL_PASS).replace(/\s+/g, '');

const isEmailConfigured = () => Boolean(getEmailUser() && getEmailPass());

const assertEmailConfigured = () => {
  if (!isEmailConfigured()) {
    const err = new Error(
      'Email is not configured. Set EMAIL_USER and EMAIL_PASS (Gmail App Password) in .env or Render Environment.'
    );
    err.statusCode = 503;
    throw err;
  }
};

module.exports = {
  getEmailHost,
  getEmailPort,
  getEmailUser,
  getEmailPass,
  isEmailConfigured,
  assertEmailConfigured
};
