const stats = require("./stats.js");
let idsByWorker = {};

module.exports = {
  setup(numWorkers, cluster) {

    console.log("Master cluster setting up " + numWorkers + " workers...");
    for(let i = 0; i < numWorkers; i++) {
      cluster.fork();
    }

    cluster.on("online", function(worker) {
      console.log("Worker " + worker.process.pid + " is online");

      idsByWorker[worker.id] = {};
    });

    cluster.on("exit", function(worker, code, signal) {
      console.log("Worker " + worker.process.pid + " died with code: " + code + ", and signal: " + signal);

      delete idsByWorker[worker.id];

      let newWorker = cluster.fork();
      console.log("Starting a new worker " + newWorker.process.pid);
    });

    cluster.on("message", (worker, message)=>{
      if(message.connection) {
        let dupeIdWorker = findWorkerFor(message.connection.id);
        if (dupeIdWorker && dupeIdWorker !== String(worker.id)) {
          console.log("sending duplicate id message to " + worker.id);
          delete idsByWorker[dupeIdWorker][message.connection.id];
          cluster.workers[dupeIdWorker].send({"msg": "duplicate-display-id", "displayId": message.connection.id});
        }

        idsByWorker[worker.id][message.connection.id] = true;
      }
      else if(message.disconnection) {
        delete idsByWorker[worker.id][message.disconnection.id];
      }
      else if(message.stats) {
        stats.updateFromWorker(message.stats);
      } else if (message.msg === "screenshot-saved") {
        spark.write(message);
      } else if (message.msg === "presence-request") {
        worker.send({
          result: message.displayIds.map((id)=>{return {[id]: Boolean(findWorkerFor(id))};}),
          msg: "presence-result",
          clientId: message.clientId
        });
      }
    });
  }
};

function findWorkerFor(id) {
  return Object.keys(idsByWorker).find((workerId)=>{
    return idsByWorker[workerId][id];
  });
}
