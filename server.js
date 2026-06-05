const { preferIpv4Dns } = require('./utils/dnsIpv4');
preferIpv4Dns();

// Hide noisy Mongoose duplicate-index warnings (schema index + schema.index())
const emitWarning = process.emit.bind(process);
process.emit = function emit(event, warning, ...rest) {
  if (
    event === 'warning' &&
    warning &&
    warning.name === 'MongooseWarning' &&
    /Duplicate schema index/.test(String(warning.message))
  ) {
    return true;
  }
  return Reflect.apply(emitWarning, process, [event, warning, ...rest]);
};

const origEmitWarning = process.emitWarning;
process.emitWarning = function patchedEmitWarning(warning, ...args) {
  if (
    warning &&
    typeof warning === 'object' &&
    warning.name === 'MongooseWarning' &&
    /Duplicate schema index/.test(String(warning.message))
  ) {
    return;
  }
  if (typeof warning === 'string' && /Duplicate schema index/.test(warning)) {
    return;
  }
  return origEmitWarning.call(process, warning, ...args);
};

const app = require('./app');
const { getTransporter, isEmailConfigured } = require('./utils/emailService');
const { seedLmsTestCategories } = require('./utils/lmsTestSeed');
const { seedAnswerWritingCategories } = require('./utils/answerWritingSeed');
const { seedDefaultRoles } = require('./utils/roleSeed');
const { syncPermissionMatrixForAllRoles } = require('./utils/permissionHelpers');

if (isEmailConfigured()) {
  getTransporter().catch(() => {});
}

seedLmsTestCategories().catch((err) => {
  if (process.env.STARTUP_VERBOSE === 'true') {
    console.error('LMS test category seed failed:', err.message);
  }
});

seedAnswerWritingCategories().catch((err) => {
  if (process.env.STARTUP_VERBOSE === 'true') {
    console.error('Answer writing category seed failed:', err.message);
  }
});

seedDefaultRoles()
  .then(() => syncPermissionMatrixForAllRoles())
  .catch((err) => {
    if (process.env.STARTUP_VERBOSE === 'true') {
      console.error('Default roles / permission matrix seed failed:', err.message);
    }
  });

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT);

process.on('unhandledRejection', (err) => {
  console.error(`Error: ${err.message}`);
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
  console.error(`Uncaught Exception: ${err.message}`);
  process.exit(1);
});
