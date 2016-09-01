const displayId = "E2ELONGCONNECTION",
displayUrl = "https://display-messaging.risevision.com:3000/?displayId=" + displayId,
wsClient = require("../ws-client.js");

let fakeDisplay = wsClient.createClient(displayUrl);
