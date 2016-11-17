const assert = require("assert"),
      request = require("request"),
      serverKey = process.env.SERVERKEY,
      baseUrl = process.env.SERVER_URL || "https://display-messaging.risevision.com",
      serverUrl = baseUrl + ":" + (process.env.TRUSTED_PORT || "3001"),
      clientUrl = baseUrl + ":" + (process.env.UNTRUSTED_PORT || "443"),
      wsClient = require("../ws-client.js");

describe("Content update", function() {
  this.timeout(5000);

  it("relays a content update message to a display", ()=>{
    let displayId = String(Math.random()),
        displayUrl = clientUrl + "?displayId=" + displayId,
        fakeDisplay = wsClient.createClient(displayUrl),
        contentUpdateUrl = serverUrl + "?sk=" + serverKey + "&did=" + displayId + "&msg=content_update";

    return new Promise((res)=>{
      fakeDisplay.on("open", ()=>{
        fakeDisplay.on("data", (data)=>{
          if (data.msg === "content-update" && data.displayId === displayId) {
            fakeDisplay.end();
            res();
          }
        });

        request(contentUpdateUrl, (err, res, body)=>{
          if(err || res.statusCode !== 200) {
            console.log("Content update request error", err || res.statusCode);
          }
        });
      });
    });
  });
});
