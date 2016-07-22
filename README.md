# Display Messaging Service

## GCE Set Up
Add project metadata for environment variable `SERVERKEY`. Sender connections are then established with:

``` js
https://hostname:3001/?SERVERKEY=[key]
```

Create an image with the installed server.js, `systemctl enable` a systemd service for auto start (see display-messaging-service.service), and add server.{crt,key} as well as ca.crt (intermediate cert) files to server.js dir.

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
new Socket("https://localhost:3001/?serverkey=[key]"
```

Will emit `error` event (401) if key is not valid

## Integration tests

``` bash
npm run integration
```

## E2E tests
Make sure cloud firewall has a port open to 3001 for the machine acting as the sender

``` js
SERVERKEY=XXXXX mocha test/e2e/presence.js
```
