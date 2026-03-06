import {getUsersCollection, getExchangesCollection} from "../shared/db.mjs";
import {apiHandler} from "../shared/middleware.mjs";
import {ok, badRequest} from "../shared/responses.mjs";
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
        assignments: exchange.assignments.map(a => ({
            giver: userIdToName[a.giverId.toString()],
            recipient: userIdToName[a.recipientId.toString()],
        })),
    };
}

export const handler = apiHandler("GET", async (event) => {
    const email = event.queryStringParameters?.email;
    if (!email) return badRequest("Email required");

    const usersCol = await getUsersCollection();
    const exchangesCol = await getExchangesCollection();

    const user = await usersCol.findOne({email: email.trim()});
    if (!user) return ok([]);

    const exchanges = await exchangesCol
        .find({participants: user._id})
        .sort({createdAt: -1})
        .toArray();

    if (exchanges.length === 0) return ok([]);

    const results = await Promise.all(exchanges.map(ex => enrichExchange(exchangeSchema.parse(ex), usersCol)));
    return ok(results);
});
