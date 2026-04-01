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
