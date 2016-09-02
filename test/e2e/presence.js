const assert = require("assert"),
browserUrl = "https://display-messaging.risevision.com:3000/",
displayId = "E2EPRES"+Math.random(),
displayUrl = "https://display-messaging.risevision.com:3000/?displayId=" + displayId,
wsClient = require("../ws-client.js");

describe("Presence", function() {
  this.timeout(5000);
  let fakeDisplay = wsClient.createClient(displayUrl, false);
  let fakeDisplayReady;
  let fakeDisplayPromise = new Promise((res)=>{fakeDisplayReady = res;});
  let fakeBrowser = wsClient.createClient(browserUrl, false);
  let presenceResult;
  let presencePromise = new Promise((res)=>{presenceResult = res;});

  fakeBrowser.on("error", console.error);
  fakeDisplay.on("error", console.error);
  fakeDisplay.on("open", fakeDisplayReady);

  fakeBrowser.on("data", function(data) {
    if (data.msg === "client-connected") {
      fakeBrowser.write({msg: "presence-request", "displayIds": [displayId]});
    }

    if (data.msg === "presence-result") {
      fakeDisplay.end();
      fakeBrowser.end();
      presenceResult(data.result);
    }
  });

  fakeDisplay.open();

  it("returns presence for a display", ()=>{
    return fakeDisplayPromise
    .then(()=>{
      fakeBrowser.open();
      return presencePromise;
    })
    .then((res)=>{
      assert(res.some((el)=>{return el[displayId];}));
    });
  });
});
