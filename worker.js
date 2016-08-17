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

  return primus;
}

function registerClientEvents(primus) {
  process.on("message", (message)=>{
    if (!(sparksById[message.displayId] || sparksById[message.clientId])) {
      return console.error(`Worker received ${JSON.stringify(message)} for an id it does not handle`);
    }

    if (message.msg === "presence-result") {
      sparksById[message.clientId].write(message);
    } else if (message.msg === "screenshot-request") {
      stats.incrementCount("sentMessages");
      sparksById[message.displayId].write(message);
    }
  });

  primus.on("connection", function(spark) {
    let displayId = spark.query.displayId || spark.query.displayID || spark.query.displayid;

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

      if (data.msg === "screenshot-saved") {
        if (!data.displayId) {return spark.write({error: "expected an id"});}

        process.send(data);
      }
    });
  });
}
