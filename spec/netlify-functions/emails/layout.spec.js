import {describe, expect, it} from 'vitest';
import {layout} from '../../../netlify/shared/emails/layout.mjs';

describe('layout', () => {
    it('wraps content rows in full HTML document', () => {
        const html = layout('<tr><td>Hello</td></tr>');

        expect(html).toContain('<!DOCTYPE html>');
        expect(html).toContain('<html');
        expect(html).toContain('<body');
        expect(html).toContain('<table role="presentation"');
        expect(html).toContain('Hello');
    });

    it('includes footer with feedback and donate links', () => {
        const html = layout('<tr><td>Content</td></tr>');

        expect(html).toContain('Happy gift giving!');
        expect(html).toContain('Alex at the Gift Exchange Generator');
        expect(html).toContain('venmo.com');
        expect(html).toContain('paypal.me');
    });

    it('places content before footer', () => {
        const html = layout('<tr><td>My Content</td></tr>');

        const contentIndex = html.indexOf('My Content');
        const footerIndex = html.indexOf('Happy gift giving!');
        expect(contentIndex).toBeLessThan(footerIndex);
    });
});
