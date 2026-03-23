import {z} from "zod";
import {apiHandler, validateBody} from "../shared/middleware.mjs";
import {badRequest, unauthorized, okWithHeaders} from "../shared/responses.mjs";
import {getUsersCollection} from "../shared/db.mjs";
import {verifyCode} from "../shared/authCodes.mjs";
import {signSession, buildSessionCookie} from "../shared/jwt.mjs";

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
    if (!result.valid) return unauthorized(result.error);

    const usersCol = await getUsersCollection();
    let user;

    if (data.name) {
        user = await usersCol.findOneAndUpdate(
            {email},
            {
                $set: {name: data.name, email},
                $setOnInsert: {wishlists: [], wishItems: []},
            },
            {upsert: true, returnDocument: "after"}
        );
    } else {
        user = await usersCol.findOne({email});
        if (!user) return unauthorized("Authentication failed");
    }

    const jwt = await signSession(user._id.toString());
    return okWithHeaders(
        {success: true},
        {"Set-Cookie": buildSessionCookie(jwt)}
    );
}, {maxRequests: 5, windowMs: 60000});
