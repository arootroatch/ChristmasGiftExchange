import {z} from "zod";
import {ObjectId} from "mongodb";
import {apiHandler, validateBody, requestEndpoint} from "../shared/middleware.mjs";
import {okWithHeaders, badRequest, notFound} from "../shared/responses.mjs";
import {signViewAs, buildViewAsCookie} from "../shared/jwt.mjs";
import {findUserById} from "../shared/sessionUser.mjs";
import {logger} from "../shared/logger.mjs";

const viewAsRequestSchema = z.object({
    userId: z.string().regex(/^[0-9a-f]{24}$/i, "Invalid user id").refine(ObjectId.isValid, "Invalid user id"),
});

export const handler = apiHandler("POST", async (event) => {
    const {data, error} = validateBody(viewAsRequestSchema, event);
    if (error) return badRequest(error);

    const target = await findUserById(data.userId);
    if (!target) return notFound("User not found");

    const adminId = event.user._id.toString();
    const targetUserId = target._id.toString();
    if (targetUserId === adminId) return badRequest("Cannot view as yourself");

    const jwt = await signViewAs(adminId, targetUserId);
    logger.info("View-as started", {endpoint: requestEndpoint(event), ip: event.ip, targetUserId, targetEmail: target.email});
    return okWithHeaders({success: true}, {"Set-Cookie": buildViewAsCookie(jwt)});
}, {admin: true, maxRequests: 10, windowMs: 60000});
