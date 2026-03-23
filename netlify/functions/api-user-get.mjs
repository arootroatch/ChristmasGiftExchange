import {apiHandler, requireAuth} from "../shared/middleware.mjs";
import {ok} from "../shared/responses.mjs";

export const handler = apiHandler("GET", async (event) => {
    const authError = await requireAuth(event);
    if (authError) return authError;

    const user = event.user;

    return ok({
        name: user.name,
        wishlists: user.wishlists ?? [],
        wishItems: user.wishItems ?? [],
    });
}, {maxRequests: 30, windowMs: 60000});
