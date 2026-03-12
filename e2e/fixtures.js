import {test as base, expect} from '@playwright/test';
import {readFileSync} from 'fs';
import path from 'path';

const state = JSON.parse(readFileSync(path.join(import.meta.dirname, '.e2e-state.json'), 'utf-8'));

export const test = base.extend({
    baseURL: async ({}, use) => {
        await use(`http://localhost:${state.port}`);
    },
});

export {expect};
