import {getUsersCollection} from "../shared/db.mjs";
import {apiHandler} from "../shared/middleware.mjs";
import {extractTokenFromPath, getUserByToken} from "../shared/auth.mjs";
import {ok, badRequest, unauthorized} from "../shared/responses.mjs";
import {forEachGiverOf, sendNotificationEmail} from "../shared/giverNotification.mjs";

export const handler = apiHandler("PUT", async (event) => {
    const token = extractTokenFromPath(event, "user");
    if (!token) {
        return badRequest("Token required");
    }

    const {wishlists, wishItems} = JSON.parse(event.body);

    const user = await getUserByToken(token);
    if (!user) {
        return unauthorized("User not found");
    }

    const wasEmpty = (!user.wishlists || user.wishlists.length === 0)
        && (!user.wishItems || user.wishItems.length === 0);

    const usersCol = await getUsersCollection();
    await usersCol.updateOne(
        {token},
        {$set: {wishlists, wishItems}}
    );

    let notifiedGivers = false;
    if (wasEmpty && (wishlists.length > 0 || wishItems.length > 0)) {
        await forEachGiverOf(user, async ({giver, exchange}) => {
            const viewUrl = `${process.env.URL}/wishlist/view/${giver.token}?exchange=${exchange.exchangeId}`;
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
