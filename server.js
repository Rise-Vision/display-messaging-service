#!/usr/bin/node
var crypto = require("crypto");
var cluster = require("cluster");
var Primus = require("primus");
var http = require("http");
var https = require("https");
var fs = require("fs");
var workersPerCpu = 3;
var cpuCount = require("os").cpus().length * workersPerCpu;
var argv = require("yargs")
  .default({
    address: "0.0.0.0",
    insecureListenerPort: 3000,
    workers: cpuCount,
    trustedSenderPort: 3001,
    nossl: false,
    serverkey: require("process").env.SERVERKEY || String(Math.random())
  })
  .argv;
var server = argv.nossl ? http.createServer() : https.createServer({
  key: fs.readFileSync("server.key"),
  cert: fs.readFileSync("server.crt"),
  ca: fs.readFileSync("ca.crt")
});
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
  var idsByWorker = {};

  console.log("Master cluster setting up " + numWorkers + " workers...");

  for(var i = 0; i < numWorkers; i++) {
    cluster.fork();
  }

  function findWorkerFor(id) {
    return Object.keys(idsByWorker).find((workerId)=>{
      return idsByWorker[workerId][id];
    });
  }

  cluster.on("message", (worker, message)=>{
    if(message.connection) {
      idsByWorker[worker.id][message.connection.id] = true;
    }
    else if(message.disconnection) {
      delete idsByWorker[worker.id][message.disconnection.id];
    }
    else if(message.stats) {
      stats.clients += (message.stats.newClients - message.stats.disconnectedClients);
      stats.newClients += message.stats.newClients;
      stats.disconnectedClients += message.stats.disconnectedClients;
      stats.unknownDisconnectedClients += message.stats.unknownDisconnectedClients;
      stats.newErrors += message.stats.newErrors;
      stats.sentMessages += message.stats.sentMessages;
      stats.savedMessagesSent += message.stats.savedMessagesSent;
      stats.savedMessages += message.stats.savedMessages;
    } else if (message.msg === "screenshot-saved") {
      spark.write(message);
    } else if (message.msg === "presence-request") {
      worker.send({
        msg: "presence-result",
        clientId: message.clientId,
        result: message.displayIds.map((id)=>{return {[id]: Boolean(findWorkerFor(id))};})
      });
    }
  });

  cluster.on("online", function(worker) {
    console.log("Worker " + worker.process.pid + " is online");

    idsByWorker[worker.id] = {};
  });

  cluster.on("exit", function(worker, code, signal) {
    console.log("Worker " + worker.process.pid + " died with code: " + code + ", and signal: " + signal);

    delete idsByWorker[worker.id];

    var newWorker = cluster.fork();
    console.log("Starting a new worker " + newWorker.process.pid);
  });

  startStats();
  registerSenderEvents(startPrimus((req, done)=>{
    if (req.query.SERVERKEY !== argv.serverKey) {
      return done(new Error("Invalid serverkey"));
    }

    return done();
  }));
  startServer(argv.trustedSenderPort);
}
else {
  var displaysById = {};
  var sparksById = {};
  var displaysBySpark = {};

  registerClientEvents(startPrimus());
  startStats();
  startServer();
}

function startPrimus(authFn) {
  var primus = new Primus(server, {
    transformer: "uws", //websocket only
    use_clock_offset: true,
    iknowclusterwillbreakconnections: true  //not an issue with websocket transport
  });

  if (authFn) {primus.authorize(authFn);}

  return primus;
}

function registerSenderEvents(primus) {
  primus.on("connection", function(spark) {
    spark.on("data", function(data) {
      if (!data.displayId) {return spark.write({"error": "expected an id"});}

      let workers = Object.keys(idsByWorker);
      let workerId = workers.find((workerId)=>{
        return idsByWorker[workerId][data.displayId];
      });

      if (data.msg === "screenshot-request") {
        if (!workerId) {
          return spark.write({error: "display not connected", displayId: data.displayId});
        }

        return cluster.workers[workerId].send(data);
      }
    });
  });
}

function registerClientEvents(primus) {
  process.on("message", (message)=>{
    if (!(displaysById[message.displayId] || sparksById[message.clientId])) {
      return console.error(`Worker received ${JSON.stringify(message)} for an id it does not handle`);
    }

    if (message.msg === "presence-result") {
      sparksById[message.clientId].write(message);
    } else if (message.msg === "screenshot-request") {
      stats.sentMessages++;
      displaysById[message.displayId].write(message);
    }
  });

  primus.on("connection", function(spark) {
    let displayId = spark.query.displayId || spark.query.displayID || spark.query.displayid;

    if (displayId) {
      stats.clients++;
      stats.newClients++;
      displaysById[displayId] = spark;
      displaysBySpark[spark.id] = displayId;

      process.send({ connection: { id: displayId }});

      spark.on("end", function() {
        stats.clients--;
        stats.disconnectedClients++;

        var displayId = displaysBySpark[spark.id];

        delete displaysById[displayId];
        delete displaysBySpark[spark.id];
        process.send({ disconnection: { id: displayId }});
      });

      spark.on("data", function (data) {
        if (!data.displayId) {return spark.write({error: "expected an id"});}

        if (data.msg === "screenshot-saved") {
          process.send(data);
        }
      });
    } else {
      stats.clients++;
      stats.newClients++;

      sparksById[spark.id] = spark;
      process.send({connection: {id: spark.id}});
      spark.write({"msg": "client-connected", "clientId": spark.id});

      spark.on("data", function (data) {
        if (data.msg === "presence-request") {
          data.clientId = spark.id;
          process.send(data);
        }
      });

      spark.on("end", function() {
        stats.clients--;
        stats.disconnectedClients++;
        delete sparksById[spark.id];
        process.send({disconnection: {id: spark.id}});
      });
    }
  });
}

function startStats() {
  setInterval(function () {
    if(cluster.isMaster) {
      var currStats = [
        Date.now(), stats.clients, stats.newClients, stats.disconnectedClients, stats.unknownDisconnectedClients,
        stats.newErrors, stats.newGCSErrors, stats.sentMessages, stats.savedMessagesSent, stats.savedMessages
      ].join(",");


      fs.appendFile("stats.csv", currStats + "\n", function (err) {
        if(err) { console.log("Error saving stats", err); }
      });
    }
    else {
      process.send({ stats: stats });
    }

    stats.newClients = 0;
    stats.disconnectedClients = 0;
    stats.unknownDisconnectedClients = 0;
    stats.newErrors = 0;
    stats.newGCSErrors = 0;
    stats.sentMessages = 0;
    stats.savedMessagesSent = 0;
    stats.savedMessages = 0;
  }, cluster.isMaster ? 5000 : 1000);
}

function startServer(port = argv.insecureListenerPort) {
  server.listen(port, argv.address, function() {
    console.log(`Running on http${argv.nossl ? "" : "s"}://${server.address().address}:${server.address().port}`);
  });
}
