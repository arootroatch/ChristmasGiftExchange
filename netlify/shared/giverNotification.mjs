import {getUsersCollection, getExchangesCollection} from "./db.mjs";

export async function forEachGiverOf(recipientUser, callback) {
    const exchangesCol = await getExchangesCollection();
    const usersCol = await getUsersCollection();

    const exchanges = await exchangesCol.find({
        "assignments.recipientId": recipientUser._id,
    }).toArray();

    for (const exchange of exchanges) {
        for (const assignment of exchange.assignments) {
            if (assignment.recipientId.equals(recipientUser._id)) {
                const giver = await usersCol.findOne({_id: assignment.giverId});
                if (giver) {
                    await callback({giver, exchange});
                }
            }
        }
    }
}

export async function sendNotificationEmail(templateName, to, subject, parameters) {
    await fetch(
        `${process.env.URL}/.netlify/functions/emails/${templateName}`,
        {
            headers: {"netlify-emails-secret": process.env.NETLIFY_EMAILS_SECRET},
            method: "POST",
            body: JSON.stringify({
                from: "alex@soundrootsproductions.com",
                to,
                subject,
                parameters,
            }),
        }
    );
}
