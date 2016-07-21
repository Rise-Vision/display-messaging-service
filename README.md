# Display Messaging Service

## Messaging protocol
#### Listener

Registration
``` js
{"register-display-id", displayId}
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
Currently hard coded to ABC
``` js
wsClient.createClient("http://localhost:3001/?serverkey=ABC"),
```

## Integration tests

``` bash
npm run integration
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
