const http = require("http");
const log = require("./logger");

function startHealthServer() {
  const port = Number(process.env.PORT);

  if (!port || Number.isNaN(port)) {
    return null;
  }

  const server = http.createServer((req, res) => {
    if (req.url === "/health" || req.url === "/") {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("ok");
      return;
    }

    res.writeHead(404);
    res.end();
  });

  server.listen(port, "0.0.0.0", () => {
    log.info("Health server listening", { port });
  });

  return server;
}

module.exports = { startHealthServer };
