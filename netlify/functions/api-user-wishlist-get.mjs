import {getUsersCollection, getExchangesCollection} from "../shared/db.mjs";
import {apiHandler, requireAuth} from "../shared/middleware.mjs";
import {ok, badRequest, forbidden, notFound} from "../shared/responses.mjs";
import {userSchema} from "../shared/schemas/user.mjs";

export const handler = apiHandler("GET", async (event) => {
    const authError = await requireAuth(event);
    if (authError) return authError;

    const exchangeId = event.queryStringParameters?.exchangeId;
    if (!exchangeId) return badRequest("Missing required field: exchangeId");

    const giver = event.user;
    const exchangesCol = await getExchangesCollection();
    const exchange = await exchangesCol.findOne({exchangeId});
    if (!exchange) return notFound("Exchange not found");

    const assignment = exchange.assignments.find(a => a.giverId.equals(giver._id));
    if (!assignment) return forbidden("You don't have access to view that participant's wish list");

    const usersCol = await getUsersCollection();
    const doc = await usersCol.findOne({_id: assignment.recipientId});
    if (!doc) return notFound("Recipient not found");
    const recipient = userSchema.parse(doc);

    return ok({
        recipientName: recipient.name,
        wishlists: recipient.wishlists,
        wishItems: recipient.wishItems,
    });
}, {maxRequests: 30, windowMs: 60000});
