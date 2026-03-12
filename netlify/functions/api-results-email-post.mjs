import {z} from "zod";
import {apiHandler, validateBody} from "../shared/middleware.mjs";
import {badRequest, ok} from "../shared/responses.mjs";
import {sendNotificationEmail} from "../shared/giverNotification.mjs";

const resultsEmailRequestSchema = z.object({
    name: z.string(),
    email: z.email(),
    assignments: z.array(z.object({
        giver: z.string(),
        recipient: z.string(),
    })).min(1),
});

export const handler = apiHandler("POST", async (event) => {
    const {data, error} = validateBody(resultsEmailRequestSchema, event);
    if (error) return badRequest(error);

    await sendNotificationEmail(
        "results-summary",
        data.email,
        "Your Gift Exchange Results",
        {name: data.name, assignments: data.assignments}
    );

    return ok({success: true});
});
