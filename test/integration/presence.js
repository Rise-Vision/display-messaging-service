const assert = require("assert"),
fork = require("child_process").fork,
wsClient = require("../ws-client.js");

describe("Presence", function() {
  this.timeout(2000);
  let server;

  beforeEach("start server", ()=>{
    server = fork("./server.js", ["--nossl", "--workers=1", "--serverkey=ABC"]);
    return new Promise((res)=>{
      setTimeout(res, 500);
    });
  });

  afterEach("stop server", ()=>{
    server.kill();
  });

  it("responds to a presence check for a connected display", ()=>{
    let fakeSender = wsClient.createClient("http://127.0.0.1:3001/?serverkey=ABC"),
    fakeDisplay = wsClient.createClient("http://127.0.0.1:3000"),
    displayId = "12345";

    fakeSender.on("error", (err)=>{console.error(err);});

    fakeDisplay.on("open", ()=>{
      console.log("Display connection opened");
      fakeDisplay.write({msg: "register-display-id", displayId});

      fakeDisplay.on("data", (data)=>{
        console.log(data);
        if (data.msg === "display-registered" && data.displayId === "12345") {
          fakeSender.write({msg: "presence-request", displayId});
        }
      });
    });

    return new Promise((res)=>{
      fakeSender.on("data", function(data) {
        console.log(data);
        if (data.msg === "presence-detected") {
          fakeDisplay.end();
          fakeSender.end();
          res();
        }
      });
    });
  });

  it("responds to a presence check for a disconnected display", ()=>{
    let fakeSender = wsClient.createClient("http://127.0.0.1:3001/?serverkey=ABC"),
    displayId = "12345";

    return new Promise((res)=>{
      fakeSender.on("data", function(data) {
        if (data.msg === "presence-not-detected") {res();}
      });

      fakeSender.write({msg: "presence-request", displayId});
    });
  });
});
