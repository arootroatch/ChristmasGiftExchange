import {getUsersCollection, getExchangesCollection} from "../shared/db.mjs";
import {apiHandler} from "../shared/middleware.mjs";
import {ok, badRequest, notFound} from "../shared/responses.mjs";

export const handler = apiHandler("GET", async (event) => {
    const email = event.queryStringParameters?.email;
    if (!email) return badRequest("Email required");

    const usersCol = await getUsersCollection();
    const exchangesCol = await getExchangesCollection();

    const user = await usersCol.findOne({email: email.trim()});
    if (!user) return notFound("Email not found");

    const exchange = await exchangesCol
        .find({participants: user._id})
        .sort({createdAt: -1})
        .limit(1)
        .toArray();

    if (exchange.length === 0) return notFound("Email not found");

    const latestExchange = exchange[0];
    const assignment = latestExchange.assignments.find(a => a.giverId.equals(user._id));
    if (!assignment) return notFound("Email not found");

    const doc = await usersCol.findOne({_id: assignment.recipientId});
    if (!doc) return notFound("Email not found");

    return ok({
        giverName: user.name,
        recipient: doc.name,
        date: latestExchange.createdAt,
        exchangeId: latestExchange.exchangeId,
    });
});
