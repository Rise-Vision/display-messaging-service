var Primus = require("../primus.js");

module.exports = {
  createClient(serverUrl, autoConnect = true) {
    return new Primus(serverUrl, {manual: !autoConnect});
  }
};
