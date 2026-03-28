import {sendNotificationEmail, sendBatchNotificationEmails} from "../emailDispatch.mjs";

const templateModules = {
    "secret-santa": () => import("../emails/secretSanta.mjs"),
    "results-summary": () => import("../emails/resultsSummary.mjs"),
    "wishlist-notification": () => import("../emails/wishlistNotification.mjs"),
    "contact-info": () => import("../emails/contactInfo.mjs"),
    "error-alert": () => import("../emails/errorAlert.mjs"),
    "verification-code": () => import("../emails/verificationCode.mjs"),
};

sendNotificationEmail.defmethod("postmark", async (templateName, to, subject, parameters) => {
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
            From: "alex@gift-exchange-generator.com",
            To: to,
            Subject: subject,
            HtmlBody: htmlBody,
        }),
    });

    if (!response.ok) {
        const body = await response.text();
        throw new Error(`Email send failed (${response.status}): ${templateName} to ${to} — ${body}`);
    }
});

sendBatchNotificationEmails.defmethod("postmark", async (messages) => {
    const postmarkMessages = await Promise.all(messages.map(async (m) => {
        const templateModule = await templateModules[m.templateName]();
        return {
            From: "alex@gift-exchange-generator.com",
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
});
