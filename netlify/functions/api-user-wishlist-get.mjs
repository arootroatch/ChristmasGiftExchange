import {getUsersCollection, getExchangesCollection} from "../shared/db.mjs";
import {apiHandler} from "../shared/middleware.mjs";
import {ok, badRequest, forbidden, notFound} from "../shared/responses.mjs";
import {userSchema} from "../shared/schemas/user.mjs";

export const handler = apiHandler("GET", async (event) => {
    const exchangeId = event.path.split("/").pop();
    const token = event.queryStringParameters?.token;

    if (!token || !exchangeId) return badRequest("Token and exchangeId required");

    const usersCol = await getUsersCollection();
    const exchangesCol = await getExchangesCollection();
    const giver = await usersCol.findOne({token});
    if (!giver) return forbidden("Access denied");

    const exchange = await exchangesCol.findOne({exchangeId});
    if (!exchange) return notFound("Exchange not found");

    const assignment = exchange.assignments.find(a => a.giverId.equals(giver._id));
    if (!assignment) return forbidden("You don't have access to view that participant's wish list");

    const doc = await usersCol.findOne({_id: assignment.recipientId});
    if (!doc) return notFound("Recipient not found");
    const recipient = userSchema.parse(doc);

    return ok({
        recipientName: recipient.name,
        wishlists: recipient.wishlists,
        wishItems: recipient.wishItems,
    });
});
