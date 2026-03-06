import {apiHandler} from "../shared/middleware.mjs";
import {getUserByToken} from "../shared/auth.mjs";
import {ok, badRequest, unauthorized} from "../shared/responses.mjs";

export const handler = apiHandler("GET", async (event) => {
    const token = event.path.split("/").pop();
    if (!token) {
        return badRequest("Token required");
    }

    const user = await getUserByToken(token);
    if (!user) {
        return unauthorized("User not found");
    }

    return ok({
        name: user.name,
        wishlists: user.wishlists || [],
        wishItems: user.wishItems || [],
    });
});
