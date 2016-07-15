const assert = require("assert"),
fork = require("child_process").fork,
wsClient = require("./ws-client.js");

describe("Presence", function() {
  this.timeout(9000);
  let server;

  beforeEach("start server", ()=>{
    server = fork("./server.js", ["--workers=1"]);
  });

  afterEach("stop server", ()=>{
    server.kill();
  });

  it("responds to a presence check", ()=>{
    let fakeDisplay = wsClient.createClient("http://localhost:3000");
    let fakeServer = wsClient.createClient("http://localhost:3000");
    let displayId = "12345";

    fakeDisplay.on("open", ()=>{
      console.log("Display connection opened");
      fakeDisplay.send("display-init", {displayId});
      fakeServer.send("presence-request", {displayId});
    });

    fakeServer.on("open", ()=>{
      fakeServer.send("server-init", {});
    });

    return new Promise((res)=>{
      fakeDisplay.on("presence-request", function(data) {
        console.log("Presence check received");
        res();
      });
    });
  });
});
