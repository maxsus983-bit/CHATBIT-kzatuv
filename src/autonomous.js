const logger = require("./logger");

class AutonomousController {
  constructor(brain, observer, telegram) {
    this.brain = brain;
    this.observer = observer;
    this.telegram = telegram;
    this.timer = null;
    this.lastReport = 0;
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick().catch(e => logger.error({err:e}, "Autonomous tick failed")), 5000);
  }

  async tick() {
    if (!this.brain.autonomous) return;

    const state = this.observer.state();

    // Conservative autonomous policy: observe/report, do not invent capabilities.
    const nearbyDanger = state.entities.length > 0;
    const now = Date.now();

    if (nearbyDanger && now - this.lastReport > 60000) {
      this.lastReport = now;
      await this.telegram.sendOwner(
        `🤖 AUTONOMOUS UPDATE\n📍 ${state.bot.position ? `${state.bot.position.x.toFixed(1)}, ${state.bot.position.y.toFixed(1)}, ${state.bot.position.z.toFixed(1)}` : "noma'lum"}\n👥 Playerlar: ${state.players.length}\n👁️ Entitylar: ${state.entities.length}\n\nHozircha xavfsiz kuzatuv rejimidaman.`
      );
    }
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}

module.exports = AutonomousController;
