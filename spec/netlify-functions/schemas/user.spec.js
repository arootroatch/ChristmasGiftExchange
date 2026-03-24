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
        const result = wishItemSchema.safeParse({url: 'not-a-url', title: 'Cool Gadget', price: 2500});
        expect(result.success).toBe(false);
    });

    it('accepts valid URLs with integer price', () => {
        const result = wishItemSchema.safeParse({url: 'https://amazon.com/item/123', title: 'Cool Gadget', price: 2500});
        expect(result.success).toBe(true);
        expect(result.data.price).toBe(2500);
    });

    it('defaults price to 0', () => {
        const result = wishItemSchema.safeParse({url: 'https://amazon.com/item/123', title: 'Cool Gadget'});
        expect(result.success).toBe(true);
        expect(result.data.price).toBe(0);
    });

    it('rejects string price', () => {
        const result = wishItemSchema.safeParse({url: 'https://amazon.com/item/123', title: 'Cool Gadget', price: '$25'});
        expect(result.success).toBe(false);
    });

    it('rejects negative price', () => {
        const result = wishItemSchema.safeParse({url: 'https://amazon.com/item/123', title: 'Cool Gadget', price: -100});
        expect(result.success).toBe(false);
    });

    it('rejects non-integer price', () => {
        const result = wishItemSchema.safeParse({url: 'https://amazon.com/item/123', title: 'Cool Gadget', price: 25.50});
        expect(result.success).toBe(false);
    });
});

describe('userSchema', () => {
    it('rejects invalid email', () => {
        const result = userSchema.safeParse({
            name: 'Alex',
            email: 'not-an-email',
        });
        expect(result.success).toBe(false);
    });

    it('accepts valid email', () => {
        const result = userSchema.safeParse({
            name: 'Alex',
            email: 'alex@test.com',
        });
        expect(result.success).toBe(true);
    });

    it('defaults currency to USD', () => {
        const result = userSchema.safeParse({
            name: 'Alex',
            email: 'alex@test.com',
        });
        expect(result.success).toBe(true);
        expect(result.data.currency).toBe('USD');
    });
});
