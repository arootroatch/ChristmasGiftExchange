import {z} from "zod";
import {ObjectId} from "mongodb";

const objectIdSchema = z.instanceof(ObjectId);

export const linkExchangeSchema = z.object({
    _id: objectIdSchema.optional(),
    exchangeId: z.string(),
    createdAt: z.date(),
    organizer: objectIdSchema.optional(),
    houses: z.array(z.object({
        name: z.string(),
        members: z.array(z.string()),
    })),
    participants: z.array(z.object({
        name: z.string(),
        recipient: z.string(),
        hasDrawn: z.boolean(),
    })),
});

export const collection = 'linkExchanges';

export const indexes = [
    {key: {exchangeId: 1}, options: {unique: true}},
    {key: {organizer: 1}},
];
