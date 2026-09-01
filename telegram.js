const { Telegraf, Markup } = require("telegraf");
const logger = require("./logger");

class TelegramController {
  constructor(config, brain, observer, db, mc) {
    this.config = config;
    this.brain = brain;
    this.observer = observer;
    this.db = db;
    this.mc = mc;
    this.bot = new Telegraf(config.token);
    this.reportMode = config.reportMode;
    this.lastReport = 0;
  }

  authorized(ctx) {
    return String(ctx.from?.id) === String(this.config.ownerId);
  }

  guard(handler) {
    return async ctx => {
      if (!this.authorized(ctx)) {
        await ctx.reply("Unauthorized.");
        return;
      }
      try {
        await handler(ctx);
      } catch (e) {
        logger.error({ err: e }, "Telegram handler failed");
        await ctx.reply(`❌ Xato: ${e.message}`);
      }
    };
  }

  setup() {
    this.bot.start(this.guard(async ctx => {
      await ctx.reply(
        "🤖 Minecraft AI Agent ishga tayyor.",
        Markup.keyboard([
          ["📊 Status", "📍 Qani?"],
          ["👥 Players", "👁️ Kuzat"],
          ["🤖 Auto", "🛑 Stop"]
        ]).resize()
      );
    }));

    this.bot.command("status", this.guard(ctx => ctx.reply(this.brain.statusText())));
    this.bot.command("players", this.guard(ctx => ctx.reply(this.brain.playersText())));
    this.bot.command("stop", this.guard(ctx => ctx.reply(this.brain.execute({type:"STOP"}, "/stop", ctx.from.id))));
    this.bot.command("pause", this.guard(ctx => ctx.reply(this.brain.execute({type:"PAUSE"}, "/pause", ctx.from.id))));
    this.bot.command("resume", this.guard(ctx => ctx.reply(this.brain.execute({type:"RESUME"}, "/resume", ctx.from.id))));
    this.bot.command("autonomous", this.guard(ctx => ctx.reply(this.brain.execute({type:"AUTONOMOUS"}, "/autonomous", ctx.from.id))));
    this.bot.command("location", this.guard(ctx => ctx.reply(this.brain.statusText())));
    this.bot.command("memory", this.guard(ctx => ctx.reply(
      this.db.recentMemories(8).map(m => `• [${m.importance}] ${m.content}`).join("\n") || "Memory bo‘sh."
    )));
    this.bot.command("tasks", this.guard(ctx => ctx.reply(
      this.db.recentTasks(8).map(t => `• ${t.status} — ${t.command}`).join("\n") || "Task yo‘q."
    )));
    this.bot.command("chat", this.guard(async ctx => {
      const text = ctx.message.text.replace(/^\/chat\s*/i, "").trim();
      if (!text) return ctx.reply("Misol: /chat Salom hammaga");
      this.mc.chat(text);
      await ctx.reply(`💬 Yozdim: ${text}`);
    }));

    this.bot.on("text", this.guard(async ctx => {
      const text = ctx.message.text.trim();
      if (text.startsWith("/")) return;
      const answer = await this.brain.handle(text, ctx.from.id);
      await ctx.reply(answer);
    }));

    return this.bot;
  }

  async sendOwner(text) {
    const now = Date.now();
    if (now - this.lastReport < this.config.reportCooldown) return;
    this.lastReport = now;
    try {
      await this.bot.telegram.sendMessage(this.config.ownerId, text);
    } catch (e) {
      logger.warn({ err: e }, "Telegram owner report failed");
    }
  }

  async launch() {
    await this.bot.launch();
    logger.info("Telegram bot started");
  }

  stop() {
    this.bot.stop();
  }
}

module.exports = TelegramController;
