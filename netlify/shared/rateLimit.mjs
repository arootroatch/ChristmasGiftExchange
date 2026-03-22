import {getRateLimitsCollection} from "./db.mjs";
import {tooManyRequests} from "./responses.mjs";

export async function checkRateLimit(ip, endpoint, {maxRequests = 30, windowMs = 60000} = {}) {
    const col = await getRateLimitsCollection();
    const key = `${ip}:${endpoint}`;
    const now = new Date();
    const windowStart = new Date(now.getTime() - windowMs);

    const result = await col.findOneAndUpdate(
        {key, windowStart: {$gt: windowStart}},
        {$inc: {count: 1}},
        {returnDocument: "after"}
    );

    if (result) {
        if (result.count > maxRequests) {
            return tooManyRequests("Rate limit exceeded");
        }
        return null;
    }

    await col.deleteMany({key});
    await col.insertOne({key, endpoint, count: 1, windowStart: now});
    return null;
}
