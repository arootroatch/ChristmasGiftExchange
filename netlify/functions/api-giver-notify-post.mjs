import {z} from "zod";
import {apiHandler, validateBody} from "../shared/middleware.mjs";
import {ok, badRequest} from "../shared/responses.mjs";
import {sendNotificationEmail} from "../shared/giverNotification.mjs";

const giverNotifyRequestSchema = z.object({
    email: z.email(),
    name: z.string(),
    recipient: z.string(),
    wishlistEditUrl: z.url().nullable().default(null),
});

export const handler = apiHandler("POST", async (event) => {
    const {data, error} = validateBody(giverNotifyRequestSchema, event);
    if (error) return badRequest(error);

    await sendNotificationEmail(
        "secret-santa",
        data.email,
        "Your gift exchange recipient name has arrived!",
        {
            name: data.name,
            recipient: data.recipient,
            wishlistEditUrl: data.wishlistEditUrl,
        }
    );

    return ok({});
});
