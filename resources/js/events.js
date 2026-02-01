class EventEmitter {
  constructor() {
    this.listeners = {};
  }

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);

    return () => {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    };
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }
}

export const stateEvents = new EventEmitter();

// Generic component lifecycle events
export const Events = {
  COMPONENT_ADDED: 'component:added',
  COMPONENT_REMOVED: 'component:removed',
  COMPONENT_UPDATED: 'component:updated',
};
