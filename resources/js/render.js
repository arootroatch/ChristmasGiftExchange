import {Events, stateEvents} from './events.js';

const componentRegistry = {};

export function registerComponent(type, componentHandlers) {
  componentRegistry[type] = componentHandlers;
}

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

function callLifecycleMethod(method, event) {
  Object.values(componentRegistry).forEach(component => {
    if (typeof component[method] === 'function') component[method](event);
  });
}

