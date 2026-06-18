import {apiHandler} from "../shared/middleware.mjs";
import {getLogsCollection} from "../shared/db.mjs";
import {ok, forbidden} from "../shared/responses.mjs";

export const handler = apiHandler("GET", async (event) => {
    if (event.user.email !== process.env.ADMIN_EMAIL) {
        return forbidden("Forbidden");
    }

    const {level, endpoint, message, from, to, page = "1"} = event.queryStringParameters ?? {};
    const pageNum = Math.max(1, parseInt(page) || 1);
    const pageSize = 50;

    const fromDate = from ? new Date(from) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to) : new Date();

    const query = {timestamp: {$gte: fromDate, $lte: toDate}};
    if (level) query.level = level;
    if (endpoint) {
        const escaped = endpoint.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        query.endpoint = {$regex: escaped, $options: "i"};
    }
    if (message) {
        const escaped = message.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        query.message = {$regex: escaped, $options: "i"};
    }

    const col = await getLogsCollection();
    const timeWindow = {timestamp: {$gte: fromDate, $lte: toDate}};
    const [total, logs, rawEndpoints] = await Promise.all([
        col.countDocuments(query),
        col.find(query).sort({timestamp: -1}).skip((pageNum - 1) * pageSize).limit(pageSize).toArray(),
        col.distinct("endpoint", timeWindow),
    ]);
    const distinctEndpoints = rawEndpoints.filter(Boolean).sort();

    return ok({logs, total, page: pageNum, pages: Math.ceil(total / pageSize), distinctEndpoints});
}, {auth: true});
