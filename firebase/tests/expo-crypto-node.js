// Node stand-in for expo-crypto in the emulator tests (Node has Web Crypto built in).
const { webcrypto } = require('node:crypto');
module.exports = {
  getRandomValues: (a) => webcrypto.getRandomValues(a),
  getRandomBytes: (n) => webcrypto.getRandomValues(new Uint8Array(n)),
};
