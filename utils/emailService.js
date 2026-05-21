const dns = require('dns').promises;
const nodemailer = require('nodemailer');
const {
  isEmailConfigured,
  getEmailUser,
  getEmailPass,
  maskEmail
} = require('./emailConfig');

let transporter = null;
let resolvedSmtpIpv4 = null;
let resolvedSmtpHostname = null;
let lastSmtpVerify = { ok: null, error: null, checkedAt: null };

const getSmtpHostname = () =>
  (process.env.EMAIL_HOST || 'smtp.gmail.com').replace(/^smtp:\/\//, '');

const resetTransporter = () => {
  transporter = null;
  resolvedSmtpIpv4 = null;
  resolvedSmtpHostname = null;
};

/** Resolve Gmail SMTP to IPv4 only (Render cannot reach IPv6). */
const resolveSmtpIpv4 = async () => {
  const hostname = getSmtpHostname();
  if (resolvedSmtpIpv4 && resolvedSmtpHostname === hostname) {
    return { hostname, ipv4: resolvedSmtpIpv4 };
  }

  const addresses = await dns.resolve4(hostname);
  if (!addresses?.length) {
    throw new Error(`No IPv4 address found for ${hostname}`);
  }

  resolvedSmtpHostname = hostname;
  resolvedSmtpIpv4 = addresses[0];
  console.log(`SMTP: ${hostname} → ${resolvedSmtpIpv4} (IPv4 only)`);
  return { hostname, ipv4: resolvedSmtpIpv4 };
};

const createTransporter = async () => {
  const { hostname, ipv4 } = await resolveSmtpIpv4();

  return nodemailer.createTransport({
    host: ipv4,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: false,
    requireTLS: true,
    auth: {
      user: getEmailUser(),
      pass: getEmailPass()
    },
    tls: {
      servername: hostname,
      minVersion: 'TLSv1.2'
    },
    connectionTimeout: 20000,
    greetingTimeout: 20000,
    socketTimeout: 20000
  });
};

const getTransporter = async () => {
  if (!isEmailConfigured()) {
    throw new Error('EMAIL_USER and EMAIL_PASS are not set');
  }
  if (!transporter) {
    transporter = await createTransporter();
  }
  return transporter;
};

const verifyEmailConnection = async () => {
  if (!isEmailConfigured()) {
    lastSmtpVerify = {
      ok: false,
      error: 'EMAIL_USER or EMAIL_PASS missing',
      checkedAt: new Date().toISOString()
    };
    throw new Error(lastSmtpVerify.error);
  }

  resetTransporter();
  const testTransport = await createTransporter();

  try {
    await testTransport.verify();
    transporter = testTransport;
    lastSmtpVerify = { ok: true, error: null, checkedAt: new Date().toISOString() };
    console.log('✅ Gmail SMTP verified for', maskEmail(getEmailUser()));
    return true;
  } catch (err) {
    resetTransporter();
    lastSmtpVerify = {
      ok: false,
      error: err.message,
      checkedAt: new Date().toISOString()
    };
    console.error('❌ Gmail SMTP verify failed:', err.message);
    if (/535|Invalid login|Authentication/i.test(err.message)) {
      console.error(
        '   → EMAIL_PASS must be a Gmail App Password (16 chars), not your normal password.'
      );
    }
    throw err;
  }
};

const getEmailHealth = () => ({
  configured: isEmailConfigured(),
  user: maskEmail(getEmailUser()),
  smtpHost: getSmtpHostname(),
  smtpIpv4: resolvedSmtpIpv4,
  smtpVerified: lastSmtpVerify.ok,
  smtpError: lastSmtpVerify.error,
  smtpCheckedAt: lastSmtpVerify.checkedAt,
  renderNote:
    'Render does not read .env from your repo. Set EMAIL_USER and EMAIL_PASS in Render Dashboard → Environment, then redeploy.'
});

const generateOTPEmailHTML = (otp, userName, userType = 'student') => {
  const userTypeLabel = userType === 'parent' ? 'Parent' : 'Student';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sriram IAS - OTP Verification</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; padding: 20px; }
    .email-container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; color: white; }
    .logo { font-size: 32px; font-weight: bold; margin-bottom: 10px; }
    .content { padding: 40px 30px; }
    .greeting { font-size: 24px; color: #333; margin-bottom: 15px; font-weight: 600; }
    .message { font-size: 16px; color: #666; line-height: 1.6; margin-bottom: 30px; }
    .otp-container { background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); border-radius: 10px; padding: 30px; text-align: center; margin: 30px 0; border: 2px dashed #667eea; }
    .otp-code { font-size: 48px; font-weight: bold; color: #667eea; letter-spacing: 8px; margin: 15px 0; font-family: 'Courier New', monospace; }
    .footer { background-color: #f8f9fa; padding: 25px 30px; text-align: center; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <div class="logo">Sriram IAS</div>
    </div>
    <div class="content">
      <div class="greeting">Hello ${userName || 'User'},</div>
      <div class="message">
        Your OTP code to verify your ${userTypeLabel} account:
      </div>
      <div class="otp-container">
        <div class="otp-code">${otp}</div>
        <div>Valid for 5 minutes</div>
      </div>
    </div>
    <div class="footer">Sriram IAS — automated message</div>
  </div>
</body>
</html>
  `;
};

const sendOTPEmail = async (to, otp, userName, userType = 'student') => {
  const mailOptions = {
    from: `"Sriram IAS" <${getEmailUser()}>`,
    to,
    subject: 'Your OTP Code - Sriram IAS',
    html: generateOTPEmailHTML(otp, userName, userType),
    text: `Sriram IAS\n\nHello ${userName || 'User'},\n\nYour OTP: ${otp}\nValid for 5 minutes.\n`
  };

  try {
    const transport = await getTransporter();
    const info = await transport.sendMail(mailOptions);
    console.log(`✅ OTP email sent to ${to}`);
    console.log(`Message ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    resetTransporter();
    console.error('❌ sendMail failed:', err.message);
    if (err.response) console.error('   SMTP response:', err.response);
    throw err;
  }
};

module.exports = {
  sendOTPEmail,
  generateOTPEmailHTML,
  getTransporter,
  verifyEmailConnection,
  getEmailHealth,
  resetTransporter
};
