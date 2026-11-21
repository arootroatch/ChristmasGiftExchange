import {z} from "zod";
import {apiHandler, validateBody} from "../shared/middleware.mjs";
import {ok, badRequest} from "../shared/responses.mjs";
import {setLogLevel} from "../shared/settings.mjs";

const settingsPutRequestSchema = z.object({
    logLevel: z.enum(["debug", "info", "warn", "error"]),
});

export const handler = apiHandler("PUT", async (event) => {
    const {data, error} = validateBody(settingsPutRequestSchema, event);
    if (error) return badRequest(error);

    await setLogLevel(data.logLevel);
    return ok({logLevel: data.logLevel});
}, {admin: true});
