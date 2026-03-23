import {apiHandler} from "../shared/middleware.mjs";
import {okWithHeaders} from "../shared/responses.mjs";
import {clearSessionCookie} from "../shared/jwt.mjs";

export const handler = apiHandler("POST", async () => {
    return okWithHeaders({success: true}, {"Set-Cookie": clearSessionCookie()});
});
