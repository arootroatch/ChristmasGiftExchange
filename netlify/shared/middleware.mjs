import {methodNotAllowed, serverError, unauthorized, forbidden} from "./responses.mjs";
import {sendNotificationEmail, setRequestOrigin} from "./giverNotification.mjs";
import {checkRateLimit} from "./rateLimit.mjs";
import {verifySession, parseCookies} from "./jwt.mjs";
import {getUsersCollection} from "./db.mjs";
import {ObjectId} from "mongodb";

export function formatZodError(zodError) {
    const issue = zodError.issues[0];
    const path = issue.path.join(".");
    if (issue.code === "invalid_type" && (!issue.received || issue.received === "undefined")) {
        return `Missing required field: ${path}`;
    }
    if (issue.code === "invalid_type") {
        return `Expected ${issue.expected} for ${path}, got ${issue.received}`;
    }
    return issue.message;
}

export function validateBody(schema, event) {
    if (!event.body) {
        return {error: "Invalid JSON"};
    }
    let parsed;
    try {
        parsed = JSON.parse(event.body);
    } catch {
        return {error: "Invalid JSON"};
    }
    const result = schema.safeParse(parsed);
    if (!result.success) {
        return {error: formatZodError(result.error)};
    }
    return {data: result.data};
}

const ALLOWED_ORIGINS = ["gift-exchange-generator.com", "giftexchangegenerator.netlify.app"];

export function validateOrigin(event) {
    const origin = event.headers?.origin;
    if (!origin) return null;
    if (ALLOWED_ORIGINS.some((allowed) => origin.includes(allowed))) return null;
    if (origin === process.env.URL) return null;

    console.warn("Origin rejected:", origin);
    return forbidden("Forbidden");
}

export async function requireAuth(event) {
    const cookies = parseCookies(event.headers?.cookie);
    if (!cookies.session) return unauthorized("Authentication required");

    const payload = await verifySession(cookies.session);
    if (!payload?.userId) return unauthorized("Invalid session");

    let userId;
    try {
        userId = new ObjectId(payload.userId);
    } catch {
        return unauthorized("Invalid session");
    }

    const usersCol = await getUsersCollection();
    const user = await usersCol.findOne({_id: userId});
    if (!user) return unauthorized("User not found");

    event.user = user;
    return null;
}

function extractClientIp(event) {
    return event.headers?.["x-forwarded-for"]?.split(",")[0]?.trim()
        || event.headers?.["client-ip"]
        || "unknown";
}

async function applyRateLimit(event, rateLimitConfig) {
    if (!rateLimitConfig.maxRequests) return null;
    const ip = extractClientIp(event);
    const endpoint = event.path.split("/").pop();
    return checkRateLimit(ip, endpoint, rateLimitConfig);
}

async function reportError(event, error) {
    console.error("Unhandled error in API handler:", error);
    try {
        await sendNotificationEmail(
            "error-alert",
            "alex@gift-exchange-generator.com",
            `Server Error: ${error.message}`,
            {
                endpoint: `${event.httpMethod} ${event.path}`,
                timestamp: new Date().toISOString(),
                stackTrace: error.stack || error.message,
            }
        );
    } catch {}
}

export function apiHandler(method, fn, {auth = false, ...rateLimitConfig} = {}) {
    return async (event) => {
        const endpoint = `${event.httpMethod} ${event.path}`;
        console.log(`[API] ${endpoint}`);

        if (event.httpMethod !== method) return methodNotAllowed();
        setRequestOrigin(event);

        const originError = validateOrigin(event);
        if (originError) return originError;

        const limited = await applyRateLimit(event, rateLimitConfig);
        if (limited) {
            console.warn(`[API] Rate limited: ${endpoint}`);
            return limited;
        }

        if (auth) {
            const authError = await requireAuth(event);
            if (authError) {
                console.warn(`[API] Auth failed: ${endpoint}`);
                return authError;
            }
        }

        try {
            return await fn(event);
        } catch (error) {
            await reportError(event, error);
            return serverError("Something went wrong");
        }
    };
}
