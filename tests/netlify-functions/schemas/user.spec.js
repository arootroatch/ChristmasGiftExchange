import {describe, expect, it} from 'vitest';
import {userSchema, wishlistSchema, wishItemSchema} from '../../../netlify/shared/schemas/user.mjs';

describe('wishlistSchema', () => {
    it('rejects invalid URLs', () => {
        const result = wishlistSchema.safeParse({url: 'not-a-url', title: 'My List'});
        expect(result.success).toBe(false);
    });

    it('accepts valid URLs', () => {
        const result = wishlistSchema.safeParse({url: 'https://amazon.com/wishlist', title: 'My List'});
        expect(result.success).toBe(true);
    });
});

describe('wishItemSchema', () => {
    it('rejects invalid URLs', () => {
        const result = wishItemSchema.safeParse({url: 'not-a-url', title: 'Cool Gadget'});
        expect(result.success).toBe(false);
    });

    it('accepts valid URLs', () => {
        const result = wishItemSchema.safeParse({url: 'https://amazon.com/item/123', title: 'Cool Gadget'});
        expect(result.success).toBe(true);
    });
});

describe('userSchema', () => {
    it('rejects invalid email', () => {
        const result = userSchema.safeParse({
            name: 'Alex',
            email: 'not-an-email',
            token: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        });
        expect(result.success).toBe(false);
    });

    it('accepts valid email', () => {
        const result = userSchema.safeParse({
            name: 'Alex',
            email: 'alex@test.com',
            token: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        });
        expect(result.success).toBe(true);
    });

    it('rejects invalid UUID token', () => {
        const result = userSchema.safeParse({
            name: 'Alex',
            email: 'alex@test.com',
            token: 'not-a-uuid',
        });
        expect(result.success).toBe(false);
    });

    it('accepts valid UUID token', () => {
        const result = userSchema.safeParse({
            name: 'Alex',
            email: 'alex@test.com',
            token: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        });
        expect(result.success).toBe(true);
    });
});
