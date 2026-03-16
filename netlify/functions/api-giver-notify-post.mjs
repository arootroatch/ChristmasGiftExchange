import {z} from "zod";
import {apiHandler, validateBody} from "../shared/middleware.mjs";
import {ok, badRequest} from "../shared/responses.mjs";
import {sendNotificationEmail, sendEmailsWithRetry} from "../shared/giverNotification.mjs";
import {getUsersCollection} from "../shared/db.mjs";

const giverNotifyRequestSchema = z.object({
    exchangeId: z.string(),
    participants: z.array(z.object({
        name: z.string(),
        email: z.email(),
    })),
    assignments: z.array(z.object({
        giver: z.string(),
        recipient: z.string(),
    })),
});

export const handler = apiHandler("POST", async (event) => {
    const {data, error} = validateBody(giverNotifyRequestSchema, event);
    if (error) return badRequest(error);

    const usersCol = await getUsersCollection();
    const emails = data.participants.map(p => p.email);
    const users = await usersCol.find({email: {$in: emails}}).toArray();

    const userByEmail = {};
    users.forEach(u => { userByEmail[u.email] = u; });

    const {emailsFailed} = await sendEmailsWithRetry(data.participants, data.assignments, userByEmail, data.exchangeId);

    const sent = data.assignments.length - emailsFailed.length;

    if (emailsFailed.length > 0) {
        try {
            await sendNotificationEmail(
                "error-alert",
                "alex@soundrootsproductions.com",
                "Gift Exchange - Email Send Failures",
                {
                    endpoint: "api-giver-notify-post",
                    timestamp: new Date().toISOString(),
                    stackTrace: `Failed to send emails to:\n${emailsFailed.join('\n')}\n\nAssignments: ${JSON.stringify(data.assignments, null, 2)}`,
                }
            );
        } catch (err) {
            console.error("Failed to send error-alert email:", err);
        }
    }

    return ok({sent, total: data.assignments.length, emailsFailed});
});
