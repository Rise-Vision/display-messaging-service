const koa = require("koa");
const stats = require("./stats.js");
let app = koa();
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

    setupRequestHandler(argv.serverKey);
  },
  requestListener() {
    return app.callback();
  }
};

function findWorkerFor(id) {
  return Object.keys(idsByWorker).find((workerId)=>{
    return idsByWorker[workerId][id];
  });
}

function setupRequestHandler(serverKey) {
  var handlers = [ new ForwardHandler("content_updated"),
                   new ForwardHandler("reboot", "reboot-request"),
                   new ForwardHandler("restart", "restart-request"),
                   new ScreenshotHandler() ];

  app.use(function *() {
    let params = this.request.query;

    if(params.sk != serverKey) {
      this.throw(403, "Invalid server key");
    }
    else if(!params.did) {
      this.throw(500, "Display id is required");
    }
    else {
      var worker = findWorkerFor(params.cid);
      var handler = handlers.find((handler)=>{ return handler.message === params.msg; });

      if(!worker) {
        this.throw(500, "Display id not found");
      }
      else if(!handler) {
        this.throw(500, "Invalid message type");
      }
      else {
        var reason = handler.isNotValid && !handler.isNotValid(this);

        if(reason) {
          this.throw(500, reason);
        }
        else {
          handler.handle(this, worker);
          this.status = 200;
          this.body = "Message processed";
        }
      }
    }
  });
}

function ForwardHandler(message, newMessageName) {
  this.message = message;
  this.handle = (context, worker)=>{
    var params = context.request.query;

    worker.send(Object.assign({}, params, {
      displayId: params.cid,
      message: newMessageName || message
    }));
  };
}

function ScreenshotHandler() {
  this.message = "screenshot";
  this.isNotValid = (context)=>{
    var params = context.request.query;

    if(params.msg === "screenshot" && (!params.cid || !params.url)) {
      return "cid and url are required for screenshot requests";
    }
    else {
      return null;
    }
  };
  this.handler = (context, worker)=>{
    var params = context.request.query;

    worker.send({
      msg: "screenshot-request",
      displayId: params.cid,
      url: params.url,
      clientId: params.clientid
    });
  };
}
