const reloadableServer = "./reloadable-server.js";

var cluster = require("cluster");
var Primus = require("primus");
var emitter = require("primus-emitter");
var latency = require("primus-spark-latency");
var chokidar = require("chokidar");
var http = require("http");
var argv = require("yargs")
  .default({address: "localhost", insecureListenerPort: 3000, workers: 6, trustedSenderPort: 3001})
  .argv;
var server = http.createServer();
var stats = {
  clients: 0,
  newClients: 0,
  disconnectedClients: 0,
  unknownDisconnectedClients: 0,
  newErrors: 0,
  sentMessages: 0,
  savedMessagesSent: 0,
  savedMessages: 0
};

if(cluster.isMaster) {
  var numWorkers = argv.workers;
  var displayIdsByWorker = {};
  var processState = { stats: stats, displayIdsByWorker: displayIdsByWorker };

  console.log("Master cluster setting up " + numWorkers + " workers...");

  for(var i = 0; i < numWorkers; i++) {
    cluster.fork();
  }

  cluster.on("message", (worker, message)=>{
    require(reloadableServer).masterClusterMessage(worker, message, processState);
  });

  cluster.on("online", function(worker) {
    console.log("Worker " + worker.process.pid + " is online");

    displayIdsByWorker[worker.id] = {};
  });

  cluster.on("exit", function(worker, code, signal) {
    console.log("Worker " + worker.process.pid + " died with code: " + code + ", and signal: " + signal);

    delete displayIdsByWorker[worker.id];

    var newWorker = cluster.fork();
    console.log("Starting a new worker " + newWorker.process.pid);
  });

  startHotCodeReload();
  startStats(processState);
  registerSenderEvents(startPrimus());
  startServer(argv.trustedSenderPort);
}
else {
  var displaysById = {};
  var displaysBySpark = {};
  var processState = { stats: stats, displaysById: displaysById, displaysBySpark: displaysBySpark };

  startHotCodeReload();
  registerListenerEvents(startPrimus());
  startStats(processState);
  startServer();
}

function startPrimus() {
  var primus = new Primus(server, { transformer: "uws", use_clock_offset: true, iknowclusterwillbreakconnections: true });

  primus.use("emitter", emitter);
  primus.use("spark-latency", latency);

  return primus;
}

function registerSenderEvents(primus) {
  primus.on("connection", function(spark) {
    spark.on("data", function(data) {
      let workers = Object.keys(displayIdsByWorker);
      let workerId = workers.find((workerId)=>{
        return displayIdsByWorker[workerId][data.displayId];
      });

      if (!workerId) {
        return spark.write({msg: "presence-not-detected", displayId: data.displayId});
      }

      return spark.write({msg: "presence-detected", displayId: data.displayId});
    });
  });
}

function registerListenerEvents(primus) {
  process.on("message", (message)=>{
    if(message.msg) {
      let data = message.msg;

      if(displaysById[data.displayId]) {
        stats.sentMessages++;
        displaysById[data.displayId].send("message", data.message);
      } else {
        console.error(`Worker received ${data} for an id it does not handle`);
      }
    }
  });

  primus.on("connection", function(spark) {
    spark.on("end", function() {
      stats.clients--;
      stats.disconnectedClients++;

      var displayId = displaysBySpark[spark.id];

      delete displaysById[displayId];
      delete displaysBySpark[spark.id];
      process.send({ disconnection: { displayId: displayId }});
    });

    spark.on("data", function (data) {
      if (!data.displayId) {return spark.send("expected an id");}

      if (data.msg === "register-display-id") {
        stats.clients++;
        stats.newClients++;
        displaysById[data.displayId] = spark;
        displaysBySpark[spark.id] = data.displayId;

        process.send({ connection: { displayId: data.displayId }});
      }
    });
  });
}

function startStats(processState) {
  setInterval(function () {
    require(reloadableServer).updateStats(processState);
  }, cluster.isMaster ? 5000 : 1000);
}

function startServer(port = argv.insecureListenerPort) {
  server.listen(port, argv.address, function() {
    console.log("Running on http://" + server.address().address + ":" + server.address().port);
  });
}

function startHotCodeReload() {
  var watcher = chokidar.watch("*.js", {
    ignored: /node_modules|\.git/,
    persistent: true
  });
  watcher.on("ready", () => {
    watcher.on("all", () => {
      console.log("Clearing module cache from server");
      Object.keys(require.cache).forEach((file) => {
        delete require.cache[file];
      });
    });
  });
}
