import {getUsersCollection, getExchangesCollection} from "./db.mjs";
import {wishlistEditPath, wishlistViewPath, absoluteUrl} from "./links.mjs";

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

const templateModules = {
    "secret-santa": () => import("./emails/secretSanta.mjs"),
    "results-summary": () => import("./emails/resultsSummary.mjs"),
    "wishlist-notification": () => import("./emails/wishlistNotification.mjs"),
    "contact-info": () => import("./emails/contactInfo.mjs"),
    "error-alert": () => import("./emails/errorAlert.mjs"),
    "wishlist-link": () => import("./emails/wishlistLink.mjs"),
};

export async function sendNotificationEmail(templateName, to, subject, parameters) {
    if (process.env.CONTEXT === "dev") {
        console.log(`[DEV EMAIL] Template: ${templateName} | To: ${to} | Subject: ${subject}`);
        console.log("[DEV EMAIL] Parameters:", JSON.stringify(parameters, null, 2));
        return;
    }

    const loadModule = templateModules[templateName];
    if (!loadModule) {
        throw new Error(`Unknown email template: ${templateName}`);
    }

    const templateModule = await loadModule();
    const htmlBody = templateModule.render(parameters);

    const response = await fetch("https://api.postmarkapp.com/email", {
        method: "POST",
        headers: {
            "X-Postmark-Server-Token": process.env.POSTMARK_SERVER_TOKEN,
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        body: JSON.stringify({
            From: "alex@soundrootsproductions.com",
            To: to,
            Subject: subject,
            HtmlBody: htmlBody,
        }),
    });

    if (!response.ok) {
        const body = await response.text();
        throw new Error(`Email send failed (${response.status}): ${templateName} to ${to} — ${body}`);
    }
}

export async function sendBatchNotificationEmails(messages) {
    if (process.env.CONTEXT === "dev") {
        messages.forEach(m => {
            console.log(`[DEV EMAIL] Template: ${m.templateName} | To: ${m.to} | Subject: ${m.subject}`);
            console.log("[DEV EMAIL] Parameters:", JSON.stringify(m.parameters, null, 2));
        });
        return {emailsFailed: []};
    }

    const postmarkMessages = await Promise.all(messages.map(async (m) => {
        const templateModule = await templateModules[m.templateName]();
        return {
            From: "alex@soundrootsproductions.com",
            To: m.to,
            Subject: m.subject,
            HtmlBody: templateModule.render(m.parameters),
        };
    }));

    const response = await fetch("https://api.postmarkapp.com/email/batch", {
        method: "POST",
        headers: {
            "X-Postmark-Server-Token": process.env.POSTMARK_SERVER_TOKEN,
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        body: JSON.stringify(postmarkMessages),
    });

    if (!response.ok) {
        const body = await response.text();
        throw new Error(`Batch email send failed (${response.status}): ${body}`);
    }

    const results = await response.json();
    const emailsFailed = results
        .filter(r => r.ErrorCode !== 0)
        .map(r => r.To);

    return {emailsFailed};
}
