import {selectElement} from '../../utils';
import {ExchangeEvents as Events, exchangeEvents as stateEvents} from '../state.js';
import {dashboardLinkTemplate} from '../firstScreenTemplates.js';

export function init() {
  selectElement('[data-slot="dashboard-link"]').innerHTML = dashboardLinkTemplate();
  stateEvents.on(Events.EXCHANGE_STARTED, () => {
    selectElement('[data-slot="dashboard-link"]').innerHTML = '';
  });
}
