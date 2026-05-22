const { preferIpv4Dns } = require('./utils/dnsIpv4');
preferIpv4Dns();

const app = require('./app');
const { getTransporter, isEmailConfigured } = require('./utils/emailService');
const { seedLmsTestCategories } = require('./utils/lmsTestSeed');
const { seedAnswerWritingCategories } = require('./utils/answerWritingSeed');

if (isEmailConfigured()) {
  getTransporter().catch(() => {});
} else {
  console.warn('⚠️  EMAIL_USER / EMAIL_PASS not set — OTP emails will not be sent.');
}

seedLmsTestCategories().catch((err) => {
  console.error('LMS test category seed failed:', err.message);
});

seedAnswerWritingCategories().catch((err) => {
  console.error('Answer writing category seed failed:', err.message);
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════╗
║   🚀 Sriram IAS Backend Server               ║
║   📍 Port: ${PORT}                            ║
║   🌍 Environment: ${process.env.NODE_ENV || 'development'}              ║
║   📧 Email: ${isEmailConfigured() ? 'Gmail SMTP configured' : 'not configured'}        ║
╚═══════════════════════════════════════════════╝
  `);
});

process.on('unhandledRejection', (err) => {
  console.error(`❌ Error: ${err.message}`);
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
  console.error(`❌ Uncaught Exception: ${err.message}`);
  process.exit(1);
});
