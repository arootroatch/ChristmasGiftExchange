import {z} from "zod";
import {apiHandler, validateBody} from "../shared/middleware.mjs";
import {badRequest, ok, forbidden, notFound} from "../shared/responses.mjs";
import {sendNotificationEmail} from "../shared/giverNotification.mjs";
import {getUsersCollection, getExchangesCollection} from "../shared/db.mjs";

const assignmentSchema = z.object({
    giver: z.string().min(1),
    recipient: z.string().min(1),
});

const exchangeIdRequestSchema = z.object({
    exchangeId: z.string(),
});

const assignmentsRequestSchema = z.object({
    assignments: z.array(assignmentSchema).min(1).max(50),
});

const requestSchema = z.union([exchangeIdRequestSchema, assignmentsRequestSchema]);

export const handler = apiHandler("POST", async (event) => {
    const {data, error} = validateBody(requestSchema, event);
    if (error) return badRequest(error);

    const user = event.user;

    if ("exchangeId" in data) {
        const exchangesCol = await getExchangesCollection();
        const exchange = await exchangesCol.findOne({exchangeId: data.exchangeId});
        if (!exchange) return notFound("Exchange not found");

        if (!exchange.organizer || !exchange.organizer.equals(user._id)) {
            return forbidden("Only the organizer can send results emails");
        }

        const participantIds = [...new Set(exchange.assignments.flatMap(a => [a.giverId, a.recipientId]))];
        const usersCol = await getUsersCollection();
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
    } else {
        await sendNotificationEmail(
            "results-summary",
            user.email,
            "Your Gift Exchange Results",
            {name: user.name, assignments: data.assignments}
        );
    }

    return ok({success: true});
}, {auth: true, maxRequests: 5, windowMs: 60000});
