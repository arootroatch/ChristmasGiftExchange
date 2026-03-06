import {z} from "zod";

export const wishlistSchema = z.object({
    url: z.string(),
    title: z.string(),
});

export const wishItemSchema = z.object({
    url: z.string(),
    title: z.string(),
});

export const userSchema = z.object({
    _id: z.any().optional(),
    name: z.string(),
    email: z.string(),
    token: z.string(),
    wishlists: z.array(wishlistSchema).default([]),
    wishItems: z.array(wishItemSchema).default([]),
}).passthrough();
