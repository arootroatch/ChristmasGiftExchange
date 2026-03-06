import {getExchangesCollection, getUsersCollection} from "../shared/db.mjs";
import {apiHandler, validateBody} from "../shared/middleware.mjs";
import {badRequest, ok} from "../shared/responses.mjs";
import {z} from "zod";
import crypto from "crypto";

const participantInputSchema = z.object({
    name: z.string(),
    email: z.string(),
});

const assignmentInputSchema = z.object({
    giver: z.string(),
    recipient: z.string(),
});

const houseInputSchema = z.object({
    id: z.string().optional(),
    name: z.string(),
    members: z.array(z.string()),
});

const exchangePostRequestSchema = z.object({
    exchangeId: z.string(),
    isSecretSanta: z.boolean(),
    houses: z.array(houseInputSchema),
    participants: z.array(participantInputSchema),
    assignments: z.array(assignmentInputSchema),
});

async function upsertParticipants(usersCol, participants) {
    const userMap = {};
    for (const participant of participants) {
        userMap[participant.name] = await usersCol.findOneAndUpdate(
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
    const {data, error} = validateBody(exchangePostRequestSchema, event);
    if (error) return badRequest(error);

    const usersCol = await getUsersCollection();
    const exchangesCol = await getExchangesCollection();

    const userMap = await upsertParticipants(usersCol, data.participants);
    const exchangeDoc = buildExchangeDoc(data.exchangeId, data.isSecretSanta, data.houses, data.participants, data.assignments, userMap);
    await exchangesCol.insertOne(exchangeDoc);

    return ok(buildResponse(data.exchangeId, data.participants, userMap));
});
