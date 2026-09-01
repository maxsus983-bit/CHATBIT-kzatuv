const { parseIntent } = require("./intent");

class Brain {
  constructor({ openrouter, observer, memory, taskManager, minecraft }) {
    this.openrouter = openrouter;
    this.observer = observer;
    this.memory = memory;
    this.tasks = taskManager;
    this.minecraft = minecraft;
    this.autonomous = false;
    this.lastGoalAt = 0;
  }

  async handle(text, userId) {
    const intent = parseIntent(text);

    if (intent.type === "AI" && this.openrouter.enabled()) {
      return this.aiInterpret(text, userId);
    }

    return this.execute(intent, text, userId);
  }

  async aiInterpret(text, userId) {
    const state = this.observer.state();
    const memories = this.memory.recall(text, 6);

    const system = `
You are the decision layer of a Minecraft Bedrock autonomous agent.
Never invent perception. Return strict JSON:
{"intent":"STATUS|LOOK|FOLLOW|MOVE_FORWARD|CHAT|AUTONOMOUS|STOP|PAUSE|RESUME|PLAYERS|WATCH|UNKNOWN","target":null,"blocks":0,"message":null,"reason":""}
Only select actions supported by the listed intents.
`;

    const user = JSON.stringify({ command: text, state, memories });

    try {
      const answer = await this.openrouter.ask(system, user);
      const match = answer.match(/\{[\s\S]*\}/);
      if (!match) return "Buyruqni tushunmadim.";
      const parsed = JSON.parse(match[0]);
      return this.execute(parsed, text, userId);
    } catch {
      return "AI Brain vaqtincha ishlamayapti. Oddiy buyruqlar baribir ishlaydi.";
    }
  }

  async execute(intent, original, userId) {
    switch (intent.type) {
      case "STOP":
        this.autonomous = false;
        this.tasks.cancelCurrent();
        return "🛑 To‘xtadim. Joriy vazifa bekor qilindi.";

      case "PAUSE":
        this.tasks.pauseCurrent();
        return "⏸️ Vazifa pauzaga qo‘yildi.";

      case "RESUME":
        this.tasks.resumeCurrent();
        return "▶️ Vazifa davom ettirildi.";

      case "STATUS":
        return this.statusText();

      case "LOOK":
        return this.lookText();

      case "PLAYERS":
        return this.playersText();

      case "AUTONOMOUS":
        this.autonomous = true;
        return "🤖 Autonomous Mode yoqildi. Endi muhitni kuzatib, xavfsiz va maqsadga yo‘naltirilgan harakatlarni o‘zim rejalashtiraman.";

      case "CHAT":
        this.minecraft.chat(intent.message || "Salom hammaga");
        return `💬 Minecraft chatiga yozdim: ${intent.message || "Salom hammaga"}`;

      case "MOVE_FORWARD": {
        const task = this.tasks.create(original, userId, "MOVE_FORWARD", intent.priority);
        this.tasks.start(task);
        try {
          this.minecraft.moveForward(Math.max(500, Math.min(intent.blocks * 450, 15000)));
          this.memory.remember({
            type: "task",
            subject: "movement",
            importance: 2,
            content: `User requested movement: ${original}`
          });
          this.tasks.complete(task, "Movement started");
          return `🚶 ${intent.blocks || 5} blokcha oldinga yurishni boshladim.`;
        } catch (e) {
          this.tasks.fail(task, e);
          return `❌ Harakatni boshlay olmadim: ${e.message}`;
        }
      }

      case "FOLLOW": {
        const target = intent.target || this.observer.nearbyPlayers()[0]?.name;
        if (!target) return "Qaysi playerni kuzatishni aniqlay olmadim.";
        const p = this.observer.findPlayer(target);
        if (!p) return `${target} hozirgi kuzatuv ma'lumotlarimda topilmadi.`;
        return `👁️ ${p.name} ni kuzatish vazifasini qabul qildim. Hozirgi holati: ${p.x}, ${p.y}, ${p.z}.`;
      }

      case "WATCH":
        return "👁️ Hudud kuzatuvi yoqildi. Muhim player/entity/chat eventlarini kuzataman.";

      case "INVENTORY":
        return "🎒 Inventory ma'lumotini protocol orqali olish uchun server/client capability kerak. Hozircha mavjud perceptionda inventory state yo‘q; uydirmayman.";

      case "BUILD":
        return "🏗️ Qurilish planner tayyor, lekin bu protocol-only clientda block placement uchun kerakli interaction/world state hali tasdiqlanmagan. Fake block qo‘ymayman.";

      default:
        return "Buyruqni tushunmadim yoki hozircha mavjud real tool bilan bajara olmayman.";
    }
  }

  statusText() {
    const s = this.observer.state();
    const pos = s.bot.position;
    return [
      "🤖 BOT STATUS",
      `📡 Minecraft: ${s.bot.connected ? "🟢 Ulangan" : "🔴 Ulanmagan"}`,
      `🎮 Spawn: ${s.bot.spawned ? "🟢" : "🔴"}`,
      `📍 Joy: ${pos ? `${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)}` : "noma'lum"}`,
      `🌍 Dimension: ${s.bot.dimension}`,
      `👥 Playerlar: ${s.players.length}`,
      `👁️ Entitylar: ${s.entities.length}`,
      `🤖 Autonomous: ${this.autonomous ? "ON" : "OFF"}`,
      `⚙️ Task: ${this.tasks.current?.status || "IDLE"}`
    ].join("\n");
  }

  lookText() {
    const s = this.observer.state();
    const players = s.nearbyPlayers.slice(0, 8).map(p =>
      `• ${p.name}${p.distance != null ? ` — ${p.distance.toFixed(1)} blok` : ""}`
    );
    return [
      "👁️ NIMA KO‘RYAPMAN?",
      `📍 ${s.bot.position ? `${s.bot.position.x.toFixed(1)}, ${s.bot.position.y.toFixed(1)}, ${s.bot.position.z.toFixed(1)}` : "joylashuv noma'lum"}`,
      `👤 Yaqin playerlar: ${players.length ? "\n" + players.join("\n") : "yo‘q"}`,
      `💬 So‘nggi chat: ${s.chat.slice(0, 3).map(x => `${x.player}: ${x.message}`).join(" | ") || "yo‘q"}`,
      `⚠️ So‘nggi eventlar: ${s.recentEvents.slice(0, 3).map(x => x.type).join(", ") || "yo‘q"}`,
      "ℹ️ Bu report faqat protocol orqali olingan perception ma'lumotlariga asoslangan."
    ].join("\n");
  }

  playersText() {
    const list = this.observer.nearbyPlayers();
    if (!list.length) return "👥 Hozircha kuzatilgan player yo‘q.";
    return "👥 PLAYERLAR\n" + list.map(p =>
      `• ${p.name} — ${p.x ?? "?"}, ${p.y ?? "?"}, ${p.z ?? "?"}${p.distance != null ? ` — ${p.distance.toFixed(1)} blok` : ""}`
    ).join("\n");
  }
}

module.exports = Brain;
