import {getUsersCollection, getExchangesCollection} from "./db.mjs";
import {wishlistEditPath, absoluteUrl} from "./links.mjs";

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

export async function sendEmailsWithRetry(participants, assignments, userByEmail) {
    const emailsFailed = [];

    for (const assignment of assignments) {
        const participant = participants.find(p => p.name === assignment.giver);
        const user = userByEmail[participant.email];
        const wishlistEditUrl = user
            ? absoluteUrl(wishlistEditPath(user.token))
            : null;

        let sent = false;
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                await sendNotificationEmail(
                    "secret-santa",
                    participant.email,
                    "Your gift exchange recipient name has arrived!",
                    {
                        name: assignment.giver,
                        recipient: assignment.recipient,
                        wishlistEditUrl,
                    }
                );
                sent = true;
                break;
            } catch (err) {
                console.error(`Attempt ${attempt + 1}/3 failed for ${participant.email}:`, err.message);
            }
        }
        if (!sent) {
            emailsFailed.push(participant.email);
        }
    }

    return {emailsFailed};
}

let _requestOrigin = null;

export function setRequestOrigin(event) {
    _requestOrigin = event?.rawUrl ? new URL(event.rawUrl).origin : null;
}

export async function sendNotificationEmail(templateName, to, subject, parameters) {
    if (process.env.CONTEXT === "dev") {
        console.log(`[DEV EMAIL] Template: ${templateName} | To: ${to} | Subject: ${subject}`);
        console.log("[DEV EMAIL] Parameters:", JSON.stringify(parameters, null, 2));
        return;
    }

    const baseUrl = process.env.URL;
    const response = await fetch(
        `${baseUrl}/.netlify/functions/emails/${templateName}`,
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

    if (!response.ok) {
        throw new Error(`Email send failed (${response.status}): ${to}`);
    }
}
