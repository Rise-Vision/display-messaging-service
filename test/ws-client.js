var Primus = require("../primus.js");

module.exports = {
  createClient(serverUrl) {
    return new Primus(serverUrl);
  }
};
