const dns = require('dns');

// Render and similar hosts often lack IPv6 egress; Gmail may resolve to IPv6 first.
const preferIpv4Dns = () => {
  if (typeof dns.setDefaultResultOrder === 'function') {
    dns.setDefaultResultOrder('ipv4first');
  }
};

const lookupIpv4 = (hostname, options, callback) => {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  dns.lookup(hostname, { ...options, family: 4 }, callback);
};

module.exports = {
  preferIpv4Dns,
  lookupIpv4
};
