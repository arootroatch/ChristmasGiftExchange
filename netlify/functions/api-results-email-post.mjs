import {z} from "zod";
import {apiHandler, validateBody} from "../shared/middleware.mjs";
import {badRequest, ok, unauthorized, forbidden, notFound} from "../shared/responses.mjs";
import {sendNotificationEmail} from "../shared/giverNotification.mjs";
import {getUsersCollection, getExchangesCollection} from "../shared/db.mjs";

const requestSchema = z.object({
    token: z.string(),
    exchangeId: z.string(),
});

export const handler = apiHandler("POST", async (event) => {
    const {data, error} = validateBody(requestSchema, event);
    if (error) return badRequest(error);

    const usersCol = await getUsersCollection();
    const user = await usersCol.findOne({token: data.token});
    if (!user) return unauthorized("Invalid token");

    const exchangesCol = await getExchangesCollection();
    const exchange = await exchangesCol.findOne({exchangeId: data.exchangeId});
    if (!exchange) return notFound("Exchange not found");

    if (!exchange.organizer || !exchange.organizer.equals(user._id)) {
        return forbidden("Only the organizer can send results emails");
    }

    const participantIds = [...new Set(exchange.assignments.flatMap(a => [a.giverId, a.recipientId]))];
    const participants = await usersCol.find({_id: {$in: participantIds}}).toArray();
    const idToName = {};
    participants.forEach(p => { idToName[p._id.toString()] = p.name; });

    const assignments = exchange.assignments.map(a => ({
        giver: idToName[a.giverId.toString()],
        recipient: idToName[a.recipientId.toString()],
    }));

    await sendNotificationEmail(
        "results-summary",
        user.email,
        "Your Gift Exchange Results",
        {name: user.name, assignments}
    );

    return ok({success: true});
}, {maxRequests: 5, windowMs: 60000});
