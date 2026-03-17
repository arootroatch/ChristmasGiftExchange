import {defmulti} from "./multimethod.mjs";

const getEmailProvider = () => process.env.CONTEXT === "dev" ? "dev" : "postmark";

export const sendNotificationEmail = defmulti(getEmailProvider);
export const sendBatchNotificationEmails = defmulti(getEmailProvider);
