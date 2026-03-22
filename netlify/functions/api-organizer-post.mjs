import {z} from "zod";
import crypto from "crypto";
import {getUsersCollection} from "../shared/db.mjs";
import {apiHandler, validateBody} from "../shared/middleware.mjs";
import {badRequest, ok} from "../shared/responses.mjs";

const organizerRequestSchema = z.object({
    name: z.string(),
    email: z.email(),
});

export const handler = apiHandler("POST", async (event) => {
    const {data, error} = validateBody(organizerRequestSchema, event);
    if (error) return badRequest(error);

    const usersCol = await getUsersCollection();
    const user = await usersCol.findOneAndUpdate(
        {email: data.email},
        {
            $set: {name: data.name, email: data.email},
            $setOnInsert: {
                token: crypto.randomUUID(),
                wishlists: [],
                wishItems: [],
            },
        },
        {upsert: true, returnDocument: "after"}
    );

    return ok({token: user.token});
}, {maxRequests: 30, windowMs: 60000});
