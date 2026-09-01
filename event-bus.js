const { EventEmitter } = require("node:events");

class EventBus extends EventEmitter {
  emitEvent(type, payload = {}) {
    this.emit(type, { type, timestamp: Date.now(), ...payload });
  }
}

module.exports = EventBus;
