import {apiHandler} from "../shared/middleware.mjs";
import {ok} from "../shared/responses.mjs";
import {getLogLevel} from "../shared/settings.mjs";

export const handler = apiHandler("GET", async (event) => {
    const logLevel = await getLogLevel();
    return ok({logLevel});
}, {admin: true});
