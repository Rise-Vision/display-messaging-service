const cluster = require("cluster");
const koa = require("koa");
const stats = require("./stats.js");
let koaApp = koa();
let idsByWorker = {};

module.exports = {
  setup(server, argv, cluster) {
    let numWorkers = argv.workers;

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
      }
      else if (message.msg === "screenshot-saved" || message.msg === "screenshot-failed") {
        let destWorkerId = findWorkerFor(message.clientId);

        if(destWorkerId) {
          cluster.workers[destWorkerId].send(message);
        }
        else{
          console.log("Destination clientId does not exist");
        }
      }
      else if (message.msg === "presence-request") {
        worker.send({
          result: message.displayIds.map((id)=>{return {[id]: Boolean(findWorkerFor(id))};}),
          msg: "presence-result",
          clientId: message.clientId
        });
      }
    });

    setupRequestHandler(argv.serverkey);
  },
  requestListener() {
    return koaApp.callback();
  }
};

function findWorkerFor(id) {
  return Object.keys(idsByWorker).find((workerId)=>{
    return idsByWorker[workerId][id];
  });
}

function setupRequestHandler(serverKey) {
  var handlers = [ createForwardHandler("content_updated"),
                   createForwardHandler("reboot", "reboot-request"),
                   createForwardHandler("restart", "restart-request"),
                   createScreenshotHandler() ];

  console.log("Setting up", serverKey);

  koaApp.on("error", function(err) {
    console.log("Server error", err);
  });

  koaApp.use(function *() {
    let params = this.request.query;

    this.status = 500;

    if(params.sk != serverKey) {
      this.status = 403;
      this.body = "Invalid server key";
    }
    else if(!params.did) {
      this.body = "Display id is required";
    }
    else {
      let worker = findWorkerFor(params.did);
      let handler = handlers.find((handler)=>{ return handler.message === params.msg; });

      if(worker === undefined) {
        this.body = "Display id not found";
      }
      else if(handler === undefined) {
        this.body = "Invalid message type";
      }
      else {
        let reason = handler.isNotValid && handler.isNotValid(this);

        if(reason) {
          this.body = reason;
        }
        else {
          handler.handle(this, cluster.workers[worker]);
          this.status = 200;
          this.body = "Message processed";
        }
      }
    }
  });
}

function createForwardHandler(message, newMessageName) {
  return {
    message: message,
    handle: (context, worker)=>{
      var params = context.request.query;

      worker.send(Object.assign({}, params, {
        displayId: params.did,
        msg: newMessageName || message
      }));
    }
  };
}

function createScreenshotHandler() {
  return {
    message: "screenshot",
    isNotValid: (context)=>{
      var params = context.request.query;

      if(params.msg === "screenshot" && (!params.did || !params.cid || !params.url)) {
        return "did, cid and url are required for screenshot requests";
      }
      else {
        return null;
      }
    },
    handle: (context, worker)=>{
      var params = context.request.query;

      worker.send({
        msg: "screenshot-request",
        displayId: params.did,
        url: params.url,
        clientId: params.cid
      });
    }
  };
}
