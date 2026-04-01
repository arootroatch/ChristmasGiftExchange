import {z} from "zod";
import {ObjectId} from "mongodb";

export const authCodeSchema = z.object({
    _id: z.instanceof(ObjectId).optional(),
    email: z.email(),
    codeHash: z.string(),
    expiresAt: z.date(),
    attempts: z.number().int().min(0).default(0),
    createdAt: z.date(),
});

export const collection = 'authCodes';

export const indexes = [
    {key: {email: 1}},
    {key: {expiresAt: 1}, options: {expireAfterSeconds: 0}},
];
