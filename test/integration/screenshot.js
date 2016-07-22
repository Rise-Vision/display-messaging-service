const assert = require("assert"),
fork = require("child_process").fork,
wsClient = require("../ws-client.js");

describe("Presence", function() {
  this.timeout(3000);
  let server;

  beforeEach("start server", ()=>{
    server = fork("./server.js", ["--workers=1"]);
  });

  afterEach("stop server", ()=>{
    server.kill();
  });

  it("responds to a screenshot request for a connected display", ()=>{
    let fakeDisplay = wsClient.createClient("http://localhost:3000");
    let fakeSender = wsClient.createClient("http://localhost:3001/?serverkey=ABC"),
    displayId = "12345";

    fakeDisplay.on("open", ()=>{
      console.log("Display connection opened");
      fakeDisplay.write({msg: "register-display-id", displayId});
      fakeSender.write({msg: "screenshot-request", displayId, filename: "test-file"});
    });

    fakeDisplay.on("data", (data)=>{
      if (data.msg === "screenshot-request" && data.displayId === displayId && data.filename) {
        fakeDisplay.write(Object.assign({}, data, {msg: "screenshot-saved"}));
      }
    });

    return new Promise((res)=>{
      fakeSender.on("data", function(data) {
        if (data.msg === "screenshot-saved" &&
        data.displayId === "12345" &&
        data.filename === "test-file") {
          fakeDisplay.end();
          fakeSender.end();
          res();
        }
      });
    });
  });

  it("responds to a screenshot request for a disconnected display", ()=>{
    let fakeSender = wsClient.createClient("http://localhost:3001/?serverkey=ABC"),
    displayId = "12345";

    fakeSender.write({msg: "screenshot-request", displayId, filename: "test-file"});

    return new Promise((res)=>{
      fakeSender.on("data", function(data) {
        if (data.error === "display not connected" &&
        data.displayId === "12345") {
          fakeSender.end();
          res();
        }
      });
    });
  });
});
