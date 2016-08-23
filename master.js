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
      var worker = findWorkerFor(params.did);
      var handler = handlers.find((handler)=>{ return handler.message === params.msg; });

      if(!worker) {
        this.body = "Display id not found";
      }
      else if(!handler) {
        this.body = "Invalid message type";
      }
      else {
        var reason = handler.isNotValid && !handler.isNotValid(this);

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

      if(params.msg === "screenshot" && (!params.did || !params.url)) {
        return "did and url are required for screenshot requests";
      }
      else {
        return null;
      }
    },
    handler: (context, worker)=>{
      var params = context.request.query;

      worker.send({
        msg: "screenshot-request",
        displayId: params.did,
        url: params.url,
        clientId: params.clientid
      });
    }
  };
}
