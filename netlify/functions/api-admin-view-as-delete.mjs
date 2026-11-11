import {apiHandler, requestEndpoint} from "../shared/middleware.mjs";
import {okWithHeaders} from "../shared/responses.mjs";
import {clearViewAsCookie} from "../shared/jwt.mjs";
import {logger} from "../shared/logger.mjs";

export const handler = apiHandler("DELETE", async (event) => {
    logger.info("View-as ended", {endpoint: requestEndpoint(event), ip: event.ip});
    return okWithHeaders({success: true}, {"Set-Cookie": clearViewAsCookie()});
}, {admin: true});
