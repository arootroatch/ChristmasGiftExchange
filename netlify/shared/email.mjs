import {z} from "zod";

// Emails are stored and compared in this form so the same address can't become two users.
export function normalizeEmail(email) {
    return email.trim().toLowerCase();
}

export function adminEmail() {
    const email = process.env.ADMIN_EMAIL;
    return email ? normalizeEmail(email) : undefined;
}

export function isAdminEmail(email) {
    const admin = adminEmail();
    return !!admin && typeof email === "string" && normalizeEmail(email) === admin;
}

// Use for every email accepted from a request body.
export const emailInputSchema = z.preprocess(
    value => typeof value === "string" ? normalizeEmail(value) : value,
    z.email(),
);
