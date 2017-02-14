const stats = require("./stats.js"),
Primus = require("primus");

let sparksById = {};
let displaysBySpark = {};

module.exports = {
  setup(servers) {
    registerIPC();

    servers.forEach((server)=>{
      registerClientEvents(startPrimus(server));
    });
  }
};

function startPrimus(server) {
  let primus = new Primus(server, {
    transformer: "uws", //websocket only
    use_clock_offset: true,
    iknowclusterwillbreakconnections: true  //not an issue with websocket transport
  });

  primus.save(__dirname + "/primus.js");
  return primus;
}

function registerIPC() {
  process.on("message", (message)=>{
    if (message.msg && !(sparksById[message.displayId] || sparksById[message.clientId])) {
      console.error(`Worker received ${JSON.stringify(message)} for an id it does not handle`);
    }
    else if (message.msg === "presence-result") {
      sparksById[message.clientId] && sparksById[message.clientId].write(message);
    }
    else if (message.msg === "content-update") {
      stats.incrementCount("intervalMessageCount");
      sparksById[message.displayId] && sparksById[message.displayId].write(message);
    }
    else if (message.msg === "screenshot-request") {
      stats.incrementCount("intervalMessageCount");
      sparksById[message.displayId] && sparksById[message.displayId].write(message);
    }
    else if (message.msg === "screenshot-saved" || message.msg === "screenshot-failed") {
      stats.incrementCount("intervalMessageCount");
      sparksById[message.clientId] && sparksById[message.clientId].write(message);
    }
    else if (message.msg === "restart-request" || message.msg === "reboot-request") {
      stats.incrementCount("intervalMessageCount");
      sparksById[message.displayId] && sparksById[message.displayId].write(message);
    }
    else if (message.msg === "duplicate-display-id") {
      stats.incrementCount("intervalMessageCount");

      sparksById[message.displayId] && sparksById[message.displayId].write(message);

      delete displaysBySpark[sparksById[message.displayId].id];
      delete sparksById[message.displayId];
    }
  });
}

function registerClientEvents(primus) {
  primus.on("error", (err)=>{
    console.error('Something horrible has happened', err.stack);
    stats.incrementCount("intervalErrorCount");
  });

  primus.on("connection", function(spark) {
    let displayId = spark.query.displayId || spark.query.displayID || spark.query.displayid;
    let machineId = spark.query.machineId;

    stats.incrementCount("intervalClientCount");

    if (displayId && sparksById[displayId]) {
      delete displaysBySpark[sparksById[displayId].id];
      sparksById[displayId].write({"msg": "duplicate-display-id", machineId});
    }

    sparksById[displayId || spark.id] = spark;

    if (displayId) {displaysBySpark[spark.id] = displayId;}

    process.send({ connection: { id: displayId || spark.id, machineId }});

    if (!displayId) {spark.write({"msg": "client-connected", "clientId": spark.id});}

    spark.on("end", function() {
      stats.decrementCount("intervalClientCount");

      let displayId = displaysBySpark[spark.id];

      delete sparksById[displayId || spark.id];
      delete displaysBySpark[spark.id];
      process.send({ disconnection: { id: displayId || spark.id}});
    });

    spark.on("data", function (data) {
      if (data.msg === "presence-request") {
        data.clientId = spark.id;
        process.send(data);
      }
      else if (data.msg === "screenshot-saved" || data.msg === "screenshot-failed") {
        if (!data.displayId || !data.clientId) {
          spark.write({ error: "displayId and clientId are required" });
        }
        else {
          process.send(data);
        }
      }
      else {
        spark.write({ error: "Invalid message request" });
      }
    });
  });
}

function requestListener() {
  console.log(`Running on http${argv.nossl ? "" : "s"}://${server.address().address}:${server.address().port}`);
}
