import {apiHandler} from "../shared/middleware.mjs";
import {extractTokenFromPath, getUserByToken} from "../shared/auth.mjs";
import {ok, badRequest, unauthorized} from "../shared/responses.mjs";
import {forEachGiverOf, sendNotificationEmail} from "../shared/giverNotification.mjs";

export const handler = apiHandler("POST", async (event) => {
    const token = extractTokenFromPath(event, "user");
    if (!token) {
        return badRequest("Token required");
    }

    const {address, phone, notes} = JSON.parse(event.body);

    const user = await getUserByToken(token);
    if (!user) {
        return unauthorized("User not found");
    }

    await forEachGiverOf(user, async ({giver}) => {
        await sendNotificationEmail(
            "contact-info",
            giver.email,
            `${user.name} has shared their contact information!`,
            {
                recipientName: user.name,
                address: address || "Not provided",
                phone: phone || "Not provided",
                notes: notes || "None",
            }
        );
    });

    return ok({success: true});
});
