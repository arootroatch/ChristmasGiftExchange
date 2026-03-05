import {getUsersCollection, getExchangesCollection} from "../shared/db.mjs";

export const handler = async (event) => {
    if (event.httpMethod !== "GET") {
        return {statusCode: 405, body: "Method Not Allowed"};
    }

    const email = event.queryStringParameters?.email;
    if (!email) {
        return {statusCode: 400, body: JSON.stringify({error: "Email required"})};
    }

    try {
        const usersCol = await getUsersCollection();
        const exchangesCol = await getExchangesCollection();

        const user = await usersCol.findOne({email: email.trim()});
        if (!user) {
            return {statusCode: 200, body: JSON.stringify([])};
        }

        const exchanges = await exchangesCol
            .find({participants: user._id})
            .sort({createdAt: -1})
            .toArray();

        if (exchanges.length === 0) {
            return {statusCode: 200, body: JSON.stringify([])};
        }

        const results = await Promise.all(exchanges.map(async (exchange) => {
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
        }));

        return {
            statusCode: 200,
            body: JSON.stringify(results),
        };
    } catch (error) {
        return {statusCode: 500, body: JSON.stringify({error: error.message})};
    }
};
