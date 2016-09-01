const google = require("googleapis"),
stackDriverMonitoring = google.monitoring("v3");

let authClient;

google.auth.getApplicationDefault((err, auth)=>{
  if (err) {return console.log(err);}
  if (auth.createScopedRequired && auth.createScopedRequired()) {
    authClient = auth.createScoped(["https://www.googleapis.com/auth/cloud-platform"]);
  } else {
    authClient = auth;
  }
});

module.exports = {
  createTimeSeriesEntry(metric = "passcount", value = 1, time = new Date().toISOString()) {
    let request = {
      name: "projects/display-messaging-service",
      resource: {
        "timeSeries": [
        {
          "metric": {
            "type": `custom.googleapis.com/e2eruns/${metric}`,
          },
          "resource": {
            "type": "global",
            "labels": {
              "project_id": "display-messaging-service"
            }
          },
          "points": [
          {
            "interval": {
              "endTime": time
            },
            "value": {
              "int64Value": value
            }
          }
          ]
        }
        ]
      },
      auth: authClient
    };

    stackDriverMonitoring.projects.timeSeries.create(request, (err, result)=>{
      console.log(err || result);
    });
  }
};
