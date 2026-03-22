import {z} from "zod";
import {apiHandler, validateBody} from "../shared/middleware.mjs";
import {ok, badRequest, unauthorized} from "../shared/responses.mjs";
import {getUsersCollection} from "../shared/db.mjs";

const requestSchema = z.object({
    token: z.string(),
});

export const handler = apiHandler("POST", async (event) => {
    const {data, error} = validateBody(requestSchema, event);
    if (error) return badRequest(error);

    const usersCol = await getUsersCollection();
    const user = await usersCol.findOne({token: data.token});
    if (!user) return unauthorized("User not found");

    return ok({
        name: user.name,
        wishlists: user.wishlists ?? [],
        wishItems: user.wishItems ?? [],
    });
}, {maxRequests: 30, windowMs: 60000});
