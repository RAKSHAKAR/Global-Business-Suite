const crypto = require("crypto");
module.exports = {
  v4: () => crypto.randomUUID(),
  v1: () => crypto.randomUUID(),
};
