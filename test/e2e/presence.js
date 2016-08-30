const assert = require("assert"),
browserUrl = "https://display-messaging.risevision.com:3000/",
displayId = "E2EPRES"+Math.random(),
displayUrl = "https://display-messaging.risevision.com:3000/?displayId=" + displayId,
wsClient = require("../ws-client.js");

describe("Presence", function() {
  this.timeout(5000);
  let fakeDisplay = wsClient.createClient(displayUrl),
  fakeBrowser = wsClient.createClient(browserUrl);

  fakeBrowser.on("error", (err)=>{console.error(err);});

  fakeBrowser.on("data", function(data) {
    if (data.msg === "client-connected") {
      fakeBrowser.write({msg: "presence-request", "displayIds": [displayId]});
    }
  });

  it("returns presence for a display", ()=>{
    return new Promise((res)=>{
      fakeBrowser.on("data", function(data) {
        if (data.msg === "presence-result") {
          fakeDisplay.end();
          fakeBrowser.end();
          if (data.result.some((el)=>{return el[displayId]})) {res();}
        }
      });
    });
  });
});
