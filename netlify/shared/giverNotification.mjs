import {getUsersCollection, getExchangesCollection} from "./db.mjs";
import {wishlistEditPath, wishlistViewPath, absoluteUrl} from "./links.mjs";

export {sendNotificationEmail, sendBatchNotificationEmails} from "./emailDispatch.mjs";
import {sendBatchNotificationEmails} from "./emailDispatch.mjs";

import "./emailProviders/dev.mjs";
import "./emailProviders/postmark.mjs";

export async function forEachGiverOf(recipientUser, callback) {
    const exchangesCol = await getExchangesCollection();
    const usersCol = await getUsersCollection();

    const exchange = await exchangesCol.findOne(
        {"assignments.recipientId": recipientUser._id},
        {sort: {createdAt: -1}}
    );

    if (!exchange) return;

    for (const assignment of exchange.assignments) {
        if (assignment.recipientId.equals(recipientUser._id)) {
            const giver = await usersCol.findOne({_id: assignment.giverId});
            if (giver) {
                await callback({giver, exchange});
            }
        }
    }
}

export async function sendBatchEmails(participants, assignments, userByEmail, exchangeId) {
    const messages = assignments.map(assignment => {
        const participant = participants.find(p => p.name === assignment.giver);
        const user = userByEmail[participant.email];
        const wishlistEditUrl = user ? absoluteUrl(wishlistEditPath(user.token)) : null;
        const wishlistViewUrl = user ? absoluteUrl(wishlistViewPath(user.token, exchangeId)) : null;

        return {
            to: participant.email,
            templateName: "secret-santa",
            subject: "Your gift exchange recipient name has arrived!",
            parameters: {
                name: assignment.giver,
                recipient: assignment.recipient,
                wishlistEditUrl,
                wishlistViewUrl,
            },
        };
    });

    return await sendBatchNotificationEmails(messages);
}

let _requestOrigin = null;

export function setRequestOrigin(event) {
    _requestOrigin = event?.rawUrl ? new URL(event.rawUrl).origin : null;
}
