## Display Messaging Github Webhook Service

This service allows a server to listen for pushes to the master branch of this repo and update the local service in response.

### How it works

- Github calls a webhook running on this server

- If the call indicates a push to master:
    - the Webhook service pulls the latest version
    - the Webhook service reinstalls  node modules
    - the Webhook service restarts the target service

### Setup

To set up this service, take a look at [install.sh](../e2e-test-runner/install.sh). Specifically, note the following:

- It's important that the user running the webhook is able to restart the target service as root.

- The Webhook service needs to be initialized with the target service as a parameter. Example: `display-messaging-github-webhook@target-service`