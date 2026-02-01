import { stateEvents, Events } from './events.js';

const componentRegistry = {};

// Components register themselves
export function registerComponent(type, componentHandlers) {
  componentRegistry[type] = componentHandlers;
}

// Initialize generic lifecycle subscriptions
export function initRenderSubscriptions() {
  stateEvents.on(Events.COMPONENT_ADDED, (event) => {
    callLifecycleMethod('onComponentAdded', event);
  });

  stateEvents.on(Events.COMPONENT_REMOVED, (event) => {
    callLifecycleMethod('onComponentRemoved', event);
  });

  stateEvents.on(Events.COMPONENT_UPDATED, (event) => {
    callLifecycleMethod('onComponentUpdated', event);
  });
}

// Duck typing - call method if component implements it
function callLifecycleMethod(method, event) {
  Object.values(componentRegistry).forEach(component => {
    if (typeof component[method] === 'function') {
      component[method](event);
    }
  });
}

// Helper for components to render child components into slots
export function renderIntoSlot(slotSelector, componentType, componentId) {
  const slot = document.querySelector(slotSelector);
  if (!slot || !componentRegistry[componentType]) return;

  const component = componentRegistry[componentType];
  if (typeof component.template === 'function') {
    const html = component.template(componentId);
    slot.innerHTML = html;

    // Attach component's event listeners
    if (typeof component.attachListeners === 'function') {
      component.attachListeners(slot, componentId);
    }
  }
}
