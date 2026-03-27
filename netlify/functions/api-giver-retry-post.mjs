import {z} from "zod";
import {apiHandler, validateBody, requireAuth} from "../shared/middleware.mjs";
import {ok, badRequest, forbidden, notFound} from "../shared/responses.mjs";
import {sendNotificationEmail, sendBatchEmails} from "../shared/giverNotification.mjs";
import {getUsersCollection, getExchangesCollection} from "../shared/db.mjs";

const requestSchema = z.object({
    exchangeId: z.string(),
    participantEmails: z.array(z.email()).optional(),
});

function buildIdToUser(users) {
    return Object.fromEntries(users.map(u => [u._id.toString(), u]));
}

function resolveAssignments(assignments, idToUser) {
    return assignments.map(a => ({
        giver: idToUser[a.giverId.toString()]?.name,
        recipient: idToUser[a.recipientId.toString()]?.name,
    }));
}

function toParticipantList(users) {
    return users.map(p => ({name: p.name, email: p.email}));
}

function applyEmailFilter(participants, assignments, emails) {
    const allEmails = new Set(participants.map(p => p.email));
    const invalid = emails.filter(e => !allEmails.has(e));
    if (invalid.length > 0) {
        return {error: badRequest(`Emails not found in exchange: ${invalid.join(', ')}`)};
    }
    const filterSet = new Set(emails);
    const filtered = participants.filter(p => filterSet.has(p.email));
    const filterNames = new Set(filtered.map(p => p.name));
    return {
        participants: filtered,
        assignments: assignments.filter(a => filterNames.has(a.giver)),
    };
}

function buildSendResult(total, emailsFailed) {
    return {sent: total - emailsFailed.length, total, emailsFailed};
}

async function alertEmailFailures(emailsFailed, assignments) {
    try {
        await sendNotificationEmail(
            "error-alert",
            "alex@gift-exchange-generator.com",
            "Gift Exchange - Email Send Failures",
            {
                endpoint: "api-giver-retry-post",
                timestamp: new Date().toISOString(),
                stackTrace: `Failed to send emails to:\n${emailsFailed.join('\n')}\n\nAssignments: ${JSON.stringify(assignments, null, 2)}`,
            }
        );
    } catch (err) {
        console.error("Failed to send error-alert email:", err);
    }
}

async function fetchExchangeAsOrganizer(exchangeId, user) {
    const exchangesCol = await getExchangesCollection();
    const exchange = await exchangesCol.findOne({exchangeId});
    if (!exchange) return {error: notFound("Exchange not found")};
    if (!exchange.organizer || !exchange.organizer.equals(user._id)) {
        return {error: forbidden("Only the organizer can resend giver emails")};
    }
    return {exchange};
}

async function lookupParticipantUsers(assignments) {
    const usersCol = await getUsersCollection();
    const participantIds = [...new Set(assignments.flatMap(a => [a.giverId, a.recipientId]))];
    return usersCol.find({_id: {$in: participantIds}}).toArray();
}

export const handler = apiHandler("POST", async (event) => {
    const authError = await requireAuth(event);
    if (authError) return authError;

    const {data, error} = validateBody(requestSchema, event);
    if (error) return badRequest(error);

    const {exchange, error: exchangeError} = await fetchExchangeAsOrganizer(data.exchangeId, event.user);
    if (exchangeError) return exchangeError;

    const participantUsers = await lookupParticipantUsers(exchange.assignments);
    const idToUser = buildIdToUser(participantUsers);
    const allParticipants = toParticipantList(participantUsers);
    const allAssignments = resolveAssignments(exchange.assignments, idToUser);

    const {participants, assignments, error: filterError} = data.participantEmails
        ? applyEmailFilter(allParticipants, allAssignments, data.participantEmails)
        : {participants: allParticipants, assignments: allAssignments};
    if (filterError) return filterError;

    const userByEmail = Object.fromEntries(participantUsers.map(u => [u.email, u]));
    const {emailsFailed} = await sendBatchEmails(participants, assignments, userByEmail, data.exchangeId);

    if (emailsFailed.length > 0) {
        await alertEmailFailures(emailsFailed, assignments);
    }

    return ok(buildSendResult(assignments.length, emailsFailed));
}, {maxRequests: 5, windowMs: 60000});
