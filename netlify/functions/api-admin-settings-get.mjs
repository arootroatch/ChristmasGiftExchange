import {apiHandler} from "../shared/middleware.mjs";
import {ok, forbidden} from "../shared/responses.mjs";
import {getLogLevel} from "../shared/settings.mjs";

export const handler = apiHandler("GET", async (event) => {
    if (event.user.email !== process.env.ADMIN_EMAIL) {
        return forbidden("Forbidden");
    }

    const logLevel = await getLogLevel();
    return ok({logLevel});
}, {auth: true});
