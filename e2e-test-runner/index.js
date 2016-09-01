const path = require("path"),
hibernateTimeMS = 1000 * 60 * 60,
everyFiveMinutesMS = 1000 * 60 * 5,
stackDriver = require("./stack-driver.js"),
Mocha = require("mocha"),
testFiles = [
  path.join(__dirname, "..", "test", "e2e", "presence.js"),
  path.join(__dirname, "..", "test", "e2e", "maintains-connection.js")
];

let runningIntervalHandle;

restartTesting();

function restartTesting(delayMS = 0) {
  clearInterval(runningIntervalHandle);
  setTimeout(()=>{
    runningIntervalHandle = setInterval(runTests, everyFiveMinutesMS);
  }, delayMS);
}

function runTests() {
  mocha = new Mocha({fullStackTrace: true});

  testFiles.forEach((file)=>{
    delete require.cache[require.resolve(file)];
    mocha.addFile(file);
  });

  let runner = mocha.run((failCount)=>{
    stackDriver.createTimeSeriesEntry("passcount", runner.total - failCount);
    if (failCount) {
      stackDriver.createTimeSeriesEntry("failcount", failCount);
      restartTesting(hibernateTimeMS)
    }
  });
}
