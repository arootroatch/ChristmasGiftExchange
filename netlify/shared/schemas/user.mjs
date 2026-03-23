import {z} from "zod";
import {ObjectId} from "mongodb";

export const wishlistSchema = z.object({
    url: z.url(),
    title: z.string(),
});

export const wishItemSchema = z.object({
    url: z.url(),
    title: z.string(),
    price: z.string().default(''),
});

export const userSchema = z.object({
    _id: z.instanceof(ObjectId).optional(),
    name: z.string(),
    email: z.email(),
    wishlists: z.array(wishlistSchema).default([]),
    wishItems: z.array(wishItemSchema).default([]),
});
