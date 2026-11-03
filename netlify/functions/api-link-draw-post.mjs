import {getLinkExchangesCollection} from "../shared/db.mjs";
import {apiHandler, validateBody} from "../shared/middleware.mjs";
import {ok, notFound, error, badRequest} from "../shared/responses.mjs";
import {z} from "zod";

const drawRequestSchema = z.object({
    exchangeId: z.uuid(),
    name: z.string(),
});

export const handler = apiHandler("POST", async (event) => {
    const {data, error: validationError} = validateBody(drawRequestSchema, event);
    if (validationError) return badRequest(validationError);

    const linkExchangesCol = await getLinkExchangesCollection();

    const result = await linkExchangesCol.findOneAndUpdate(
        {exchangeId: data.exchangeId, participants: {$elemMatch: {name: data.name, hasDrawn: false}}},
        {$set: {"participants.$.hasDrawn": true}},
        {returnDocument: "after"}
    );

    if (result) {
        const participant = result.participants.find(p => p.name === data.name);
        return ok({recipient: participant.recipient});
    }

    const exchange = await linkExchangesCol.findOne({exchangeId: data.exchangeId});
    if (!exchange) return notFound("Exchange not found");

    const participant = exchange.participants.find(p => p.name === data.name);
    if (!participant) return notFound("Name not found");

    return error(409, "Already viewed — this name has already been drawn");
}, {maxRequests: 60, windowMs: 60000});
