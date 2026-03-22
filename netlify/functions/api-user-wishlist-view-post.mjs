import {z} from "zod";
import {getUsersCollection, getExchangesCollection} from "../shared/db.mjs";
import {apiHandler, validateBody} from "../shared/middleware.mjs";
import {ok, badRequest, forbidden, notFound} from "../shared/responses.mjs";
import {userSchema} from "../shared/schemas/user.mjs";

const requestSchema = z.object({
    token: z.string(),
    exchangeId: z.string(),
});

export const handler = apiHandler("POST", async (event) => {
    const {data, error} = validateBody(requestSchema, event);
    if (error) return badRequest(error);

    const usersCol = await getUsersCollection();
    const exchangesCol = await getExchangesCollection();
    const giver = await usersCol.findOne({token: data.token});
    if (!giver) return forbidden("Access denied");

    const exchange = await exchangesCol.findOne({exchangeId: data.exchangeId});
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
}, {maxRequests: 30, windowMs: 60000});
