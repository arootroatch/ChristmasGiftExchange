import {getRateLimitsCollection} from "./db.mjs";
import {tooManyRequests} from "./responses.mjs";
import {logger} from "./logger.mjs";

async function checkLimit(key, endpoint, logContext, {maxRequests, windowMs, message = "Rate limit exceeded"}) {
    const col = await getRateLimitsCollection();
    const now = new Date();
    const windowStart = new Date(now.getTime() - windowMs);

    const result = await col.findOneAndUpdate(
        {key, windowStart: {$gt: windowStart}},
        {$inc: {count: 1}},
        {returnDocument: "after"}
    );

    if (result) {
        if (result.count > maxRequests) {
            logger.warn("Rate limit exceeded", {...logContext, endpoint, count: result.count, maxRequests});
            return tooManyRequests(message);
        }
        return null;
    }

    await col.deleteMany({key});
    await col.insertOne({key, endpoint, count: 1, windowStart: now});
    return null;
}

export async function checkRateLimit(ip, endpoint, {maxRequests = 30, windowMs = 60000} = {}) {
    return checkLimit(`${ip}:${endpoint}`, endpoint, {ip}, {maxRequests, windowMs});
}

export async function checkEmailRateLimit(email, endpoint, options) {
    const normalized = email.toLowerCase();
    return checkLimit(`email:${normalized}:${endpoint}`, endpoint, {email: normalized}, options);
}
