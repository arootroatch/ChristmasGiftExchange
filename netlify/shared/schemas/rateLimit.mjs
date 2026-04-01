import {z} from "zod";
import {ObjectId} from "mongodb";

export const rateLimitSchema = z.object({
    _id: z.instanceof(ObjectId).optional(),
    key: z.string(),
    endpoint: z.string(),
    count: z.number().int().min(0),
    windowStart: z.date(),
});

export const collection = 'rateLimits';

export const indexes = [
    {key: {key: 1, windowStart: 1}},
    {key: {windowStart: 1}, options: {expireAfterSeconds: 86400}},
];
