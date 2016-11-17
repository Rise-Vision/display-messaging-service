const assert = require("assert"),
      request = require("request"),
      serverKey = process.env.SERVERKEY,
      baseUrl = process.env.SERVER_URL || "https://display-messaging.risevision.com",
      serverUrl = baseUrl + ":" + (process.env.TRUSTED_PORT || "3001"),
      clientUrl = baseUrl + ":" + (process.env.UNTRUSTED_PORT || "443"),
      wsClient = require("../ws-client.js");

describe("HTTP server", function() {
  this.timeout(5000);

  it("reject a request because of invalid server key", ()=>{
    let requestUrl = serverUrl;

    return new Promise((res)=>{
      request(requestUrl, (err, resp, body)=>{
        if(resp.statusCode === 403 && body === "Invalid server key") {
          res();
        }
        else {
          console.log(err);
        }
      });
    });
  });

  it("reject a request because of missing display id", ()=>{
    let requestUrl = serverUrl + "?sk=" + serverKey;

    return new Promise((res)=>{
      request(requestUrl, (err, resp, body)=>{
        if(resp.statusCode === 400 && body === "Display id is required") {
          res();
        }
      });
    });
  });

  it("reject a request because of invalid display id", ()=>{
    let displayId = String(Math.random()),
        displayUrl = clientUrl + "?displayId=" + displayId,
        fakeDisplay = wsClient.createClient(displayUrl),
        requestUrl = serverUrl + "?sk=" + serverKey + "&did=invalid";

    return new Promise((res)=>{
      fakeDisplay.on("open", ()=>{
        request(requestUrl, (err, resp, body)=>{
          if(resp.statusCode === 404 && body === "Display id not found") {
            fakeDisplay.end();
            res();
          }
        });
      });
    });
  });

  it("reject a request because of invalid message", ()=>{
    let displayId = String(Math.random()),
        displayUrl = clientUrl + "?displayId=" + displayId,
        fakeDisplay = wsClient.createClient(displayUrl),
        requestUrl = serverUrl + "?sk=" + serverKey + "&did=" + displayId + "&msg=invalid";

    return new Promise((res)=>{
      fakeDisplay.on("open", ()=>{
        setTimeout(()=>{
          request(requestUrl, (err, resp, body)=>{
            if(resp.statusCode === 400 && body === "Invalid message type") {
              fakeDisplay.end();
              res();
            }
          });
        }, 200);
      });
    });
  });
});
