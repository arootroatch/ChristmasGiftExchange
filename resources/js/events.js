class EventEmitter {
  constructor() {
    this.listeners = {};
  }

  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
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

export const Events = {
  GIVER_ADDED: 'giver:added',
  GIVER_REMOVED: 'giver:removed',
  HOUSE_ADDED: 'house:added',
  HOUSE_REMOVED: 'house:removed',
  NAME_ADDED_TO_HOUSE: 'name:addedToHouse',
  NAME_REMOVED_FROM_HOUSE: 'name:removedFromHouse',
  RECIPIENTS_ASSIGNED: 'recipients:assigned',
};
