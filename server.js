#!/usr/bin/node
let cluster = require("cluster");
let http = require("http");
let https = require("https");
let fs = require("fs");
let workersPerCpu = 3;
let workerCount = require("os").cpus().length * workersPerCpu;
let argv = require("yargs")
.default({
  address: "0.0.0.0",
  insecureListenerPort: 443,
  workers: workerCount,
  trustedSenderPort: 3001,
  nossl: false,
  serverkey: require("process").env.SERVERKEY || String(Math.random())
})
.argv;

function createServer() {
  let handler = cluster.isMaster ? require("./master.js").requestListener() : require("./worker.js").requestListener;

  return argv.nossl ? http.createServer(handler) : https.createServer({
    key: fs.readFileSync("server.key"),
    cert: fs.readFileSync("server.crt"),
    ca: fs.readFileSync("ca.crt")
  }, handler);
}

function startServer(server, port = argv.insecureListenerPort) {
  server.listen(port, argv.address);
}

if(cluster.isMaster) {
  var server = createServer();

  require("./master.js").setup(server, argv, cluster);
  require("./stats.js").forMaster();
  startServer(server, argv.trustedSenderPort);
} else {
  var server443 = createServer();
  var server3000 = createServer();

  require("./worker.js").setup(server443, server3000);
  require("./stats.js").forWorkers();

  startServer(server443, 443);
  startServer(server3000, 3000);
}
