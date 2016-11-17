const displayId = "E2ELONGCONNECTION",
      baseUrl = process.env.SERVER_URL || "https://display-messaging.risevision.com",
      clientUrl = baseUrl + ":" + (process.env.UNTRUSTED_PORT || "443"),
      displayUrl = clientUrl + "/?displayId=" + displayId,
      wsClient = require("../ws-client.js");

let fakeDisplay = wsClient.createClient(displayUrl);
fakeDisplay.on("data", (data)=>{
  if (data.msg === "duplicate-display-id") {
    console.log("duplicate display id received " + require("util").inspect(data));
    process.exit();
  }
});
