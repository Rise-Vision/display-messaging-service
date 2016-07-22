## NOT IMPLEMENTED
###### oauth server validation
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
