import {describe, expect, it} from 'vitest';

describe('main', () => {
    it('imports all required modules without errors', async () => {
        // main.js is just a module aggregator with imports
        // This test verifies it can be imported successfully
        const importMain = async () => {
            await import('../resources/js/main');
        };

        await expect(importMain()).resolves.not.toThrow();
    });
});
