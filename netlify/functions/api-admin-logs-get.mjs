import {apiHandler} from "../shared/middleware.mjs";
import {getLogsCollection} from "../shared/db.mjs";
import {ok, forbidden} from "../shared/responses.mjs";

export const handler = apiHandler("GET", async (event) => {
    if (event.user.email !== process.env.ADMIN_EMAIL) {
        return forbidden("Forbidden");
    }

    const {level, endpoint, from, to, page = "1"} = event.queryStringParameters ?? {};
    const pageNum = Math.max(1, parseInt(page) || 1);
    const pageSize = 50;

    const fromDate = from ? new Date(from) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to) : new Date();

    const query = {timestamp: {$gte: fromDate, $lte: toDate}};
    if (level) query.level = level;
    if (endpoint) query.endpoint = {$regex: endpoint, $options: "i"};

    const col = await getLogsCollection();
    const total = await col.countDocuments(query);
    const logs = await col
        .find(query)
        .sort({timestamp: -1})
        .skip((pageNum - 1) * pageSize)
        .limit(pageSize)
        .toArray();

    return ok({logs, total, page: pageNum, pages: Math.ceil(total / pageSize)});
}, {auth: true});
