import {getUsersCollection, getExchangesCollection} from "../shared/db.mjs";
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

export const handler = apiHandler("GET", async (event) => {
    const user = event.user;
    const usersCol = await getUsersCollection();
    const exchangesCol = await getExchangesCollection();

    const exchanges = await exchangesCol
        .find({participants: user._id})
        .sort({createdAt: -1})
        .toArray();

    if (exchanges.length === 0) return ok([]);

    const results = await Promise.all(exchanges.map(ex => enrichExchange(exchangeSchema.parse(ex), usersCol)));
    return ok(results);
}, {auth: true, maxRequests: 30, windowMs: 60000});
