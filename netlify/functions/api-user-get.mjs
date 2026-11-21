import {apiHandler, requireAuth} from "../shared/middleware.mjs";
import {ok} from "../shared/responses.mjs";
import {userSchema} from "../shared/schemas/user.mjs";

const userResponseSchema = userSchema.omit({_id: true});

export const handler = apiHandler("GET", async (event) => {
    const authError = await requireAuth(event);
    if (authError) return ok(null);
    const user = userResponseSchema.parse(event.user);
    if (event.viewer) user.viewingAs = {name: user.name, email: user.email};
    return ok(user);
}, {maxRequests: 30, windowMs: 60000});
