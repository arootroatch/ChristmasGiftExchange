import {z} from "zod";

export const settingsSchema = z.object({
    _id: z.literal("global"),
    logLevel: z.enum(["debug", "info", "warn", "error"]),
});

export const collection = 'settings';

export const indexes = [];
