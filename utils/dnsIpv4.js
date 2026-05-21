const dns = require('dns');

const preferIpv4Dns = () => {
  if (typeof dns.setDefaultResultOrder === 'function') {
    dns.setDefaultResultOrder('ipv4first');
  }
};

module.exports = { preferIpv4Dns };
