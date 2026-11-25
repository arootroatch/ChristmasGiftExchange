import {getUsersCollection, getExchangesCollection, getLinkExchangesCollection} from "../shared/db.mjs";
import {apiHandler} from "../shared/middleware.mjs";
import {ok} from "../shared/responses.mjs";
import {exchangeSchema} from "../shared/schemas/exchange.mjs";

const UNKNOWN_USER = {name: "Unknown", email: ""};

function organizerResults(exchange, usersById, user) {
    const lookup = id => usersById.get(id.toString()) ?? UNKNOWN_USER;
    return exchange.assignments.map(({giverId, recipientId}) => {
        const giver = lookup(giverId);
        const recipient = lookup(recipientId);
        return {
            giverName: giver.name,
            giverEmail: giver.email,
            recipientName: recipient.name,
            recipientEmail: recipient.email,
            recipientIsYou: recipientId.equals(user._id),
        };
    });
}

async function enrichExchange(exchange, usersCol, user) {
    const participantUsers = await usersCol
        .find({_id: {$in: exchange.participants}})
        .toArray();

    const usersById = new Map(participantUsers.map(u => [u._id.toString(), u]));
    const nameOf = id => usersById.get(id.toString())?.name;

    const isOrganizer = exchange.organizer?.equals(user._id) ?? false;

    return {
        exchangeId: exchange.exchangeId,
        createdAt: exchange.createdAt,
        isSecretSanta: exchange.isSecretSanta,
        participantNames: exchange.participants.map(nameOf),
        houses: exchange.houses.map(h => ({
            name: h.name,
            members: h.members.map(nameOf),
        })),
        participants: participantUsers.map(u => ({
            name: u.name,
            email: u.email,
        })),
        isOrganizer,
        ...(isOrganizer && {results: organizerResults(exchange, usersById, user)}),
    };
}

const normalizeName = name => name.trim().toLowerCase();

function linkResults(exchange, organizerName) {
    return exchange.participants.map(p => ({
        giverName: p.name,
        hasDrawn: p.hasDrawn,
        recipientName: p.hasDrawn ? p.recipient : null,
        recipientIsYou: p.hasDrawn && organizerName !== undefined && p.recipient === organizerName,
    }));
}

function enrichLinkExchange(exchange, user) {
    const organizerName = exchange.participants
        .find(p => normalizeName(p.name) === normalizeName(user.name))?.name;

    return {
        exchangeId: exchange.exchangeId,
        createdAt: exchange.createdAt,
        isSecretSanta: true,
        isLinkMode: true,
        participantNames: exchange.participants.map(p => p.name),
        houses: exchange.houses.map(h => ({name: h.name, members: h.members})),
        participants: exchange.participants.map(p => ({name: p.name})),
        isOrganizer: true,
        organizerMatched: organizerName !== undefined,
        results: linkResults(exchange, organizerName),
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

    const enrichedExchanges = await Promise.all(exchanges.map(ex => enrichExchange(exchangeSchema.parse(ex), usersCol, user)));
    const enrichedLinkExchanges = linkExchanges.map(ex => enrichLinkExchange(ex, user));

    const results = [...enrichedExchanges, ...enrichedLinkExchanges]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return ok(results);
}, {auth: true, maxRequests: 30, windowMs: 60000});
