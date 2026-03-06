import {z} from "zod";

export const assignmentSchema = z.object({
    giverId: z.any(),
    recipientId: z.any(),
});

export const houseSchema = z.object({
    name: z.string(),
    members: z.array(z.any()),
});

export const exchangeSchema = z.object({
    _id: z.any().optional(),
    exchangeId: z.string(),
    createdAt: z.date(),
    isSecretSanta: z.boolean(),
    houses: z.array(houseSchema),
    participants: z.array(z.any()),
    assignments: z.array(assignmentSchema),
}).passthrough();
