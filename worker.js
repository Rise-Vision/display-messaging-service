const stats = require("./stats.js"),
Primus = require("primus");

let sparksById = {};
let displaysBySpark = {};

module.exports = {
  setup(server) {
    registerClientEvents(startPrimus(server));
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

function registerClientEvents(primus) {
  process.on("message", (message)=>{
    if (!(sparksById[message.displayId] || sparksById[message.clientId])) {
      console.error(`Worker received ${JSON.stringify(message)} for an id it does not handle`);
    }
    else if (message.msg === "presence-result") {
      sparksById[message.clientId].write(message);
    }
    else if (message.msg === "screenshot-request") {
      stats.incrementCount("sentMessages");
      sparksById[message.displayId].write(message);
    }
   else if (message.msg === "screenshot-saved") {
      stats.incrementCount("sentMessages");
      sparksById[message.clientId].write(message);
    }
    else if (message.msg === "reboot-request") {
      stats.incrementCount("sentMessages");
      sparksById[message.displayId].write(message);
    } else if (message.msg === "duplicate-display-id") {
      sparksById[message.displayId].write(message);
      delete sparksById[message.displayId];
    }
  });

  primus.on("connection", function(spark) {
    let displayId = spark.query.displayId || spark.query.displayID || spark.query.displayid;

    if (displayId && sparksById[displayId]) {sparksById[displayId].write({"msg": "duplicate-display-id"});}

    stats.incrementCount("clients");
    stats.incrementCount("newClients");
    sparksById[displayId || spark.id] = spark;
    if (displayId) {displaysBySpark[spark.id] = displayId;}

    process.send({ connection: { id: displayId || spark.id }});
    if (!displayId) {spark.write({"msg": "client-connected", "clientId": spark.id});}

    spark.on("end", function() {
      stats.decrementCount("clients");
      stats.incrementCount("disconnectedClients");

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
      else if (data.msg === "screenshot-saved") {
        if (!data.displayId) {
          spark.write({error: "expected an id"});
        }
        else {
          process.send(data);
        }
      }
    });
  });
}

function requestListener() {
  console.log(`Running on http${argv.nossl ? "" : "s"}://${server.address().address}:${server.address().port}`);
}
