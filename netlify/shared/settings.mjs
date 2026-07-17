import {getSettingsCollection} from "./db.mjs";

const CACHE_TTL_MS = 15000;
const DEFAULT_LEVEL = "warn";

let cachedLevel = null;
let cachedAt = 0;

export function _resetLogLevelCache() {
    cachedLevel = null;
    cachedAt = 0;
}

export async function getLogLevel() {
    if (cachedLevel && Date.now() - cachedAt < CACHE_TTL_MS) {
        return cachedLevel;
    }
    try {
        const col = await getSettingsCollection();
        const doc = await col.findOne({_id: "global"});
        cachedLevel = doc?.logLevel ?? DEFAULT_LEVEL;
        cachedAt = Date.now();
        return cachedLevel;
    } catch {
        return "debug";
    }
}

export async function setLogLevel(level) {
    const col = await getSettingsCollection();
    await col.updateOne({_id: "global"}, {$set: {logLevel: level}}, {upsert: true});
    cachedLevel = level;
    cachedAt = Date.now();
}
