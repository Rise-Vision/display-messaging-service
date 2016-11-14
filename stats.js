const cluster = require("cluster");
const sd = require("./e2e-test-runner/stack-driver.js");

var stats = resetIntervalStats();

function resetIntervalStats() {
  return {
    intervalClientCount: 0,
    intervalErrorCount: 0,
    intervalMessageCount: 0
  };
}

module.exports = {
  forWorkers() {
    process.on("message", (message)=>{
      if (message !== "collect-stats") {return;}
      process.send({ stats: Object.assign({}, stats)});
      stats = resetIntervalStats();
    });
  },
  incrementCount(stat) {stats[stat] += 1;},
  decrementCount(stat) {stats[stat] -= 1;},
  forMaster() {
    stats.totalClientCount = 0;

    cluster.on("message", (worker, message)=>{
      if(message.stats) {
        module.exports.updateFromWorker(message.stats);
      }
    });

    setInterval(module.exports.collectStatsFromWorkers, 1000 * 60 * 5);
  },
  collectStatsFromWorkers() {
    stats.intervalUpdates = 0;

    Object.keys(cluster.workers).forEach((id)=>{
      cluster.workers[id].send("collect-stats");
    });
  },
  updateFromWorker(workerStats) {
    stats.totalClientCount += workerStats.intervalClientCount;
    stats.intervalClientCount += workerStats.intervalClientCount;
    stats.intervalErrorCount += workerStats.intervalErrorCount;
    stats.intervalMessageCount += workerStats.intervalMessageCount;
    stats.intervalUpdates += 1;
    if (stats.intervalUpdates === Object.keys(cluster.workers).length) {
      module.exports.sendToStackdriver(Object.assign({}, stats));
      stats = Object.assign(stats, resetIntervalStats());
    }
  },
  sendToStackdriver(sdStats) {
    if(process.env.STAGING_MESSAGING !== "true") {
      sd.createTimeSeriesEntry("stats/total/clients", sdStats.totalClientCount);
      sd.createTimeSeriesEntry("stats/interval/clients", sdStats.intervalClientCount);
      sd.createTimeSeriesEntry("stats/interval/errors", sdStats.intervalErrorCount);
      sd.createTimeSeriesEntry("stats/interval/messages", sdStats.intervalMessageCount);
    }
  }
};
