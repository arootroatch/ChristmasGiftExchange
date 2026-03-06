import {getUsersCollection, getExchangesCollection} from "../shared/db.mjs";
import {apiHandler} from "../shared/middleware.mjs";
import {ok} from "../shared/responses.mjs";
import crypto from "crypto";

async function upsertParticipants(usersCol, participants) {
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
    return userMap;
}

function buildExchangeDoc(exchangeId, isSecretSanta, houses, participants, assignments, userMap) {
    return {
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
}

function buildResponse(exchangeId, participants, userMap) {
    const responseParticipants = participants.map(p => {
        const user = userMap[p.name];
        return {
            name: p.name,
            email: p.email,
            token: user.token,
        };
    });
    return {exchangeId, participants: responseParticipants};
}

export const handler = apiHandler("POST", async (event) => {
    const {exchangeId, isSecretSanta, houses, participants, assignments} = JSON.parse(event.body);
    const usersCol = await getUsersCollection();
    const exchangesCol = await getExchangesCollection();

    const userMap = await upsertParticipants(usersCol, participants);
    const exchangeDoc = buildExchangeDoc(exchangeId, isSecretSanta, houses, participants, assignments, userMap);
    await exchangesCol.insertOne(exchangeDoc);

    return ok(buildResponse(exchangeId, participants, userMap));
});
