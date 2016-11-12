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

let handler = cluster.isMaster ? require("./master.js").requestListener() : require("./worker.js").requestListener;

let server = argv.nossl ? http.createServer(handler) : https.createServer({
  key: fs.readFileSync("server.key"),
  cert: fs.readFileSync("server.crt"),
  ca: fs.readFileSync("ca.crt")
}, handler);

function startServer(port = argv.insecureListenerPort) {
  server.listen(port, argv.address);
}

if(cluster.isMaster) {
  require("./master.js").setup(server, argv, cluster);
  require("./stats.js").forMaster();
  startServer(argv.trustedSenderPort);
} else {
  require("./worker.js").setup(server);
  require("./stats.js").forWorkers();
  startServer();
}
