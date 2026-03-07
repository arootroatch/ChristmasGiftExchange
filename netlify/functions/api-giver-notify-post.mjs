import {z} from "zod";
import {apiHandler, validateBody} from "../shared/middleware.mjs";
import {ok, badRequest} from "../shared/responses.mjs";
import {sendNotificationEmail} from "../shared/giverNotification.mjs";
import {getUsersCollection} from "../shared/db.mjs";

const giverNotifyRequestSchema = z.object({
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

    let sent = 0;
    const total = data.assignments.length;

    for (const assignment of data.assignments) {
        const participant = data.participants.find(p => p.name === assignment.giver);
        const user = userByEmail[participant.email];
        const wishlistEditUrl = user
            ? `${process.env.URL}/wishlist/edit/${user.token}`
            : null;

        try {
            await sendNotificationEmail(
                "secret-santa",
                participant.email,
                "Your gift exchange recipient name has arrived!",
                {
                    name: assignment.giver,
                    recipient: assignment.recipient,
                    wishlistEditUrl,
                }
            );
            sent++;
        } catch (err) {
            console.error(`Failed to send email to ${participant.email}:`, err);
        }
    }

    return ok({sent, total});
});
