import {getExchangesCollection} from "../shared/db.mjs";
import {apiHandler, requireAuth} from "../shared/middleware.mjs";
import {ok, notFound} from "../shared/responses.mjs";
import {getRecipientWishlist} from "../shared/recipientWishlist.mjs";

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
    const wishlistData = await getRecipientWishlist(latestExchange, user._id);
    if (!wishlistData) return notFound("No assignment found");

    return ok({
        ...wishlistData,
        date: latestExchange.createdAt,
        exchangeId: latestExchange.exchangeId,
    });
}, {maxRequests: 30, windowMs: 60000});
