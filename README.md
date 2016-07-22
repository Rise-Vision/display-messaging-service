# Display Messaging Service

## GCE Set Up
Add project metadata for environment variable `SERVERKEY`. Sender connections are then established with:

``` js
http://hostname:3001/?SERVERKEY=[key]
```

Create an image with the installed server and `systemctl enable` a systemd service for auto start (see display-messaging-service.service).

Create instance template.  See create-template.sh

Create instance group.  See create-group.sh

## Messaging protocol
#### Listener

Registration
``` js
{"register-display-id", displayId}
{"display-registered", displayId}
```
Screenshot request
``` js
{"msg" "screenshot-request", displayId, filename}
{"msg": "screenshot-saved", displayId, filename}
```

#### Sender

Presence request
``` js
{"msg": "presence-request", displayId}
{"msg": "presence-detected", displayId}
{"msg": "presence-not-detected", displayId}
```

Screenshot request
``` js
{"msg" "screenshot-request", displayId, filename}
{"error": "display not connected", displayId}
{"msg": "screenshot-saved", displayId, filename}
```

## Sender Auth
Implemented as a simple serverkey as a url parameter

#### Server Key
``` js
new Socket("http://localhost:3001/?serverkey=[key]"
```

Will emit `error` event (401) if key is not valid

## Integration tests

``` bash
npm run integration
```

## E2E tests
Make sure cloud firewall has a port open to 3001 for the e2e server

``` js
SERVERKEY=XXXXX mocha test/e2e/presence.js
```

###### oauth server validation (not implemented)
###### Sender connection
``` js
const GoogleAuth = require("google-auth-library"),
gAuth = new GoogleAuth();
compute = new gAuth.Compute();

compute.getAccessToken((err, token)=>{
  //include token in websocket connect call
});
```

###### Sender token validation

``` js
const https = require("https"),
verificationURL = "https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=";

https.get(verificationURL + req.headers.authorization.split(" ")[1], (res)=>{
  res.setEncoding("utf8");
  res.on("data", (data)=>{
    assert(JSON.parse(data).issued_to);
  });
}).on("error", (err)=>{
  console.dir(err);
});
```
