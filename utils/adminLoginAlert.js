const { sendEmail, isEmailConfigured } = require('./emailService');

const getSuperAdminAlertEmail = () =>
  process.env.SUPER_ADMIN_ALERT_EMAIL ||
  process.env.SUPER_ADMIN_EMAIL ||
  null;

exports.sendAdminLoginAlert = async ({
  adminName,
  adminEmail,
  loginTime,
  ipAddress
}) => {
  const to = getSuperAdminAlertEmail();
  if (!to) {
    console.warn('Admin login alert skipped: SUPER_ADMIN_ALERT_EMAIL not set');
    return;
  }

  if (!isEmailConfigured()) {
    console.warn('Admin login alert skipped: email not configured');
    return;
  }

  const timeLabel =
    loginTime instanceof Date ? loginTime.toISOString() : String(loginTime);

  await sendEmail({
    to,
    subject: 'Admin Login Alert — Sriram IAS',
    html: `
      <h2>Admin Login Alert</h2>
      <p>An admin account has logged in.</p>
      <ul>
        <li><b>Name:</b> ${adminName || '—'}</li>
        <li><b>Email:</b> ${adminEmail || '—'}</li>
        <li><b>Login Time:</b> ${timeLabel}</li>
        <li><b>IP Address:</b> ${ipAddress || '—'}</li>
      </ul>
    `,
    text: `Admin Login Alert\nName: ${adminName}\nEmail: ${adminEmail}\nTime: ${timeLabel}\nIP: ${ipAddress}`
  });
};
