import {getLinkExchangesCollection} from "../shared/db.mjs";
import {apiHandler} from "../shared/middleware.mjs";
import {ok, notFound} from "../shared/responses.mjs";

export const handler = apiHandler("GET", async (event) => {
    const exchangeId = event.queryStringParameters?.exchangeId;
    if (!exchangeId) return notFound("Exchange not found");

    const linkExchangesCol = await getLinkExchangesCollection();
    const exchange = await linkExchangesCol.findOne(
        {exchangeId},
        {projection: {"participants.name": 1, "participants.hasDrawn": 1}}
    );
    if (!exchange) return notFound("Exchange not found");

    return ok({names: exchange.participants.map(p => ({name: p.name, hasDrawn: p.hasDrawn}))});
}, {maxRequests: 60, windowMs: 60000});
