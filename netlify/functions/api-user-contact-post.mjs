import {z} from "zod";
import {apiHandler, validateBody} from "../shared/middleware.mjs";
import {ok, badRequest, unauthorized} from "../shared/responses.mjs";
import {getUsersCollection} from "../shared/db.mjs";
import {forEachGiverOf, sendNotificationEmail} from "../shared/giverNotification.mjs";

const contactPostRequestSchema = z.object({
    token: z.string(),
    address: z.string().default("Not provided"),
    phone: z.string().default("Not provided"),
    notes: z.string().default("None"),
});

export const handler = apiHandler("POST", async (event) => {
    const {data, error} = validateBody(contactPostRequestSchema, event);
    if (error) return badRequest(error);

    const usersCol = await getUsersCollection();
    const user = await usersCol.findOne({token: data.token});
    if (!user) return unauthorized("User not found");

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
