import {apiHandler} from "../shared/middleware.mjs";
import {getUsersCollection} from "../shared/db.mjs";
import {escapeRegex} from "../shared/regex.mjs";
import {computeUserStats} from "../shared/userStats.mjs";
import {ok} from "../shared/responses.mjs";

export const handler = apiHandler("GET", async (event) => {
    const q = (event.queryStringParameters?.q ?? "").trim();
    const query = q
        ? {$or: [{name: {$regex: escapeRegex(q), $options: "i"}}, {email: {$regex: escapeRegex(q), $options: "i"}}]}
        : {};

    const col = await getUsersCollection();
    const users = await col.find(query).sort({name: 1}).limit(50).toArray();
    const stats = await computeUserStats(users.map(u => u._id));

    return ok({
        users: users.map(({_id, name, email}) => ({
            _id, name, email,
            isAdmin: email === process.env.ADMIN_EMAIL,
            ...stats.get(_id.toString()),
        })),
    });
}, {admin: true, maxRequests: 30, windowMs: 60000});
