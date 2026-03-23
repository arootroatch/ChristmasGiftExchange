import {z} from "zod";
import {apiHandler, validateBody, requireAuth} from "../shared/middleware.mjs";
import {ok, badRequest, notFound} from "../shared/responses.mjs";
import {getUsersCollection, getExchangesCollection} from "../shared/db.mjs";
import {sendNotificationEmail} from "../shared/giverNotification.mjs";

const requestSchema = z.object({
    exchangeId: z.string(),
});

export const handler = apiHandler("POST", async (event) => {
    const authError = await requireAuth(event);
    if (authError) return authError;

    const {data, error} = validateBody(requestSchema, event);
    if (error) return badRequest(error);

    const usersCol = await getUsersCollection();
    const exchangesCol = await getExchangesCollection();

    const user = event.user;

    const exchange = await exchangesCol.findOne({exchangeId: data.exchangeId});
    if (!exchange) return notFound("Exchange not found");

    const assignment = exchange.assignments.find(a => a.giverId.equals(user._id));
    if (!assignment) return notFound("Assignment not found");

    const recipient = await usersCol.findOne({_id: assignment.recipientId});
    if (!recipient) return notFound("Recipient not found");

    await sendNotificationEmail(
        "wishlist-link",
        user.email,
        `View ${recipient.name}'s Wish List`,
        {recipientName: recipient.name}
    );

    return ok({sent: true});
}, {maxRequests: 5, windowMs: 60000});
