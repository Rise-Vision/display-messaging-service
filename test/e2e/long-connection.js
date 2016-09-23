const displayId = "E2ELONGCONNECTION",
displayUrl = "https://display-messaging.risevision.com:3000/?displayId=" + displayId,
wsClient = require("../ws-client.js");

let fakeDisplay = wsClient.createClient(displayUrl);
fakeDisplay.on("data", (data)=>{
  if (data.msg === "duplicate-display-id") {
    console.log("duplicate display id received " + require("util").inspect(data));
    process.exit();
  }
});
