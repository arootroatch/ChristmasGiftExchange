import {getUsersCollection, getExchangesCollection} from "../shared/db.mjs";
import {apiHandler, requireAuth} from "../shared/middleware.mjs";
import {ok, notFound} from "../shared/responses.mjs";

export const handler = apiHandler("GET", async (event) => {
    const authError = await requireAuth(event);
    if (authError) return authError;

    const user = event.user;
    const exchangesCol = await getExchangesCollection();

    const exchange = await exchangesCol
        .find({participants: user._id})
        .sort({createdAt: -1})
        .limit(1)
        .toArray();

    if (exchange.length === 0) return notFound("No exchange found");

    const latestExchange = exchange[0];
    const assignment = latestExchange.assignments.find(a => a.giverId.equals(user._id));
    if (!assignment) return notFound("No assignment found");

    const usersCol = await getUsersCollection();
    const recipient = await usersCol.findOne({_id: assignment.recipientId});
    if (!recipient) return notFound("Recipient not found");

    return ok({
        giverName: user.name,
        recipient: recipient.name,
        date: latestExchange.createdAt,
        exchangeId: latestExchange.exchangeId,
    });
}, {maxRequests: 30, windowMs: 60000});
