import {apiHandler, requestEndpoint} from "../shared/middleware.mjs";
import {okWithHeaders} from "../shared/responses.mjs";
import {clearViewAsCookie, verifyViewAs, parseCookies} from "../shared/jwt.mjs";
import {logger} from "../shared/logger.mjs";

export const handler = apiHandler("DELETE", async (event) => {
    const token = parseCookies(event.headers?.cookie || "").viewAs;
    const viewAs = token ? await verifyViewAs(token) : null;
    logger.info("View-as ended", {
        endpoint: requestEndpoint(event),
        ip: event.ip,
        adminId: event.user._id.toString(),
        adminEmail: event.user.email,
        ...(viewAs && {targetUserId: viewAs.targetUserId}),
    });
    return okWithHeaders({success: true}, {"Set-Cookie": clearViewAsCookie()});
}, {admin: true});
