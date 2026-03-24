import {getExchangesCollection} from "../shared/db.mjs";
import {apiHandler, requireAuth} from "../shared/middleware.mjs";
import {ok, badRequest, forbidden, notFound} from "../shared/responses.mjs";
import {getRecipientWishlist} from "../shared/recipientWishlist.mjs";

export const handler = apiHandler("GET", async (event) => {
    const authError = await requireAuth(event);
    if (authError) return authError;

    const exchangeId = event.queryStringParameters?.exchangeId;
    if (!exchangeId) return badRequest("Missing required field: exchangeId");

    const giver = event.user;
    const exchangesCol = await getExchangesCollection();
    const exchange = await exchangesCol.findOne({exchangeId});
    if (!exchange) return notFound("Exchange not found");

    const wishlistData = await getRecipientWishlist(exchange, giver._id);
    if (!wishlistData) return forbidden("You don't have access to view that participant's wish list");

    return ok(wishlistData);
}, {maxRequests: 30, windowMs: 60000});
