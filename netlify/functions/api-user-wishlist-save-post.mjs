import {getUsersCollection} from "../shared/db.mjs";
import {apiHandler, validateBody} from "../shared/middleware.mjs";
import {getUserByToken} from "../shared/auth.mjs";
import {ok, badRequest, unauthorized} from "../shared/responses.mjs";
import {forEachGiverOf, sendNotificationEmail} from "../shared/giverNotification.mjs";
import {wishlistViewPath, absoluteUrl} from "../shared/links.mjs";
import {userSchema} from "../shared/schemas/user.mjs";
import {z} from "zod";

const wishlistSaveRequestSchema = userSchema
    .pick({wishlists: true, wishItems: true})
    .extend({token: z.uuid()});

export const handler = apiHandler("POST", async (event) => {
    const {data, error} = validateBody(wishlistSaveRequestSchema, event);
    if (error) return badRequest(error);

    const user = await getUserByToken(data.token);
    if (!user) return unauthorized("User not found");

    const wasEmpty = user.wishlists.length === 0 && user.wishItems.length === 0;

    const usersCol = await getUsersCollection();
    await usersCol.updateOne(
        {token: data.token},
        {$set: {wishlists: data.wishlists, wishItems: data.wishItems}}
    );

    let notifiedGivers = false;
    if (wasEmpty && (data.wishlists.length > 0 || data.wishItems.length > 0)) {
        await forEachGiverOf(user, async ({giver, exchange}) => {
            const viewUrl = absoluteUrl(wishlistViewPath(giver.token, exchange.exchangeId));
            await sendNotificationEmail(
                "wishlist-notification",
                giver.email,
                `${user.name} has added a wishlist!`,
                {
                    recipientName: user.name,
                    wishlistViewUrl: viewUrl,
                }
            );
        });
        notifiedGivers = true;
    }

    return ok({success: true, notifiedGivers});
}, {maxRequests: 30, windowMs: 60000});
