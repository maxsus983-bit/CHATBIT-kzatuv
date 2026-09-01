const crypto = require("node:crypto");

const STATUS = Object.freeze({
  QUEUED: "QUEUED",
  PLANNING: "PLANNING",
  RUNNING: "RUNNING",
  PAUSED: "PAUSED",
  WAITING: "WAITING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED"
});

class TaskManager {
  constructor(db) {
    this.db = db;
    this.current = null;
    this.paused = [];
  }

  create(command, userId, intent, priority = 100) {
    const task = {
      id: crypto.randomUUID(),
      user_id: String(userId),
      command,
      intent,
      priority,
      status: STATUS.QUEUED,
      created_at: Date.now(),
      started_at: null,
      completed_at: null,
      result: null,
      errors: [],
      actions: [],
      retries: 0
    };
    this.db.saveTask(task);
    return task;
  }

  start(task) {
    task.status = STATUS.RUNNING;
    task.started_at = Date.now();
    this.db.saveTask(task);
    this.current = task;
  }

  complete(task, result) {
    task.status = STATUS.COMPLETED;
    task.result = result;
    task.completed_at = Date.now();
    this.db.saveTask(task);
    if (this.current?.id === task.id) this.current = null;
  }

  fail(task, error) {
    task.status = STATUS.FAILED;
    task.errors.push(String(error));
    task.completed_at = Date.now();
    this.db.saveTask(task);
    if (this.current?.id === task.id) this.current = null;
  }

  cancelCurrent() {
    if (!this.current) return null;
    this.current.status = STATUS.CANCELLED;
    this.current.completed_at = Date.now();
    this.db.saveTask(this.current);
    const old = this.current;
    this.current = null;
    return old;
  }

  pauseCurrent() {
    if (!this.current) return null;
    this.current.status = STATUS.PAUSED;
    this.db.saveTask(this.current);
    return this.current;
  }

  resumeCurrent() {
    if (!this.current) return null;
    this.current.status = STATUS.RUNNING;
    this.db.saveTask(this.current);
    return this.current;
  }
}

module.exports = { TaskManager, STATUS };
