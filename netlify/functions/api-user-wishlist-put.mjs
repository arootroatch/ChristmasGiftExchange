import {apiHandler, validateBody, requireAuth} from "../shared/middleware.mjs";
import {ok, badRequest} from "../shared/responses.mjs";
import {getUsersCollection} from "../shared/db.mjs";
import {forEachGiverOf, sendNotificationEmail} from "../shared/giverNotification.mjs";
import {wishlistViewPath, absoluteUrl} from "../shared/links.mjs";
import {userSchema} from "../shared/schemas/user.mjs";

const wishlistPutRequestSchema = userSchema.pick({wishlists: true, wishItems: true});

export const handler = apiHandler("PUT", async (event) => {
    const authError = await requireAuth(event);
    if (authError) return authError;

    const {data, error} = validateBody(wishlistPutRequestSchema, event);
    if (error) return badRequest(error);

    const user = event.user;
    const wasEmpty = user.wishlists.length === 0 && user.wishItems.length === 0;

    const usersCol = await getUsersCollection();
    await usersCol.updateOne(
        {_id: user._id},
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
