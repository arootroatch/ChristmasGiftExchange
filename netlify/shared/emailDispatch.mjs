import {defmulti} from "./multimethod.mjs";

const byContext = () => process.env.CONTEXT === "dev" ? "dev" : "production";

export const sendNotificationEmail = defmulti(byContext);
export const sendBatchNotificationEmails = defmulti(byContext);
