import {z} from "zod";
import {apiHandler, validateBody} from "../shared/middleware.mjs";
import {ok, badRequest} from "../shared/responses.mjs";
import {getUsersCollection} from "../shared/db.mjs";
import {generateAndStoreCode} from "../shared/authCodes.mjs";
import {sendNotificationEmail} from "../shared/giverNotification.mjs";

const requestSchema = z.object({
    email: z.email(),
});

export const handler = apiHandler("POST", async (event) => {
    const {data, error} = validateBody(requestSchema, event);
    if (error) return badRequest(error);

    const usersCol = await getUsersCollection();
    const user = await usersCol.findOne({email: data.email.trim()});

    if (user) {
        const code = await generateAndStoreCode(data.email.trim());
        await sendNotificationEmail(
            "verification-code",
            data.email.trim(),
            "Your Gift Exchange Verification Code",
            {code}
        );
    }

    return ok({sent: true});
}, {maxRequests: 3, windowMs: 60000});
