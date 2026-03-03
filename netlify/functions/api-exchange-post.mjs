import {getUsersCollection, getExchangesCollection} from "./db.mjs";
import crypto from "crypto";

export const handler = async (event) => {
    if (event.httpMethod !== "POST") {
        return {statusCode: 405, body: "Method Not Allowed"};
    }

    try {
        const {exchangeId, isSecretSanta, houses, participants, assignments} = JSON.parse(event.body);
        const usersCol = await getUsersCollection();
        const exchangesCol = await getExchangesCollection();

        // Upsert all participants into users collection
        const userMap = {};
        for (const participant of participants) {
            const result = await usersCol.findOneAndUpdate(
                {email: participant.email},
                {
                    $set: {name: participant.name, email: participant.email},
                    $setOnInsert: {
                        token: crypto.randomUUID(),
                        wishlists: [],
                        wishItems: [],
                    },
                },
                {upsert: true, returnDocument: "after"}
            );
            userMap[participant.name] = result;
        }

        // Build exchange document
        const exchangeDoc = {
            exchangeId,
            createdAt: new Date(),
            isSecretSanta,
            houses: houses.map(h => ({
                name: h.name,
                members: h.members.map(name => userMap[name]._id),
            })),
            participants: participants.map(p => userMap[p.name]._id),
            assignments: assignments.map(a => ({
                giverId: userMap[a.giver]._id,
                recipientId: userMap[a.recipient]._id,
            })),
        };

        await exchangesCol.insertOne(exchangeDoc);

        // Return participant data with tokens for email URLs
        const responseParticipants = participants.map(p => {
            const user = userMap[p.name];
            return {
                name: p.name,
                email: p.email,
                token: user.token,
            };
        });

        return {
            statusCode: 200,
            body: JSON.stringify({exchangeId, participants: responseParticipants}),
        };
    } catch (error) {
        return {statusCode: 500, body: JSON.stringify({error: error.message})};
    }
};
