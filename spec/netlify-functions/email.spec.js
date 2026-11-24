import {afterEach, describe, expect, it} from 'vitest';
import {adminEmail, isAdminEmail} from '../../netlify/shared/email.mjs';

describe('email helpers', () => {
    afterEach(() => {
        delete process.env.ADMIN_EMAIL;
    });

    it('isAdminEmail matches ADMIN_EMAIL regardless of case and whitespace', () => {
        process.env.ADMIN_EMAIL = ' Admin@Example.com ';
        expect(isAdminEmail('admin@example.com')).toBe(true);
        expect(isAdminEmail('other@example.com')).toBe(false);
    });

    it('isAdminEmail is false when ADMIN_EMAIL is not configured', () => {
        expect(isAdminEmail('admin@example.com')).toBe(false);
    });

    it('adminEmail returns the normalized ADMIN_EMAIL, or undefined when unset', () => {
        expect(adminEmail()).toBeUndefined();
        process.env.ADMIN_EMAIL = ' Admin@Example.com ';
        expect(adminEmail()).toBe('admin@example.com');
    });
});
