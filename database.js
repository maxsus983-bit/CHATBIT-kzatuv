const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

class DB {
  constructor(filename) {
    const full = path.resolve(filename);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    this.db = new Database(full);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
    this.migrate();
  }

  migrate() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS players (
        name TEXT PRIMARY KEY,
        x REAL, y REAL, z REAL,
        dimension TEXT,
        last_seen INTEGER,
        activity TEXT,
        metadata TEXT
      );

      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player TEXT,
        message TEXT NOT NULL,
        timestamp INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        payload TEXT
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        command TEXT NOT NULL,
        intent TEXT,
        priority INTEGER NOT NULL,
        status TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        started_at INTEGER,
        completed_at INTEGER,
        result TEXT,
        errors TEXT,
        actions TEXT,
        retries INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS memories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        source TEXT,
        type TEXT,
        importance INTEGER NOT NULL DEFAULT 1,
        confidence REAL NOT NULL DEFAULT 1,
        subject TEXT,
        content TEXT NOT NULL,
        metadata TEXT
      );

      CREATE TABLE IF NOT EXISTS world_locations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        x REAL, y REAL, z REAL,
        dimension TEXT,
        description TEXT,
        last_seen INTEGER
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_memory_subject ON memories(subject);
      CREATE INDEX IF NOT EXISTS idx_memory_time ON memories(timestamp);
      CREATE INDEX IF NOT EXISTS idx_events_time ON events(timestamp);
      CREATE INDEX IF NOT EXISTS idx_messages_time ON messages(timestamp);
    `);
  }

  savePlayer(p) {
    this.db.prepare(`
      INSERT INTO players(name,x,y,z,dimension,last_seen,activity,metadata)
      VALUES(@name,@x,@y,@z,@dimension,@last_seen,@activity,@metadata)
      ON CONFLICT(name) DO UPDATE SET
        x=excluded.x,y=excluded.y,z=excluded.z,
        dimension=excluded.dimension,last_seen=excluded.last_seen,
        activity=excluded.activity,metadata=excluded.metadata
    `).run(p);
  }

  saveMessage(player, message) {
    this.db.prepare(`INSERT INTO messages(player,message,timestamp) VALUES(?,?,?)`)
      .run(player || null, message, Date.now());
  }

  saveEvent(type, payload) {
    this.db.prepare(`INSERT INTO events(type,timestamp,payload) VALUES(?,?,?)`)
      .run(type, Date.now(), JSON.stringify(payload || {}));
  }

  remember(m) {
    this.db.prepare(`
      INSERT INTO memories(timestamp,source,type,importance,confidence,subject,content,metadata)
      VALUES(@timestamp,@source,@type,@importance,@confidence,@subject,@content,@metadata)
    `).run({
      timestamp: Date.now(),
      source: m.source || "agent",
      type: m.type || "event",
      importance: m.importance ?? 1,
      confidence: m.confidence ?? 1,
      subject: m.subject || null,
      content: m.content,
      metadata: JSON.stringify(m.metadata || {})
    });
  }

  recall(query, limit = 8) {
    const q = `%${String(query).replace(/[%_]/g, "")}%`;
    return this.db.prepare(`
      SELECT * FROM memories
      WHERE content LIKE ? OR subject LIKE ?
      ORDER BY importance DESC, timestamp DESC
      LIMIT ?
    `).all(q, q, limit);
  }

  recentMemories(limit = 10) {
    return this.db.prepare(`SELECT * FROM memories ORDER BY timestamp DESC LIMIT ?`).all(limit);
  }

  saveTask(t) {
    this.db.prepare(`
      INSERT OR REPLACE INTO tasks
      (id,user_id,command,intent,priority,status,created_at,started_at,completed_at,result,errors,actions,retries)
      VALUES(@id,@user_id,@command,@intent,@priority,@status,@created_at,@started_at,@completed_at,@result,@errors,@actions,@retries)
    `).run({
      ...t,
      errors: JSON.stringify(t.errors || []),
      actions: JSON.stringify(t.actions || [])
    });
  }

  recentTasks(limit = 10) {
    return this.db.prepare(`SELECT * FROM tasks ORDER BY created_at DESC LIMIT ?`).all(limit);
  }

  setSetting(key, value) {
    this.db.prepare(`INSERT OR REPLACE INTO settings(key,value) VALUES(?,?)`).run(key, String(value));
  }

  getSetting(key, fallback = null) {
    const row = this.db.prepare(`SELECT value FROM settings WHERE key=?`).get(key);
    return row ? row.value : fallback;
  }

  close() {
    this.db.close();
  }
}

module.exports = DB;
