import {test as base, expect} from '@playwright/test';
import {readFileSync} from 'fs';
import path from 'path';

const state = JSON.parse(readFileSync(path.join(import.meta.dirname, '.e2e-state.json'), 'utf-8'));

export const test = base.extend({
    // eslint-disable-next-line no-empty-pattern -- Playwright parses this destructuring pattern to resolve fixture deps
    baseURL: async ({}, use) => {
        await use(`http://localhost:${state.port}`);
    },
    page: async ({page}, use) => {
        await page.route('**/verifalia-widget**', route => route.abort());
        await use(page);
    },
});

export {expect};
