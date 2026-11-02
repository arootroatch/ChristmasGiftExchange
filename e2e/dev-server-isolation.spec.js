import {readFileSync} from 'fs';
import path from 'path';
import {test, expect} from './fixtures.js';
import {internalFunctionsSnapshot, PROJECT_ROOT} from './netlifyDevServer.js';

const state = JSON.parse(readFileSync(path.join(import.meta.dirname, '.e2e-state.json'), 'utf-8'));

// Every `netlify dev` in a folder shares its .netlify directory. Starting one empties
// .netlify/functions-internal, and any other server running there reacts by unregistering all of
// its functions, so a developer's own server starts answering every API call with 404 (seen as
// "Failed to create link") until it is restarted. The e2e server must never run from the checkout.
test.describe('e2e server isolation', () => {
    test('runs from outside the checkout', () => {
        expect(state.serverDir).toBeTruthy();
        expect(path.relative(PROJECT_ROOT, state.serverDir).startsWith('..')).toBe(true);
    });

    test("leaves the checkout's .netlify/functions-internal untouched", () => {
        expect(internalFunctionsSnapshot()).toEqual(state.internalFunctionsBeforeStart);
    });
});
