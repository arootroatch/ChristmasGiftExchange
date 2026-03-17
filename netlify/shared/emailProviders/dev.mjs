import {sendNotificationEmail, sendBatchNotificationEmails} from "../giverNotification.mjs";

sendBatchNotificationEmails.defmethod("dev", async (messages) => {
    const emailsFailed = [];
    for (const m of messages) {
        console.log(`[DEV EMAIL] Template: ${m.templateName} | To: ${m.to} | Subject: ${m.subject}`);
        console.log("[DEV EMAIL] Parameters:", JSON.stringify(m.parameters, null, 2));
        if (m.to.endsWith("@fail.test")) emailsFailed.push(m.to);
    }
    return {emailsFailed};
});

sendNotificationEmail.defmethod("dev", async (templateName, to, subject, parameters) => {
    console.log(`[DEV EMAIL] Template: ${templateName} | To: ${to} | Subject: ${subject}`);
    console.log("[DEV EMAIL] Parameters:", JSON.stringify(parameters, null, 2));
    if (to.endsWith("@fail.test")) {
        throw new Error(`[DEV] Simulated email failure for ${to}`);
    }
});
