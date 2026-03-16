import {describe, expect, it} from 'vitest';
import {render} from '../../../netlify/shared/emails/errorAlert.mjs';

describe('errorAlert', () => {
    describe('render', () => {
        const params = {
            endpoint: 'POST /api/exchange',
            timestamp: '2026-03-16T12:00:00.000Z',
            stackTrace: 'Error: something broke\n    at handler (api.mjs:10)',
        };

        it('renders error heading', () => {
            const html = render(params);
            expect(html).toContain('Server Error in Gift Exchange Generator');
        });

        it('renders endpoint and timestamp', () => {
            const html = render(params);
            expect(html).toContain('POST /api/exchange');
            expect(html).toContain('2026-03-16T12:00:00.000Z');
        });

        it('renders stack trace in pre block', () => {
            const html = render(params);
            expect(html).toContain('<pre');
            expect(html).toContain('something broke');
        });

        it('uses monospace font family', () => {
            const html = render(params);
            expect(html).toContain('font-family: monospace');
        });

        it('does not include shared layout footer', () => {
            const html = render(params);
            expect(html).not.toContain('Happy gift giving!');
        });
    });

    describe('getData', () => {
        it('returns hardcoded sample data', async () => {
            const {getData} = await import('../../../netlify/shared/emails/errorAlert.mjs');
            const data = await getData();

            expect(data.endpoint).toBeDefined();
            expect(data.timestamp).toBeDefined();
            expect(data.stackTrace).toBeDefined();
        });
    });
});
