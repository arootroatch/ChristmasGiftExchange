import {z} from "zod";
import {ObjectId} from "mongodb";

const objectIdSchema = z.instanceof(ObjectId);

export const assignmentSchema = z.object({
    giverId: objectIdSchema,
    recipientId: objectIdSchema,
});

export const houseSchema = z.object({
    name: z.string(),
    members: z.array(objectIdSchema),
});

export const exchangeSchema = z.object({
    _id: objectIdSchema.optional(),
    exchangeId: z.string(),
    organizer: objectIdSchema.optional(),
    createdAt: z.date(),
    isSecretSanta: z.boolean(),
    houses: z.array(houseSchema),
    participants: z.array(objectIdSchema),
    assignments: z.array(assignmentSchema),
});

export const collection = 'exchanges';

export const indexes = [
    {key: {exchangeId: 1}, options: {unique: true}},
    {key: {participants: 1}},
    {key: {"assignments.recipientId": 1}},
];
