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
    let fakeBrowser = wsClient.createClient("http://127.0.0.1:3000/"),
    fakeDisplay = wsClient.createClient("http://127.0.0.1:3000/?displayId=12345");

    fakeBrowser.on("error", (err)=>{console.error(err);});

    fakeBrowser.on("data", function(data) {
      if (data.msg === "client-connected") {
        fakeBrowser.write({msg: "presence-request", "displayIds": ["12345"]});
      }
    });

    return new Promise((res)=>{
      fakeBrowser.on("data", function(data) {
        if (data.msg === "presence-result") {
          console.log(data);
          fakeDisplay.end();
          fakeBrowser.end();
          if (data.result.some((el)=>{return el["12345"]})) {res();}
        }
      });
    });
  });

  it("responds to a presence check for a disconnected display", ()=>{
    let fakeBrowser = wsClient.createClient("http://127.0.0.1:3000/"),
    fakeDisplay = wsClient.createClient("http://127.0.0.1:3000/?displayId=12345");

    fakeBrowser.on("error", (err)=>{console.error(err);});

    return Promise.all([
      new Promise((res)=>{
        fakeDisplay.on("open", ()=>{
          console.log("Display connection opened");
          res();
        });
      }),
      new Promise((res)=>{
        fakeBrowser.on("data", function(data) {
          if (data.msg === "client-connected") {
            res();
          }
        });
      })
    ])
    .then(()=>{
      fakeBrowser.write({msg: "presence-request", "displayIds": ["12345"]});

      return new Promise((res)=>{
        fakeBrowser.on("data", function(data) {
          if (data.msg === "presence-result") {
            fakeDisplay.end();
            console.log(data);
            if (data.result.some((el)=>{return el["12345"]})) {res();}
          }
        });
      });
    })
    .then(()=>{
      return new Promise((res)=>{
        fakeBrowser.on("data", function(data) {
          if (data.msg === "presence-result") {
            fakeBrowser.end();
            if (!data.result.some((el)=>{return el["12345"]})) {res();}
          }
        });
        fakeBrowser.write({msg: "presence-request", "displayIds": ["12345"]});
      });
    });
  });
});
