import {z} from "zod";
import {apiHandler, requireAuth, validateBody} from "../shared/middleware.mjs";
import {ok, badRequest} from "../shared/responses.mjs";
import {forEachGiverOf, sendNotificationEmail} from "../shared/giverNotification.mjs";

const contactPostRequestSchema = z.object({
    address: z.string().default("Not provided"),
    phone: z.string().default("Not provided"),
    notes: z.string().default("None"),
});

export const handler = apiHandler("POST", async (event) => {
    const authError = await requireAuth(event);
    if (authError) return authError;

    const {data, error} = validateBody(contactPostRequestSchema, event);
    if (error) return badRequest(error);

    const user = event.user;

    await forEachGiverOf(user, async ({giver}) => {
        await sendNotificationEmail(
            "contact-info",
            giver.email,
            `${user.name} has shared their contact information!`,
            {
                recipientName: user.name,
                address: data.address,
                phone: data.phone,
                notes: data.notes,
            }
        );
    });

    return ok({success: true});
}, {maxRequests: 5, windowMs: 60000});
