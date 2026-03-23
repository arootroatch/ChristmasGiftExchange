import {z} from "zod";
import {getUsersCollection} from "../shared/db.mjs";
import {apiHandler, validateBody} from "../shared/middleware.mjs";
import {ok, badRequest} from "../shared/responses.mjs";
import {sendNotificationEmail} from "../shared/giverNotification.mjs";
import {wishlistEditPath, absoluteUrl} from "../shared/links.mjs";

const requestSchema = z.object({
    email: z.email(),
});

export const handler = apiHandler("POST", async (event) => {
    const {data, error} = validateBody(requestSchema, event);
    if (error) return badRequest(error);

    const usersCol = await getUsersCollection();
    const user = await usersCol.findOne({email: data.email.trim()});

    if (user) {
        const wishlistEditUrl = absoluteUrl(wishlistEditPath(user.token));
        await sendNotificationEmail(
            "token-recovery",
            user.email,
            "Your Gift Exchange Token",
            {name: user.name, token: user.token, wishlistEditUrl}
        );
    }

    return ok({sent: true});
}, {maxRequests: 3, windowMs: 60000});
