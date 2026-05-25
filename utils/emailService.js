const dns = require('dns').promises;
const nodemailer = require('nodemailer');
const {
  getEmailHost,
  getEmailPort,
  getEmailUser,
  getEmailPass,
  isEmailConfigured
} = require('./emailConfig');

let transporter = null;

const resetTransporter = () => {
  transporter = null;
};

const createTransporter = async () => {
  const host = getEmailHost();
  const port = getEmailPort();
  const user = getEmailUser();
  const pass = getEmailPass();

  let smtpHost = host;
  try {
    const addresses = await dns.resolve4(host);
    if (addresses?.length) {
      smtpHost = addresses[0];
    }
  } catch {
    // use hostname if resolve fails (e.g. local dev)
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port,
    secure: port === 465,
    requireTLS: port === 587,
    auth: { user, pass },
    tls: host !== smtpHost ? { servername: host, minVersion: 'TLSv1.2' } : { minVersion: 'TLSv1.2' },
    pool: true,
    maxConnections: 1,
    maxMessages: 100,
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
    transporter.verify().then(() => {
      console.log('✅ Gmail SMTP ready:', getEmailUser());
    }).catch((err) => {
      console.error('❌ Gmail SMTP verify failed:', err.message);
    });
  }
  return transporter;
};

const generateOTPEmailHTML = (otp, userName, userType = 'student') => {
  const labels = {
    parent: 'Parent',
    admin_access: 'Admin',
    password_reset: 'Account'
  };
  const userTypeLabel = labels[userType] || 'Student';
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Sriram IAS OTP</title></head>
<body style="font-family:Segoe UI,sans-serif;background:#f5f5f5;padding:20px">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;padding:32px">
    <h2 style="color:#667eea">Sriram IAS</h2>
    <p>Hello ${userName || 'User'},</p>
    <p>Your OTP to verify your ${userTypeLabel} account:</p>
    <p style="font-size:36px;font-weight:bold;letter-spacing:6px;color:#667eea">${otp}</p>
    <p style="color:#666">Valid for 5 minutes. Do not share this code.</p>
  </div>
</body>
</html>`;
};

const sendOTPEmail = async (to, otp, userName, userType = 'student') => {
  const transport = await getTransporter();
  const info = await transport.sendMail({
    from: `"Sriram IAS" <${getEmailUser()}>`,
    to,
    subject: 'Your OTP Code - Sriram IAS',
    html: generateOTPEmailHTML(otp, userName, userType),
    text: `Sriram IAS\n\nHello ${userName || 'User'},\n\nYour OTP: ${otp}\nValid for 5 minutes.\n`
  });
  console.log(`✅ OTP email sent to ${to}`, info.messageId);
  return info;
};

const sendEmail = async ({ to, subject, html, text }) => {
  const transport = await getTransporter();
  const info = await transport.sendMail({
    from: `"Sriram IAS" <${getEmailUser()}>`,
    to,
    subject,
    html,
    text: text || subject
  });
  console.log(`✅ Email sent to ${to}`, info.messageId);
  return info;
};

module.exports = {
  sendOTPEmail,
  sendEmail,
  getTransporter,
  isEmailConfigured,
  resetTransporter
};
