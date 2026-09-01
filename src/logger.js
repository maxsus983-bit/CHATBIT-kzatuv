const pino = require("pino");
const fs = require("fs");
const path = require("path");

fs.mkdirSync(path.resolve("logs"), { recursive: true });

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: {
    targets: [
      { target: "pino/file", options: { destination: 1 } },
      { target: "pino/file", options: { destination: path.resolve("logs/agent.log"), mkdir: true } }
    ]
  }
});

module.exports = logger;
