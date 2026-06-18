import {z} from "zod";
import {apiHandler, validateBody} from "../shared/middleware.mjs";
import {badRequest, unauthorized, okWithHeaders} from "../shared/responses.mjs";
import {getUsersCollection} from "../shared/db.mjs";
import {verifyCode} from "../shared/authCodes.mjs";
import {signSession, buildSessionCookie} from "../shared/jwt.mjs";
import {logger} from "../shared/logger.mjs";

const requestSchema = z.object({
    code: z.string(),
});

export const handler = apiHandler("POST", async (event) => {
    const {data, error} = validateBody(requestSchema, event);
    if (error) return badRequest(error);

    const email = process.env.ADMIN_EMAIL;
    const result = await verifyCode(email, data.code);
    if (!result.valid) {
        logger.warn("Admin login failed - invalid code", {endpoint: event.path, ip: event.ip});
        return unauthorized(result.error);
    }

    const usersCol = await getUsersCollection();
    const user = await usersCol.findOneAndUpdate(
        {email},
        {$set: {email}, $setOnInsert: {name: 'Admin', wishlists: [], wishItems: []}},
        {upsert: true, returnDocument: "after"}
    );

    logger.info("Admin login success", {endpoint: event.path, ip: event.ip});
    const jwt = await signSession(user._id.toString());
    return okWithHeaders({success: true}, {"Set-Cookie": buildSessionCookie(jwt)});
}, {maxRequests: 5, windowMs: 60000});
