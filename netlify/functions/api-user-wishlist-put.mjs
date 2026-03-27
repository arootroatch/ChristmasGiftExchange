import {apiHandler, validateBody} from "../shared/middleware.mjs";
import {ok, badRequest} from "../shared/responses.mjs";
import {getUsersCollection} from "../shared/db.mjs";
import {forEachGiverOf, sendNotificationEmail} from "../shared/giverNotification.mjs";
import {userSchema} from "../shared/schemas/user.mjs";

const wishlistPutRequestSchema = userSchema.pick({wishlists: true, wishItems: true, currency: true});

export const handler = apiHandler("PUT", async (event) => {
    const {data, error} = validateBody(wishlistPutRequestSchema, event);
    if (error) return badRequest(error);

    const user = event.user;
    const wasEmpty = user.wishlists.length === 0 && user.wishItems.length === 0;

    const usersCol = await getUsersCollection();
    await usersCol.updateOne(
        {_id: user._id},
        {$set: {wishlists: data.wishlists, wishItems: data.wishItems, currency: data.currency}}
    );

    let notifiedGivers = false;
    if (wasEmpty && (data.wishlists.length > 0 || data.wishItems.length > 0)) {
        await forEachGiverOf(user, async ({giver, exchange}) => {
            await sendNotificationEmail(
                "wishlist-notification",
                giver.email,
                `${user.name} has added a wishlist!`,
                {
                    recipientName: user.name,
                }
            );
        });
        notifiedGivers = true;
    }

    return ok({success: true, notifiedGivers});
}, {auth: true, maxRequests: 30, windowMs: 60000});
