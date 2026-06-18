import {z} from "zod";
import {apiHandler, validateBody} from "../shared/middleware.mjs";
import {badRequest, unauthorized, okWithHeaders} from "../shared/responses.mjs";
import {getUsersCollection} from "../shared/db.mjs";
import {verifyCode} from "../shared/authCodes.mjs";
import {signSession, buildSessionCookie} from "../shared/jwt.mjs";

const requestSchema = z.object({
    code: z.string(),
});

export const handler = apiHandler("POST", async (event) => {
    const {data, error} = validateBody(requestSchema, event);
    if (error) return badRequest(error);

    const email = process.env.ADMIN_EMAIL;
    const result = await verifyCode(email, data.code);
    if (!result.valid) return unauthorized(result.error);

    const usersCol = await getUsersCollection();
    const user = await usersCol.findOne({email});
    if (!user) return unauthorized("Admin user not found");

    const jwt = await signSession(user._id.toString());
    return okWithHeaders({success: true}, {"Set-Cookie": buildSessionCookie(jwt)});
}, {maxRequests: 5, windowMs: 60000});
