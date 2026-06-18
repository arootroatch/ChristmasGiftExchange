import {z} from "zod";
import {apiHandler, validateBody} from "../shared/middleware.mjs";
import {ok, badRequest} from "../shared/responses.mjs";
import {getUsersCollection} from "../shared/db.mjs";
import {generateAndStoreCode} from "../shared/authCodes.mjs";
import {sendNotificationEmail} from "../shared/giverNotification.mjs";
import {logger} from "../shared/logger.mjs";

const requestSchema = z.object({
    email: z.email(),
});

export const handler = apiHandler("POST", async (event) => {
    const {data, error} = validateBody(requestSchema, event);
    if (error) return badRequest(error);

    const email = data.email.trim();
    const usersCol = await getUsersCollection();
    const user = await usersCol.findOne({email});

    if (user) {
        const code = await generateAndStoreCode(email);
        await sendNotificationEmail("verification-code", email, "Your Gift Exchange Verification Code", {code});
        logger.info("Auth code sent", {endpoint: event.path, ip: event.ip, email});
    } else {
        logger.info("Auth code requested - email not found", {endpoint: event.path, ip: event.ip, email});
    }

    return ok({sent: true});
}, {maxRequests: 3, windowMs: 60000});
