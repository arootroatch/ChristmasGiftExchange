import {describe, it, expect} from 'vitest';
import {escapeHtml} from '../../netlify/shared/emails/escapeHtml.mjs';

describe('escapeHtml', () => {
    it('escapes ampersands', () => {
        expect(escapeHtml('a&b')).toBe('a&amp;b');
    });

    it('escapes less-than', () => {
        expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
    });

    it('escapes double quotes', () => {
        expect(escapeHtml('"hello"')).toBe('&quot;hello&quot;');
    });

    it('escapes single quotes', () => {
        expect(escapeHtml("it's")).toBe("it&#39;s");
    });

    it('returns empty string for null', () => {
        expect(escapeHtml(null)).toBe('');
    });

    it('returns empty string for undefined', () => {
        expect(escapeHtml(undefined)).toBe('');
    });

    it('converts numbers to string', () => {
        expect(escapeHtml(42)).toBe('42');
    });

    it('handles strings with no special characters', () => {
        expect(escapeHtml('hello world')).toBe('hello world');
    });
});
