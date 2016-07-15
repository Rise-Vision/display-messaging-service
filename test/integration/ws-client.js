var Primus = require("primus");
var Socket = Primus.createSocket({
  transformer: "websockets",
  use_clock_offset: true,
  plugin: {
    "primus-emitter": require("primus-emitter"),
    "primus-spark-latency": require("primus-spark-latency")
  }
});

module.exports = {
  createClient(serverUrl) {
    return new Socket(serverUrl);
  }
};
