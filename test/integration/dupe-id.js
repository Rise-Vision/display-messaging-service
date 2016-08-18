const assert = require("assert"),
fork = require("child_process").fork,
wsClient = require("../ws-client.js");

describe("Duplicate Display Id", function() {
  this.timeout(2000);
  let server;

  function startServer(workers) {
    server = fork("./server.js", ["--nossl", "--workers=" + workers, "--serverkey=ABC"]);
    return new Promise((res)=>{
      setTimeout(res, 500);
    });
  }

  afterEach("stop server", ()=>{
    server.kill();
  });

  function runTest() {
    let firstDisplay = wsClient.createClient("http://127.0.0.1:3000/?displayId=12345"),
    secondDisplay;

    firstDisplay.on("open", ()=>{
      console.log("connecting second display");
      secondDisplay = wsClient.createClient("http://127.0.0.1:3000/?displayId=12345");
    });

    return new Promise((res)=>{
      firstDisplay.on("data", function(data) {
        if (data.msg === "duplicate-display-id") {
          firstDisplay.end();
          secondDisplay.end();
          res();
        }
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
