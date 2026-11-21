import {z} from "zod";
import {apiHandler, validateBody, requestEndpoint} from "../shared/middleware.mjs";
import {badRequest, unauthorized, okWithHeaders} from "../shared/responses.mjs";
import {getUsersCollection} from "../shared/db.mjs";
import {verifyCode} from "../shared/authCodes.mjs";
import {signSession, buildSessionCookie} from "../shared/jwt.mjs";
import {logger} from "../shared/logger.mjs";

const requestSchema = z.object({
    email: z.email(),
    code: z.string(),
    name: z.string().optional(),
});

export const handler = apiHandler("POST", async (event) => {
    const {data, error} = validateBody(requestSchema, event);
    if (error) return badRequest(error);

    const email = data.email.trim();
    const result = await verifyCode(email, data.code);
    if (!result.valid) {
        logger.warn("Login failed - invalid code", {endpoint: requestEndpoint(event), ip: event.ip, email});
        return unauthorized(result.error);
    }

    const usersCol = await getUsersCollection();
    let user;

    if (data.name) {
        const isNew = !(await usersCol.findOne({email}));
        user = await usersCol.findOneAndUpdate(
            {email},
            {
                $setOnInsert: {name: data.name, wishlists: [], wishItems: []},
            },
            {upsert: true, returnDocument: "after"}
        );
        if (isNew) logger.info("New user created", {endpoint: requestEndpoint(event), ip: event.ip, email});
        else logger.info("Login success", {endpoint: requestEndpoint(event), ip: event.ip, email});
    } else {
        user = await usersCol.findOne({email});
        if (!user) return unauthorized("Authentication failed");
        logger.info("Login success", {endpoint: requestEndpoint(event), ip: event.ip, email});
    }

    const jwt = await signSession(user._id.toString());
    return okWithHeaders(
        {success: true, name: user.name},
        {"Set-Cookie": buildSessionCookie(jwt)}
    );
}, {allowDuringViewAs: true, maxRequests: 5, windowMs: 60000});
