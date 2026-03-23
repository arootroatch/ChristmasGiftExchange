import {z} from "zod";
import {apiHandler, validateBody, requireAuth} from "../shared/middleware.mjs";
import {ok, badRequest, forbidden, notFound} from "../shared/responses.mjs";
import {sendNotificationEmail, sendBatchEmails} from "../shared/giverNotification.mjs";
import {getUsersCollection, getExchangesCollection} from "../shared/db.mjs";

const requestSchema = z.object({
    exchangeId: z.string(),
    participantEmails: z.array(z.email()).optional(),
});

export const handler = apiHandler("POST", async (event) => {
    const authError = await requireAuth(event);
    if (authError) return authError;

    const {data, error} = validateBody(requestSchema, event);
    if (error) return badRequest(error);

    const usersCol = await getUsersCollection();
    const user = event.user;

    const exchangesCol = await getExchangesCollection();
    const exchange = await exchangesCol.findOne({exchangeId: data.exchangeId});
    if (!exchange) return notFound("Exchange not found");

    if (!exchange.organizer || !exchange.organizer.equals(user._id)) {
        return forbidden("Only the organizer can resend giver emails");
    }

    // Look up all participants from DB
    const participantIds = [...new Set(exchange.assignments.flatMap(a => [a.giverId, a.recipientId]))];
    const participantUsers = await usersCol.find({_id: {$in: participantIds}}).toArray();

    const idToUser = {};
    participantUsers.forEach(p => { idToUser[p._id.toString()] = p; });

    let participants = participantUsers.map(p => ({name: p.name, email: p.email}));
    let assignments = exchange.assignments.map(a => ({
        giver: idToUser[a.giverId.toString()]?.name,
        recipient: idToUser[a.recipientId.toString()]?.name,
    }));

    // If participantEmails provided, validate and filter
    if (data.participantEmails) {
        const allEmails = new Set(participants.map(p => p.email));
        const invalid = data.participantEmails.filter(e => !allEmails.has(e));
        if (invalid.length > 0) {
            return badRequest(`Emails not found in exchange: ${invalid.join(', ')}`);
        }

        const filterSet = new Set(data.participantEmails);
        participants = participants.filter(p => filterSet.has(p.email));

        const filterNames = new Set(participants.map(p => p.name));
        assignments = assignments.filter(a => filterNames.has(a.giver));
    }

    // Build userByEmail map
    const userByEmail = {};
    participantUsers.forEach(u => { userByEmail[u.email] = u; });

    const {emailsFailed} = await sendBatchEmails(participants, assignments, userByEmail, data.exchangeId);

    const total = assignments.length;
    const sent = total - emailsFailed.length;

    if (emailsFailed.length > 0) {
        try {
            await sendNotificationEmail(
                "error-alert",
                "alex@soundrootsproductions.com",
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

    return ok({sent, total, emailsFailed});
}, {maxRequests: 5, windowMs: 60000});
