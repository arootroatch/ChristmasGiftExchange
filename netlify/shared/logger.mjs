import {getLogsCollection} from "./db.mjs";
import {getLogLevel} from "./settings.mjs";

const LEVEL_ORDER = {debug: 0, info: 1, warn: 2, error: 3};

async function log(level, message, {endpoint, ip, ...metadata} = {}) {
    const threshold = await getLogLevel();
    if (LEVEL_ORDER[level] < LEVEL_ORDER[threshold]) return;

    const consoleFn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
    const hasExtra = Object.keys(metadata).length > 0 || endpoint != null || ip != null;
    consoleFn(message, ...(hasExtra ? [{endpoint, ip, ...metadata}] : []));
    try {
        const col = await getLogsCollection();
        await col.insertOne({
            level,
            message,
            endpoint: endpoint ?? null,
            ip: ip ?? null,
            metadata,
            timestamp: new Date(),
        });
    } catch {
        // logging must never crash the app
    }
}

export const logger = {
    info:  (msg, ctx) => log("info",  msg, ctx),
    warn:  (msg, ctx) => log("warn",  msg, ctx),
    error: (msg, ctx) => log("error", msg, ctx),
    debug: (msg, ctx) => log("debug", msg, ctx),
};
