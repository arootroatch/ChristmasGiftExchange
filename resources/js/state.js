// StateManager class for immutable state updates with subscriptions
class StateManager {
  constructor(initialState) {
    this._state = initialState;
    this.subscribers = [];
  }

  getState() {
    return this._state;
  }

  setState(updates) {
    const oldState = this._state;
    // Create new state object immutably
    this._state = { ...this._state, ...updates };
    this.notify(oldState, this._state);
  }

  subscribe(callback) {
    this.subscribers.push(callback);
    // Return unsubscribe function
    return () => {
      this.subscribers = this.subscribers.filter(sub => sub !== callback);
    };
  }

  notify(oldState, newState) {
    this.subscribers.forEach(callback => callback(oldState, newState));
  }
}

// Create state manager instance
const stateManager = new StateManager({
  houses: [],
  generated: false,
  duplicate: null,
  availRecipients: [],
  introIndex: 0,
  secretSanta: false,
  givers: [],
  houseID: 0,
  nameNumber: 1
});

// Export helper functions
export const updateState = (updates) => stateManager.setState(updates);
export const subscribeToState = (callback) => stateManager.subscribe(callback);
export const getState = () => stateManager.getState();

// Create a Proxy for backwards compatibility that always returns current state
// This allows `state.givers` to always reference the latest state
const stateProxy = new Proxy(stateManager, {
  get(target, prop) {
    // Return current state properties
    return target.getState()[prop];
  },
  set(target, prop, value) {
    // Redirect sets to use immutable setState
    target.setState({ [prop]: value });
    return true;
  }
});

// Export the proxy as default for backwards compatibility
export default stateProxy;