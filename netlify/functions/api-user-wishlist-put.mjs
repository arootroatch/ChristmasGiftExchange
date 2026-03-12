import {getUsersCollection} from "../shared/db.mjs";
import {apiHandler, validateBody} from "../shared/middleware.mjs";
import {extractTokenFromPath, getUserByToken} from "../shared/auth.mjs";
import {ok, badRequest, unauthorized} from "../shared/responses.mjs";
import {forEachGiverOf, sendNotificationEmail} from "../shared/giverNotification.mjs";
import {wishlistViewPath, absoluteUrl} from "../shared/links.mjs";
import {userSchema} from "../shared/schemas/user.mjs";

const wishlistPutRequestSchema = userSchema.pick({wishlists: true, wishItems: true});

export const handler = apiHandler("PUT", async (event) => {
    const token = extractTokenFromPath(event, "user");
    if (!token) return badRequest("Token required");

    const {data, error} = validateBody(wishlistPutRequestSchema, event);
    if (error) return badRequest(error);

    const user = await getUserByToken(token);
    if (!user) return unauthorized("User not found");

    const wasEmpty = user.wishlists.length === 0 && user.wishItems.length === 0;

    const usersCol = await getUsersCollection();
    await usersCol.updateOne(
        {token},
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
});
