const assert = require("assert"),
serverUrl = "https://display-messaging.risevision.com:3001/?serverkey=" + process.env.SERVERKEY,
clientUrl = "https://display-messaging.risevision.com:3000",
wsClient = require("../ws-client.js");

describe("Presence", function() {
  this.timeout(5000);
  let server;

  it("responds to a presence check for a connected display", ()=>{
    let fakeSender = wsClient.createClient(serverUrl),
    fakeDisplay = wsClient.createClient(clientUrl),
    displayId = String(Math.random());

    fakeSender.on("error", (err)=>{console.error(err);});

    fakeDisplay.on("open", ()=>{
      console.log("Display connection opened");
      fakeDisplay.write({msg: "register-display-id", displayId});

      fakeDisplay.on("data", (data)=>{
        console.log(data);
        if (data.msg === "display-registered" && data.displayId === displayId) {
          console.log("sending presence request");
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
});
