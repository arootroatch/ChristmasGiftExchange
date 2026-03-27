import {apiHandler} from "../shared/middleware.mjs";
import {ok} from "../shared/responses.mjs";
import {userSchema} from "../shared/schemas/user.mjs";

const userResponseSchema = userSchema.omit({_id: true});

export const handler = apiHandler("GET", async (event) => {
    return ok(userResponseSchema.parse(event.user));
}, {auth: true, maxRequests: 30, windowMs: 60000});
