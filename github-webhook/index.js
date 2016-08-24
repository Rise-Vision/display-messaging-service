const child_process = require("child_process");
const koa = require("koa");
const bodyParser = require("koa-bodyparser");
const path = require("path");
const argv = require("yargs").argv;


const port = 8080;
const app = koa();
app.use(bodyParser());

app.use(function *(){
  if (this.request.url === "/github-web-hook") {
    this.response.body = "OK";
  }
});

app.use(function *(){
  if (this.request.body.ref === "refs/heads/master") {
    child_process.exec(path.join(__dirname, `update-version.sh ${argv._[0]}`));
  }
});

app.listen(port);
