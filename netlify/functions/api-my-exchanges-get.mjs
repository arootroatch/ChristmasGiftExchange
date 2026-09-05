import {getUsersCollection, getExchangesCollection, getLinkExchangesCollection} from "../shared/db.mjs";
import {apiHandler} from "../shared/middleware.mjs";
import {ok} from "../shared/responses.mjs";
import {exchangeSchema} from "../shared/schemas/exchange.mjs";

async function enrichExchange(exchange, usersCol) {
    const participantUsers = await usersCol
        .find({_id: {$in: exchange.participants}})
        .toArray();

    const userIdToName = {};
    participantUsers.forEach(u => {
        userIdToName[u._id.toString()] = u.name;
    });

    return {
        exchangeId: exchange.exchangeId,
        createdAt: exchange.createdAt,
        isSecretSanta: exchange.isSecretSanta,
        participantNames: exchange.participants.map(id => userIdToName[id.toString()]),
        houses: exchange.houses.map(h => ({
            name: h.name,
            members: h.members.map(id => userIdToName[id.toString()]),
        })),
        participants: participantUsers.map(u => ({
            name: u.name,
            email: u.email,
        })),
    };
}

function enrichLinkExchange(exchange) {
    return {
        exchangeId: exchange.exchangeId,
        createdAt: exchange.createdAt,
        isSecretSanta: true,
        isLinkMode: true,
        participantNames: exchange.participants.map(p => p.name),
        houses: exchange.houses.map(h => ({name: h.name, members: h.members})),
        participants: exchange.participants.map(p => ({name: p.name})),
    };
}

export const handler = apiHandler("GET", async (event) => {
    const user = event.user;
    const usersCol = await getUsersCollection();
    const exchangesCol = await getExchangesCollection();
    const linkExchangesCol = await getLinkExchangesCollection();

    const exchanges = await exchangesCol
        .find({participants: user._id})
        .sort({createdAt: -1})
        .toArray();
    const linkExchanges = await linkExchangesCol
        .find({organizer: user._id})
        .sort({createdAt: -1})
        .toArray();

    const enrichedExchanges = await Promise.all(exchanges.map(ex => enrichExchange(exchangeSchema.parse(ex), usersCol)));
    const enrichedLinkExchanges = linkExchanges.map(enrichLinkExchange);

    const results = [...enrichedExchanges, ...enrichedLinkExchanges]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return ok(results);
}, {auth: true, maxRequests: 30, windowMs: 60000});
