import {z} from "zod";
import {apiHandler, validateBody} from "../shared/middleware.mjs";
import {extractTokenFromPath, getUserByToken} from "../shared/auth.mjs";
import {ok, badRequest, unauthorized} from "../shared/responses.mjs";
import {forEachGiverOf, sendNotificationEmail} from "../shared/giverNotification.mjs";

const contactPostRequestSchema = z.object({
    address: z.string().default("Not provided"),
    phone: z.string().default("Not provided"),
    notes: z.string().default("None"),
});

export const handler = apiHandler("POST", async (event) => {
    const token = extractTokenFromPath(event, "user");
    if (!token) return badRequest("Token required");

    const {data, error} = validateBody(contactPostRequestSchema, event);
    if (error) return badRequest(error);

    const user = await getUserByToken(token);
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
});
