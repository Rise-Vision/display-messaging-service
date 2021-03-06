const redis = require("redis");
const utils = require("./utils");

let client = null;

function isValidDisplayId(displayId) {
  return displayId &&
    displayId.indexOf(".") === -1 &&
    (displayId.length === 12 || displayId.length === 36);
}

module.exports = {
  init() {
    return new Promise((res)=>{
      client = redis.createClient();

      client.on("error", (err)=>{
        console.log("Redis error", err);
      });

      client.on("ready", ()=>{
        res();
      });
    });
  },
  getDisplays() {
    return new Promise((res, rej)=>{
      client.sort("displays", "by", "nosort", "get", "#", "get", "displays:*:lastConnectionTime", (err, reply)=>{
        if(!err) {
          let displays = utils.partition(reply, 2).map(arr => ({
            id: arr[0],
            lastConnectionTime: arr[1]
          }));

          res(displays);
        }
        else {
          console.log("Error loading displays", err);
          rej([]);
        }
      });
    });
  },
  registerConnection(displayIds, time) {
    let multi = client.multi();
    let date = new Date().toISOString().substring(0, 10);

    displayIds
      .filter(displayId => isValidDisplayId(displayId))
      .forEach(displayId => {
        multi.sadd("displays", displayId);
        multi.set(`displays:${displayId}:lastConnectionTime`, String(time));
        multi.incr(`displays:${displayId}:connections:${date}`);
    });

    multi.exec();
  },
  registerDisconnection(displayIds, time) {
    let multi = client.multi();

    time = time || Date.now();

    displayIds
      .filter(displayId => isValidDisplayId(displayId))
      .forEach(displayId => {
        multi.set(`displays:${displayId}:lastConnectionTime`, String(time));
    });

    multi.exec();
  }
};
