const getPublicEmailErrorMessage = (error) => {
  const parts = [
    error?.message,
    error?.response,
    error?.code,
    error?.responseCode
  ]
    .filter(Boolean)
    .join(' ');

  if (/535|534|Invalid login|Authentication credentials|EAUTH/i.test(parts)) {
    return (
      'Gmail rejected the server login. On Render → Environment: set EMAIL_USER to your full Gmail address, ' +
      'and EMAIL_PASS to a 16-character App Password (Google Account → Security → 2-Step Verification → App passwords). ' +
      'Do not use your normal Gmail password. Remove spaces from the app password.'
    );
  }

  if (/timed out|ETIMEDOUT|ECONNECTION|ESOCKET|ETIMEOUT/i.test(parts)) {
    return 'SMTP connection timed out from the server. Redeploy and try again; check Render logs for details.';
  }

  if (/self signed|certificate|UNABLE_TO_VERIFY/i.test(parts)) {
    return 'SMTP TLS error from server. Check EMAIL_HOST (smtp.gmail.com) and EMAIL_PORT (587).';
  }

  return (
    'Could not send OTP email from the server. Check GET /api/health on your Render URL for email diagnostics, ' +
    'and Render → Logs for the exact SMTP error.'
  );
};

module.exports = {
  getPublicEmailErrorMessage
};
