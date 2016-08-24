const assert = require("assert"),
      request = require("request"),
      serverKey = process.env.SERVERKEY,
      baseUrl = process.env.SERVER_URL || "https://display-messaging.risevision.com",
      serverUrl = baseUrl + ":3001",
      clientUrl = baseUrl + ":3000",
      wsClient = require("../ws-client.js");

describe("Screenshot", function() {
  this.timeout(5000);

  it("relays a client's screenshot request to a display, and the success response back to the client", ()=>{
    let displayId = String(Math.random()),
        displayUrl = clientUrl + "?displayId=" + displayId,
        fakeDisplay = wsClient.createClient(displayUrl),
        clientAppId = String(Math.random()),
        clientAppUrl = clientUrl + "?displayId=" + clientAppId,
        fakeClient = wsClient.createClient(clientAppUrl),
        screenshotParams = "&did=" + displayId + "&cid=" + clientAppId + "&url=test",
        screenshotUrl = serverUrl + "?sk=" + serverKey + screenshotParams + "&msg=screenshot",
        displayConnected = new Promise((res)=>{ fakeDisplay.on("open", res); }),
        clientConnected = new Promise((res)=>{ fakeClient.on("open", res); });

    return Promise.all([displayConnected, clientConnected])
      .then(()=>{
        return new Promise((res)=>{
          request(screenshotUrl, (err, res, body)=>{
            if(err || res.statusCode !== 200) {
              console.log("Screenshot request error", err || res.statusCode, body);
            }
          });

          fakeDisplay.on("data", (data)=>{
            if (data.msg === "screenshot-request" && data.displayId === displayId) {
              fakeDisplay.write({ msg: "screenshot-saved", displayId: displayId, clientId: clientAppId });
            }
          });

          fakeClient.on("data", (data)=>{
            if (data.msg === "screenshot-saved" &&
                data.displayId === displayId && data.clientId === clientAppId) {
              fakeDisplay.end();
              fakeClient.end();
              res();
            }
          });
      });
    });
  });

  it("relays a client's screenshot request to a display, and the failure response back to the client", ()=>{
    let displayId = String(Math.random()),
        displayUrl = clientUrl + "?displayId=" + displayId,
        fakeDisplay = wsClient.createClient(displayUrl),
        clientAppId = String(Math.random()),
        clientAppUrl = clientUrl + "?displayId=" + clientAppId,
        fakeClient = wsClient.createClient(clientAppUrl),
        screenshotParams = "&did=" + displayId + "&cid=" + clientAppId + "&url=test",
        screenshotUrl = serverUrl + "?sk=" + serverKey + screenshotParams + "&msg=screenshot",
        displayConnected = new Promise((res)=>{ fakeDisplay.on("open", res); }),
        clientConnected = new Promise((res)=>{ fakeClient.on("open", res); });

    return Promise.all([displayConnected, clientConnected])
      .then(()=>{
        return new Promise((res)=>{
          request(screenshotUrl, (err, res, body)=>{
            if(err || res.statusCode !== 200) {
              console.log("Screenshot request error", err || res.statusCode, body);
            }
          });

          fakeDisplay.on("data", (data)=>{
            if (data.msg === "screenshot-request" && data.displayId === displayId) {
              fakeDisplay.write({ msg: "screenshot-failed", displayId: displayId, clientId: clientAppId });
            }
          });

          fakeClient.on("data", (data)=>{
            if (data.msg === "screenshot-failed" &&
                data.displayId === displayId && data.clientId === clientAppId) {
              fakeDisplay.end();
              fakeClient.end();
              res();
            }
          });
      });
    });
  });
});
