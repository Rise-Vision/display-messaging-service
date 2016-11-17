const assert = require("assert"),
fork = require("child_process").fork,
httpFetch = require("rise-common-electron").network.httpFetch,
wsClient = require("../ws-client.js");

describe("Echo display message", function() {
  this.timeout(5000);
  let server;

  function startServer(workers) {
    server = fork("./server.js", ["--nossl", "--workers=" + workers, "--serverkey=ABC", "--untrustedListenerPort=3000"]);
    return new Promise((res)=>{
      setTimeout(res, 500);
    });
  }

  afterEach("stop server", ()=>{
    server.kill();
  });

  it("Echoes restart message to the display and asserts key is not present", ()=>{
    return startServer(1)
    .then(()=>{
      let display = wsClient.createClient("http://127.0.0.1:3000/?displayId=12345", false);

      return new Promise((res)=>{
        display.on("open", ()=>{
          console.log("display opened");
          httpFetch("http://127.0.0.1:3001/?sk=ABC&did=12345&msg=restart");
        });

        display.on("data", function(data) {
          console.log(JSON.stringify(data, null, 2));
          assert(!data.sk);
          res();
        });

        display.open();
      });
    });
  });
});
