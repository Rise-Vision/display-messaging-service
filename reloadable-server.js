var cluster = require("cluster");
var fs = require("fs");

module.exports = {
  masterClusterMessage(worker, message, processState) {
    var displayIdsByWorker = processState.displayIdsByWorker;
    var stats = processState.stats;

    if(message.connection) {
      displayIdsByWorker[worker.id][message.connection.displayId] = true;
    }
    else if(message.disconnection) {
      delete displayIdsByWorker[worker.id][message.disconnection.displayId];
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
    }
  },
  updateStats(processState) {
    var stats = processState.stats;

    if(cluster.isMaster) {
      var currStats = [
        Date.now(), stats.clients, stats.newClients, stats.disconnectedClients, stats.unknownDisconnectedClients,
        stats.newErrors, stats.newGCSErrors, stats.sentMessages, stats.savedMessagesSent, stats.savedMessages
      ].join(",");

      console.log(JSON.stringify(stats));

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
  }
};
