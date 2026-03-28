import {selectElement} from '../../utils';
import {ExchangeEvents as Events, exchangeEvents as stateEvents} from '../state.js';
import {dashboardLinkTemplate} from '../firstScreenTemplates.js';
import btnStyles from '../../../assets/styles/exchange/components/buttons.module.css';

export function init() {
  selectElement('[data-slot="dashboard-link"]').innerHTML = dashboardLinkTemplate(btnStyles);
  stateEvents.on(Events.EXCHANGE_STARTED, () => {
    selectElement('[data-slot="dashboard-link"]').innerHTML = '';
  });
}
