import {getUsersCollection, getExchangesCollection, getLegacyCollection} from "../shared/db.mjs";
import {wishlistViewPath} from "../shared/links.mjs";
import {apiHandler} from "../shared/middleware.mjs";
import {ok, badRequest, notFound} from "../shared/responses.mjs";
import {userSchema} from "../shared/schemas/user.mjs";

async function lookupFromNewCollections(email) {
    const usersCol = await getUsersCollection();
    const exchangesCol = await getExchangesCollection();

    const user = await usersCol.findOne({email: email.trim()});
    if (!user) return null;

    const exchange = await exchangesCol
        .find({participants: user._id})
        .sort({createdAt: -1})
        .limit(1)
        .toArray();

    if (exchange.length === 0) return null;

    const latestExchange = exchange[0];
    const assignment = latestExchange.assignments.find(a => a.giverId.equals(user._id));
    if (!assignment) return null;

    const doc = await usersCol.findOne({_id: assignment.recipientId});
    if (!doc) return null;
    const recipient = userSchema.parse(doc);
    const hasWishlist = recipient.wishlists.length > 0 || recipient.wishItems.length > 0;

    const result = {
        giverName: user.name,
        recipient: recipient.name,
        date: latestExchange.createdAt,
    };

    if (hasWishlist) {
        result.wishlistViewUrl = wishlistViewPath(user.token, latestExchange.exchangeId);
    }

    return ok(result);
}

async function lookupFromLegacy(email) {
    const legacyCol = await getLegacyCollection();
    const legacyResults = await legacyCol
        .find({email: email.trim()})
        .sort({date: -1})
        .toArray();

    if (legacyResults.length === 0) return null;

    return ok({
        recipient: legacyResults[0].recipient,
        date: legacyResults[0].date,
    });
}

export const handler = apiHandler("GET", async (event) => {
    const email = event.queryStringParameters?.email;
    if (!email) return badRequest("Email required");

    const newResult = await lookupFromNewCollections(email);
    if (newResult) return newResult;

    const legacyResult = await lookupFromLegacy(email);
    if (legacyResult) return legacyResult;

    return notFound("Email not found");
});
