const { preferIpv4Dns } = require('./utils/dnsIpv4');
preferIpv4Dns();

const app = require('./app');
const { verifyEmailConnection } = require('./utils/emailService');
const { isEmailConfigured } = require('./utils/emailConfig');

if (isEmailConfigured()) {
  verifyEmailConnection().catch(() => {
    // Error already logged; signup will return a clearer message
  });
} else {
  console.warn(
    '⚠️  EMAIL_USER / EMAIL_PASS not set — OTP emails will fail. On Render: Dashboard → Environment (not .env file).'
  );
}

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════╗
║                                               ║
║   🚀 Sriram IAS Backend Server               ║
║   📍 Port: ${PORT}                            ║
║   🌍 Environment: ${process.env.NODE_ENV || 'development'}              ║
║   ⏰ Started at: ${new Date().toLocaleString()}          ║
║                                               ║
╚═══════════════════════════════════════════════╝
  `);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error(`❌ Error: ${err.message}`);
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error(`❌ Uncaught Exception: ${err.message}`);
  process.exit(1);
});
