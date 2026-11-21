import {z} from "zod";
import {apiHandler, validateBody, requestEndpoint} from "../shared/middleware.mjs";
import {ok, badRequest} from "../shared/responses.mjs";
import {getUsersCollection} from "../shared/db.mjs";
import {generateAndStoreCode} from "../shared/authCodes.mjs";
import {sendNotificationEmail} from "../shared/giverNotification.mjs";
import {logger} from "../shared/logger.mjs";
import {checkEmailRateLimit} from "../shared/rateLimit.mjs";

const EMAIL_LIMIT = {
    maxRequests: 5,
    windowMs: 60 * 60 * 1000,
    message: "Too many code requests for this email. Please use your latest code or try again later.",
};

const requestSchema = z.object({
    email: z.email(),
    createIfMissing: z.boolean().optional(),
});

export const handler = apiHandler("POST", async (event) => {
    const {data, error} = validateBody(requestSchema, event);
    if (error) return badRequest(error);

    const email = data.email.trim();

    // Counts every request, known email or not, so a 429 can't reveal which emails have accounts.
    const limited = await checkEmailRateLimit(email, "api-auth-code-post", EMAIL_LIMIT);
    if (limited) return limited;

    const usersCol = await getUsersCollection();
    const user = await usersCol.findOne({email});

    // The user itself is only created by api-auth-verify-post, once the code proves they own the email.
    if (user || data.createIfMissing) {
        const code = await generateAndStoreCode(email);
        await sendNotificationEmail("verification-code", email, "Your Gift Exchange Verification Code", {code});
        logger.info("Auth code sent", {endpoint: requestEndpoint(event), ip: event.ip, email});
    } else {
        logger.info("Auth code requested - email not found", {endpoint: requestEndpoint(event), ip: event.ip, email});
    }

    return ok({sent: true});
}, {allowDuringViewAs: true, maxRequests: 3, windowMs: 60000});
