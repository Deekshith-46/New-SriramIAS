const SESSION_TIMEOUT_MAP = {
  '15_MINUTES': '15m',
  '30_MINUTES': '30m',
  '1_HOUR': '1h',
  '2_HOURS': '2h',
  '8_HOURS': '8h'
};

const getJwtExpiresIn = (sessionTimeout) =>
  SESSION_TIMEOUT_MAP[sessionTimeout] || SESSION_TIMEOUT_MAP['1_HOUR'];

module.exports = {
  SESSION_TIMEOUT_MAP,
  getJwtExpiresIn
};
