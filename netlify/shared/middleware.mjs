import {methodNotAllowed, serverError, unauthorized, forbidden} from "./responses.mjs";
import {sendNotificationEmail, setRequestOrigin} from "./giverNotification.mjs";
import {checkRateLimit} from "./rateLimit.mjs";
import {getSessionUser} from "./sessionUser.mjs";
import {resolveViewAs} from "./viewAs.mjs";
import {logger} from "./logger.mjs";

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

export function requestEndpoint(event) {
    return `${event.httpMethod} ${event.path}`;
}

export function validateOrigin(event) {
    const origin = event.headers?.origin;
    if (!origin) return null;
    if (ALLOWED_ORIGINS.some((allowed) => origin.includes(allowed))) return null;
    if (origin === process.env.URL) return null;

    logger.warn("Origin rejected", {endpoint: requestEndpoint(event), ip: extractClientIp(event), origin});
    return forbidden("Forbidden");
}

export async function requireRealUser(event) {
    const {user, error} = await getSessionUser(event);
    if (error) return unauthorized(error);

    event.user = user;
    return null;
}

export async function requireAuth(event) {
    const authError = await requireRealUser(event);
    if (authError) return authError;

    const viewAs = await resolveViewAs(event);
    if (viewAs) {
        event.user = viewAs.target;
        event.viewer = viewAs.admin;
    }
    return null;
}

export async function getOptionalUser(event) {
    try {
        const viewAs = await resolveViewAs(event);
        if (viewAs) return viewAs.target;
        const {user} = await getSessionUser(event);
        return user ?? null;
    } catch {
        return null;
    }
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
    logger.error("Unhandled error in API handler", {
        endpoint: requestEndpoint(event),
        stack: error.stack || error.message,
    });
    try {
        await sendNotificationEmail(
            "error-alert",
            "alex@gift-exchange-generator.com",
            `Server Error: ${error.message}`,
            {
                endpoint: requestEndpoint(event),
                timestamp: new Date().toISOString(),
                stackTrace: error.stack || error.message,
            }
        );
    } catch {}
}

export function apiHandler(method, fn, {auth = false, admin = false, ...rateLimitConfig} = {}) {
    return async (event) => {
        const endpoint = requestEndpoint(event);
        const ip = extractClientIp(event);
        event.ip = ip;
        logger.info(`[API] ${endpoint}`, {endpoint, ip});
        try {
            if (event.httpMethod !== method) return methodNotAllowed();
            setRequestOrigin(event);

            const originError = validateOrigin(event);
            if (originError) return originError;

            const limited = await applyRateLimit(event, rateLimitConfig);
            if (limited) {
                logger.warn("Rate limit exceeded", {endpoint, ip});
                return limited;
            }

            if (admin) {
                const authError = await requireRealUser(event);
                if (authError) {
                    logger.warn("Auth failed", {endpoint, ip});
                    return authError;
                }
                if (event.user.email !== process.env.ADMIN_EMAIL) {
                    logger.warn("Admin check failed", {endpoint, ip});
                    return forbidden("Forbidden");
                }
            } else if (auth) {
                const authError = await requireAuth(event);
                if (authError) {
                    logger.warn("Auth failed", {endpoint, ip});
                    return authError;
                }
            }

            return await fn(event);
        } catch (error) {
            await reportError(event, error);
            return serverError("Something went wrong");
        }
    };
}
