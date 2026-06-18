import {z} from "zod";
import {ObjectId} from "mongodb";

export const logSchema = z.object({
    _id: z.instanceof(ObjectId).optional(),
    level: z.enum(["info", "warn", "error", "debug"]),
    message: z.string(),
    endpoint: z.string().nullable(),
    ip: z.string().nullable(),
    metadata: z.object({}).passthrough(),
    timestamp: z.date(),
});

export const collection = 'logs';

export const indexes = [
    {key: {timestamp: -1}},
    {key: {level: 1, timestamp: -1}},
    {key: {timestamp: 1}, options: {expireAfterSeconds: 2592000}},
];
