import {describe, it, expect, beforeEach} from 'vitest';
import {initReactiveSystem, resetState, resetDOM, shouldSelect} from '../../specHelper.js';
import * as dashboardLink from '../../../src/exchange/components/DashboardLink.js';
import {startExchange} from '../../../src/exchange/state.js';

describe('DashboardLink', () => {
  beforeEach(() => {
    resetDOM();
    resetState();
    initReactiveSystem();
  });

  it('renders dashboard link in slot', () => {
    dashboardLink.init();
    shouldSelect('[data-slot="dashboard-link"]');
    const slot = document.querySelector('[data-slot="dashboard-link"]');
    expect(slot.innerHTML).toContain('/dashboard');
  });

  it('contains descriptive text about dashboard features', () => {
    dashboardLink.init();
    const slot = document.querySelector('[data-slot="dashboard-link"]');
    expect(slot.textContent.toLowerCase()).toContain('gift');
  });

  it('hides when EXCHANGE_STARTED fires', () => {
    dashboardLink.init();
    startExchange();
    const slot = document.querySelector('[data-slot="dashboard-link"]');
    expect(slot.innerHTML).toBe('');
  });
});
