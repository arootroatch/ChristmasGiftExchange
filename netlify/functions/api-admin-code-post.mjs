import {apiHandler} from "../shared/middleware.mjs";
import {adminEmail} from "../shared/email.mjs";
import {ok} from "../shared/responses.mjs";
import {generateAndStoreCode} from "../shared/authCodes.mjs";
import {sendNotificationEmail} from "../shared/giverNotification.mjs";

export const handler = apiHandler("POST", async (_event) => {
    const email = adminEmail();
    if (!email) throw new Error("ADMIN_EMAIL not configured");

    const code = await generateAndStoreCode(email);
    await sendNotificationEmail(
        "verification-code",
        email,
        "Your Admin Verification Code",
        {code}
    );

    return ok({sent: true});
}, {allowDuringViewAs: true, maxRequests: 3, windowMs: 60000});
