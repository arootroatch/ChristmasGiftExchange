import {getLinkExchangesCollection} from "../shared/db.mjs";
import {apiHandler, validateBody, requestEndpoint, getOptionalUser} from "../shared/middleware.mjs";
import {badRequest, ok} from "../shared/responses.mjs";
import {logger} from "../shared/logger.mjs";
import {z} from "zod";

const houseInputSchema = z.object({
    id: z.string().optional(),
    name: z.string().max(200),
    members: z.array(z.string().max(200)).max(100),
});

const participantInputSchema = z.object({
    name: z.string().max(200),
    recipient: z.string().max(200),
});

function validateUniqueNames(ctx) {
    const names = ctx.value.participants.map(p => p.name);
    if (new Set(names).size !== names.length) {
        ctx.issues.push({code: "custom", message: "Participant names must be unique", path: ["participants"]});
    }
}

function validateRecipientsExist(ctx) {
    const names = new Set(ctx.value.participants.map(p => p.name));
    ctx.value.participants.forEach((p, i) => {
        if (!names.has(p.recipient)) {
            ctx.issues.push({code: "custom", message: `Recipient "${p.recipient}" is not a participant`, path: ["participants", i, "recipient"]});
        }
    });
}

const linkExchangePostRequestSchema = z.object({
    exchangeId: z.uuid(),
    houses: z.array(houseInputSchema).max(100),
    participants: z.array(participantInputSchema).max(100),
}).check(validateUniqueNames)
  .check(validateRecipientsExist);

export const handler = apiHandler("POST", async (event) => {
    const {data, error} = validateBody(linkExchangePostRequestSchema, event);
    if (error) return badRequest(error);

    const organizer = await getOptionalUser(event);
    const linkExchangesCol = await getLinkExchangesCollection();

    const doc = {
        exchangeId: data.exchangeId,
        createdAt: new Date(),
        houses: data.houses.map(h => ({name: h.name, members: h.members})),
        participants: data.participants.map(p => ({name: p.name, recipient: p.recipient, hasDrawn: false})),
        ...(organizer && {organizer: organizer._id}),
    };
    await linkExchangesCol.insertOne(doc);

    logger.info("Link exchange created", {endpoint: requestEndpoint(event), ip: event.ip, exchangeId: data.exchangeId, participantCount: data.participants.length});

    return ok({exchangeId: data.exchangeId});
}, {maxRequests: 3, windowMs: 60000});
