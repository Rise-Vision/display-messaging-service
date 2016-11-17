const assert = require("assert"),
fork = require("child_process").fork,
wsClient = require("../ws-client.js");

describe("Duplicate Display Id", function() {
  this.timeout(2000);
  let server;

  function startServer(workers) {
    server = fork("./server.js", ["--nossl", "--workers=" + workers, "--serverkey=ABC", "--untrustedListenerPort=3000"]);
    return new Promise((res)=>{
      setTimeout(res, 500);
    });
  }

  afterEach("stop server", ()=>{
    server.kill();
  });

  function runTest() {
    let firstDisplay = wsClient.createClient("http://127.0.0.1:3000/?displayId=12345&machineId=test"),
    secondDisplay,
    browserClient = wsClient.createClient("http://127.0.0.1:3000/");

    firstDisplay.on("open", ()=>{
      console.log("connecting second display");
      secondDisplay = wsClient.createClient("http://127.0.0.1:3000/?displayId=12345&machineId=test");
    });

    return new Promise((res)=>{
      firstDisplay.on("data", function(data) {
        console.log(data);
        if (data.msg === "duplicate-display-id" && data.machineId === "test") {
          res();
        }
      });
    })
    .then(()=>{
      browserClient.write({msg: "presence-request", "displayIds": ["12345"]});

      return new Promise((res)=>{
        browserClient.on("data", function(data) {
          if (data.msg === "presence-result" && data.result[0]["12345"]) {
            firstDisplay.end();
            secondDisplay.end();
            res();
          }
        });
      });
    });
  }

  it("receives a duplicate display id message as the original display on the same worker", ()=>{
    return startServer(1)
    .then(()=>{
      return runTest();
    });
  });

  it("receives a duplicate display id message as the original display on a different worker", ()=>{
    return startServer(2)
    .then(()=>{
      return runTest();
    });
  });
});
