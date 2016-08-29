var stats = resetStats();

function resetStats() {
  return {
    clients: 0,
    newClients: 0,
    disconnectedClients: 0,
    unknownDisconnectedClients: 0,
    newErrors: 0,
    sentMessages: 0,
    savedMessagesSent: 0,
    savedMessages: 0
  };
}

module.exports = {
  forMaster() {
    var fs = require("fs");
    setInterval(function () {
      var currStats = [
        Date.now(), stats.clients, stats.newClients, stats.disconnectedClients, stats.unknownDisconnectedClients,
        stats.newErrors, stats.newGCSErrors, stats.sentMessages, stats.savedMessagesSent, stats.savedMessages
      ].join(",");

      fs.appendFile("stats.csv", currStats + "\n", function (err) {
        if(err) { console.log("Error saving stats", err); }
      });

      stats = resetStats();
    }, 5000);
  },
  forWorkers() {
    setInterval(function () {
      console.log(stats);
      process.send({ stats: stats });

      stats = resetStats();
    }, 1000);
  },
  incrementCount(stat) {stats[stat] += 1;},
  decrementCount(stat) {stats[stat] -= 1;},
  updateFromWorker(workerStats) {
    stats.clients += (workerStats.newClients - workerStats.disconnectedClients);
    stats.newClients += workerStats.newClients;
    stats.disconnectedClients += workerStats.disconnectedClients;
    stats.unknownDisconnectedClients += workerStats.unknownDisconnectedClients;
    stats.newErrors += workerStats.newErrors;
    stats.sentMessages += workerStats.sentMessages;
    stats.savedMessagesSent += workerStats.savedMessagesSent;
    stats.savedMessages += workerStats.savedMessages;
  }
};
