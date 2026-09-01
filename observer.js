class WorldObserver {
  constructor(mc, db, events) {
    this.mc = mc;
    this.db = db;
    this.events = events;
    this.players = new Map();
    this.entities = new Map();
    this.chat = [];
    this.recentEvents = [];
    this.maxRecent = 300;

    events.on("CHAT_MESSAGE", e => this.onChat(e));
    events.on("PLAYER_SEEN", e => this.onPlayerSeen(e));
    events.on("PLAYER_LEFT", e => this.onPlayerLeft(e));
    events.on("PLAYER_MOVE", e => this.onPlayerMove(e));
    events.on("ENTITY_SPAWN", e => this.onEntitySpawn(e));
    events.on("ENTITY_DEATH_OR_REMOVE", e => this.onEntityRemove(e));

    setInterval(() => this.sample(), 1000);
  }

  addEvent(type, data) {
    const e = { type, timestamp: Date.now(), ...data };
    this.recentEvents.unshift(e);
    if (this.recentEvents.length > this.maxRecent) this.recentEvents.length = this.maxRecent;
    this.db.saveEvent(type, data);
  }

  onChat({ player, message, packet }) {
    const item = { player, message, timestamp: Date.now() };
    this.chat.unshift(item);
    this.chat.length = Math.min(this.chat.length, 200);
    this.db.saveMessage(player, message);
    this.addEvent("CHAT_MESSAGE", { player, message });

    if (player !== this.mc.config.username) {
      this.events.emitEvent("PLAYER_CHAT", item);
    }
  }

  extractName(packet) {
    return packet.username || packet.name || packet.player_name || packet.xuid || "unknown";
  }

  onPlayerSeen({ packet }) {
    const name = this.extractName(packet);
    const pos = packet.position || packet.player_position || null;
    const p = {
      name,
      x: pos?.x ?? null,
      y: pos?.y ?? null,
      z: pos?.z ?? null,
      dimension: packet.dimension != null ? String(packet.dimension) : "unknown",
      lastSeen: Date.now(),
      activity: "seen"
    };
    this.players.set(name, p);
    this.db.savePlayer({
      name: p.name, x: p.x, y: p.y, z: p.z,
      dimension: p.dimension, last_seen: p.lastSeen,
      activity: p.activity, metadata: JSON.stringify({})
    });
    this.addEvent("PLAYER_SEEN", p);
  }

  onPlayerLeft({ packet }) {
    const name = this.extractName(packet);
    const existing = this.players.get(name);
    if (existing) existing.activity = "offline";
    this.addEvent("PLAYER_LEFT", { name });
  }

  onPlayerMove({ packet }) {
    const name = this.extractName(packet);
    const pos = packet.position || null;
    if (!pos) return;
    const old = this.players.get(name) || { name };
    const next = {
      ...old,
      x: pos.x, y: pos.y, z: pos.z,
      lastSeen: Date.now(),
      activity: "moving"
    };
    this.players.set(name, next);
    this.db.savePlayer({
      name, x: next.x, y: next.y, z: next.z,
      dimension: next.dimension || "unknown",
      last_seen: next.lastSeen,
      activity: next.activity,
      metadata: JSON.stringify({})
    });
  }

  onEntitySpawn({ packet }) {
    const id = String(packet.runtime_entity_id ?? packet.unique_entity_id ?? Math.random());
    this.entities.set(id, packet);
    this.addEvent("ENTITY_SPAWN", {
      id,
      identifier: packet.entity_type || packet.identifier || "unknown"
    });
  }

  onEntityRemove({ packet }) {
    const id = String(packet.runtime_entity_id ?? packet.unique_entity_id ?? "");
    this.entities.delete(id);
    this.addEvent("ENTITY_REMOVE", { id });
  }

  sample() {
    if (this.mc.position) {
      this.events.emitEvent("WORLD_SAMPLE", {
        position: this.mc.position,
        dimension: this.mc.dimension,
        nearbyPlayers: this.nearbyPlayers()
      });
    }
  }

  distance(a, b) {
    if (!a || !b || a.x == null || b.x == null) return null;
    return Math.sqrt(
      (a.x-b.x)**2 + (a.y-b.y)**2 + (a.z-b.z)**2
    );
  }

  nearbyPlayers(maxDistance = 64) {
    const result = [];
    for (const p of this.players.values()) {
      const d = this.distance(this.mc.position, p);
      if (d == null || d <= maxDistance) result.push({ ...p, distance: d });
    }
    return result;
  }

  findPlayer(name) {
    const exact = [...this.players.values()].find(p => p.name.toLowerCase() === name.toLowerCase());
    if (exact) return exact;
    return [...this.players.values()].find(p => p.name.toLowerCase().includes(name.toLowerCase())) || null;
  }

  state() {
    return {
      bot: this.mc.getState(),
      players: [...this.players.values()],
      nearbyPlayers: this.nearbyPlayers(),
      entities: [...this.entities.values()].slice(0, 100),
      chat: this.chat.slice(0, 20),
      recentEvents: this.recentEvents.slice(0, 30)
    };
  }
}

module.exports = WorldObserver;
