import {z} from "zod";
import {ObjectId} from "mongodb";

export const rateLimitSchema = z.object({
    _id: z.instanceof(ObjectId).optional(),
    key: z.string(),
    endpoint: z.string(),
    count: z.number().int().min(0),
    windowStart: z.date(),
});
