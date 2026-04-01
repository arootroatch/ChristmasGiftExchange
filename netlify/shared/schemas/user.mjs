import {z} from "zod";
import {ObjectId} from "mongodb";

export const wishlistSchema = z.object({
    url: z.url(),
    title: z.string(),
});

export const wishItemSchema = z.object({
    url: z.url(),
    title: z.string(),
    price: z.number().int().min(0).default(0),
});

export const userSchema = z.object({
    _id: z.instanceof(ObjectId).optional(),
    name: z.string(),
    email: z.email(),
    wishlists: z.array(wishlistSchema).default([]),
    wishItems: z.array(wishItemSchema).default([]),
    currency: z.string().default('USD'),
});

export const collection = 'users';

export const indexes = [
    {key: {email: 1}, options: {unique: true}},
];
