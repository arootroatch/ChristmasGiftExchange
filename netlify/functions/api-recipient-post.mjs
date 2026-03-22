import {z} from "zod";
import {getUsersCollection, getExchangesCollection} from "../shared/db.mjs";
import {apiHandler, validateBody} from "../shared/middleware.mjs";
import {ok, badRequest, unauthorized, notFound} from "../shared/responses.mjs";

const recipientRequestSchema = z.object({
    token: z.string(),
});

export const handler = apiHandler("POST", async (event) => {
    const {data, error} = validateBody(recipientRequestSchema, event);
    if (error) return badRequest(error);

    const usersCol = await getUsersCollection();
    const exchangesCol = await getExchangesCollection();

    const user = await usersCol.findOne({token: data.token});
    if (!user) return unauthorized("Invalid token");

    const exchange = await exchangesCol
        .find({participants: user._id})
        .sort({createdAt: -1})
        .limit(1)
        .toArray();

    if (exchange.length === 0) return notFound("No exchange found");

    const latestExchange = exchange[0];
    const assignment = latestExchange.assignments.find(a => a.giverId.equals(user._id));
    if (!assignment) return notFound("No assignment found");

    const recipient = await usersCol.findOne({_id: assignment.recipientId});
    if (!recipient) return notFound("Recipient not found");

    return ok({
        giverName: user.name,
        recipient: recipient.name,
        date: latestExchange.createdAt,
        exchangeId: latestExchange.exchangeId,
    });
}, {maxRequests: 30, windowMs: 60000});
