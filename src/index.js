const config = require("./config");
const logger = require("./logger");
const EventBus = require("./event-bus");
const DB = require("./database");
const MinecraftClient = require("./minecraft/client");
const WorldObserver = require("./observer");
const { TaskManager } = require("./task-manager");
const OpenRouter = require("./openrouter");
const Brain = require("./brain");
const TelegramController = require("./telegram");
const AutonomousController = require("./autonomous");

async function main() {
  const events = new EventBus();
  const db = new DB(config.runtime.databasePath);

  const mc = new MinecraftClient(config.minecraft, events);
  mc.startInputLoop();

  const observer = new WorldObserver(mc, db, events);
  const tasks = new TaskManager(db);
  const openrouter = new OpenRouter(config.openrouter);

  const brain = new Brain({
    openrouter,
    observer,
    memory: db,
    taskManager: tasks,
    minecraft: mc
  });

  brain.autonomous = config.runtime.autonomous;

  const telegram = new TelegramController(
    config.telegram,
    brain,
    observer,
    db,
    mc
  );

  const autonomous = new AutonomousController(brain, observer, telegram);

  events.on("CHAT_MESSAGE", async e => {
    if (e.player !== config.minecraft.username) {
      await telegram.sendOwner(`💬 ${e.player}:\n${e.message}`);
    }
  });

  events.on("PLAYER_SEEN", async e => {
    const name = e.packet?.username || e.packet?.name || "unknown";
    await telegram.sendOwner(`👤 Player kuzatildi: ${name}`);
  });

  events.on("PLAYER_LEFT", async e => {
    const name = e.packet?.username || e.packet?.name || "unknown";
    await telegram.sendOwner(`🚪 Player chiqdi: ${name}`);
  });

  events.on("MC_DISCONNECT", async e => {
    await telegram.sendOwner(`🔴 Minecraft connection uzildi.\n${String(e.reason || "")}`);
    setTimeout(() => {
      if (!mc.intentionalStop) mc.connect();
    }, 5000);
  });

  await telegram.launch();
  autonomous.start();

  if (!config.runtime.testMode) {
    mc.connect();
  } else {
    logger.info("TEST_MODE=true — Minecraft connection disabled");
  }

  const shutdown = () => {
    logger.info("Shutting down...");
    autonomous.stop();
    telegram.stop();
    mc.stop();
    db.close();
    process.exit(0);
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

main().catch(error => {
  logger.fatal({ err: error }, "Fatal startup error");
  process.exit(1);
});
