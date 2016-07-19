const assert = require("assert"),
fork = require("child_process").fork,
wsClient = require("./ws-client.js");

describe("Presence", function() {
  this.timeout(2000);
  let server;

  beforeEach("start server", ()=>{
    server = fork("./server.js", ["--workers=1"]);
  });

  afterEach("stop server", ()=>{
    server.kill();
  });

  it("responds to a presence check for a connected display", ()=>{
    let fakeDisplay = wsClient.createClient("http://localhost:3000");
    let fakeSender = wsClient.createClient("http://localhost:3001/?serverkey=ABC"),
    displayId = "12345";

    fakeDisplay.on("open", ()=>{
      console.log("Display connection opened");
      fakeDisplay.write({msg: "register-display-id", displayId});
      fakeSender.write({msg: "presence-request", displayId});
    });

    return new Promise((res)=>{
      fakeSender.on("data", function(data) {
        if (data.msg === "presence-detected") {
          fakeDisplay.end();
          fakeSender.end();
          res();
        }
      });
    });
  });

  it("responds to a presence check for a disconnected display", ()=>{
    let fakeSender = wsClient.createClient("http://localhost:3001/?serverkey=ABC"),
    displayId = "12345";

    return new Promise((res)=>{
      fakeSender.on("data", function(data) {
        if (data.msg === "presence-not-detected") {res();}
      });

      fakeSender.write({msg: "presence-request", displayId});
    });
  });
});
