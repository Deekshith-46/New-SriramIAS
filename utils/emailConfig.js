const isEmailConfigured = () =>
  Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);

const assertEmailConfigured = () => {
  if (!isEmailConfigured()) {
    const err = new Error(
      'Email service is not configured. Set EMAIL_USER and EMAIL_PASS in your environment (Render dashboard → Environment).'
    );
    err.statusCode = 503;
    throw err;
  }
};

module.exports = {
  isEmailConfigured,
  assertEmailConfigured
};
