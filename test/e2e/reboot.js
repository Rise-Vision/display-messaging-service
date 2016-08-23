const assert = require("assert"),
      request = require("request"),
      serverKey = process.env.SERVERKEY,
      baseUrl = process.env.SERVER_URL || "https://display-messaging.risevision.com",
      serverUrl = baseUrl + ":3001",
      clientUrl = baseUrl + ":3000",
      wsClient = require("../ws-client.js");

describe("Reboot", function() {
  this.timeout(5000);

  it("relays a reboot message to a display", ()=>{
    let displayId = String(Math.random()),
        displayUrl = clientUrl + "?displayId=" + displayId,
        fakeDisplay = wsClient.createClient(displayUrl),
        rebootUrl = serverUrl + "?sk=" + serverKey + "&did=" + displayId + "&msg=reboot";

    return new Promise((res)=>{
      fakeDisplay.on("open", ()=>{
        fakeDisplay.on("data", (data)=>{
          if (data.msg === "reboot-request" && data.displayId === displayId) {
            fakeDisplay.end();
            res();
          }
        });

        request(rebootUrl, (err, res, body)=>{
          if(err || res.statusCode !== 200) {
            console.log("Reboot request error", err || res.statusCode);
          }
        });
      });
    });
  });
});
