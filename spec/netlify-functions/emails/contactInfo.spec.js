import {describe, expect, it} from 'vitest';
import {render} from '../../../netlify/shared/emails/contactInfo.mjs';

describe('contactInfo', () => {
    describe('render', () => {
        const params = {
            recipientName: 'Hunter',
            address: '123 Main St, Springfield, IL',
            phone: '555-0123',
            notes: 'Leave at front door',
        };

        it('renders recipient name', () => {
            const html = render(params);
            expect(html).toContain('Hunter has shared their contact information');
        });

        it('renders address, phone, and notes', () => {
            const html = render(params);
            expect(html).toContain('123 Main St, Springfield, IL');
            expect(html).toContain('555-0123');
            expect(html).toContain('Leave at front door');
        });

        it('includes shared layout footer', () => {
            const html = render(params);
            expect(html).toContain('Happy gift giving!');
        });
    });

    describe('getData', () => {
        it('returns hardcoded sample data', async () => {
            const {getData} = await import('../../../netlify/shared/emails/contactInfo.mjs');
            const data = await getData();

            expect(data.recipientName).toBeDefined();
            expect(data.address).toBeDefined();
            expect(data.phone).toBeDefined();
            expect(data.notes).toBeDefined();
        });
    });
});
