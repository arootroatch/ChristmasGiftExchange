import {apiHandler} from "../shared/middleware.mjs";
import {okWithCookies} from "../shared/responses.mjs";
import {clearSessionCookie, clearViewAsCookie} from "../shared/jwt.mjs";

export const handler = apiHandler("POST", async () => {
    return okWithCookies({success: true}, [clearSessionCookie(), clearViewAsCookie()]);
});
