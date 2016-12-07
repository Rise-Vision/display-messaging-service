const cluster = require("cluster");
const koa = require("koa");
let koaApp = koa();
let clientsById = {}; // { id, workerId, machineId, lastConnectionTime }

module.exports = {
  setup(server, argv, cluster) {
    let numWorkers = argv.workers;

    console.log("Master cluster setting up " + numWorkers + " workers...");

    for(let i = 0; i < numWorkers; i++) {
      cluster.fork();
    }

    cluster.on("online", function(worker) {
      console.log("Worker " + worker.process.pid + " is online");
    });

    cluster.on("exit", function(worker, code, signal) {
      console.log("Worker " + worker.process.pid + " died with code: " + code + ", and signal: " + signal);

      Object.keys(clientsById)
        .map(id => clientsById[id])
        .filter(client => client.workerId === worker.id)
        .map(client => {
          client.workerId = null;
          client.lastConnectionTime = Date.now();
        });

      let newWorker = cluster.fork();
      console.log("Starting a new worker " + newWorker.process.pid);
    });

    cluster.on("message", (worker, message)=>{
      if(message.connection) {
        let displayId = message.connection.id;
        let machineId = message.connection.machineId;
        let display = clientsById[displayId];

        if(!display) {
          display = clientsById[displayId] = {};
        }

        if (display.workerId && display.workerId !== String(worker.id)) {
          console.log(`sending duplicate id message for ${displayId} to worker ${worker.id}`);
          cluster.workers[display.workerId].send({
            "msg": "duplicate-display-id",
            "displayId": displayId,
            "machineId": machineId
          });
        }

        display.id = displayId;
        display.workerId = worker.id;
        display.machineId = machineId;
        display.lastConnectionTime = Date.now();
      }
      else if(message.disconnection) {
        let displayId = message.disconnection.id;
        let display = clientsById[displayId];

        if(displayId) {
          display.workerId = null;
          display.lastConnectionTime = Date.now();
        }
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
          msg: "presence-result",
          clientId: message.clientId,
          result: message.displayIds.map((id)=>{
            let display = clientsById[id];
            let response = { [id]: !!display.workerId };

            if(display.workerId) {
              response.lastConnectionTime = Date.now();
            }

            return response;
          })
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
  return clientsById[id] && clientsById[id].workerId;
}

function setupRequestHandler(serverKey) {
  var handlers = [ createForwardHandler("content_update", "content-update"),
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
      this.status = 400;
      this.body = "Display id is required";
    }
    else {
      let worker = findWorkerFor(params.did);
      let handler = handlers.find((handler)=>{ return handler.message === params.msg; });

      if(!worker) {
        this.status = 404;
        this.body = "Display id not found";
      }
      else if(handler === undefined) {
        this.status = 400;
        this.body = "Invalid message type";
      }
      else {
        let reason = handler.isNotValid && handler.isNotValid(this);

        if(reason) {
          this.status = 400;
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
      delete params.sk;

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
