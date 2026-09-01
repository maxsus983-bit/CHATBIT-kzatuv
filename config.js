require("dotenv").config();

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function bool(name, fallback = false) {
  const v = process.env[name];
  if (v == null) return fallback;
  return ["1", "true", "yes", "on"].includes(v.toLowerCase());
}

function int(name, fallback) {
  const v = Number(process.env[name]);
  return Number.isFinite(v) ? v : fallback;
}

const config = {
  minecraft: {
    host: required("MINECRAFT_HOST"),
    port: int("MINECRAFT_PORT", 19132),
    version: process.env.MINECRAFT_VERSION || "1.26.30",
    username: process.env.MINECRAFT_USERNAME || "AI_BOT",
    offline: bool("MINECRAFT_OFFLINE", false)
  },
  telegram: {
    token: required("TELEGRAM_BOT_TOKEN"),
    ownerId: String(required("TELEGRAM_OWNER_ID"))
  },
  openrouter: {
    key: process.env.OPENROUTER_API_KEY || "",
    model: process.env.OPENROUTER_MODEL || "",
    fallbacks: (process.env.OPENROUTER_FALLBACK_MODELS || "")
      .split(",").map(x => x.trim()).filter(Boolean)
  },
  runtime: {
    databasePath: process.env.DATABASE_PATH || "./data/agent.db",
    logLevel: process.env.LOG_LEVEL || "info",
    reportMode: process.env.REPORT_MODE || "NORMAL",
    autonomous: bool("AUTONOMOUS_MODE", false),
    testMode: bool("TEST_MODE", false),
    observationInterval: int("OBSERVATION_INTERVAL_MS", 1000),
    heartbeatInterval: int("HEARTBEAT_INTERVAL_MS", 10000),
    chatCooldown: int("CHAT_COOLDOWN_MS", 2500),
    reportCooldown: int("REPORT_COOLDOWN_MS", 1500)
  }
};

module.exports = config;
