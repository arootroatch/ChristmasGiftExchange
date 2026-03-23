import {getUsersCollection} from "./db.mjs";
import {userSchema} from "./schemas/user.mjs";

export async function getUserByToken(token) {
    const usersCol = await getUsersCollection();
    const doc = await usersCol.findOne({token});
    return doc ? userSchema.parse(doc) : null;
}

export function extractTokenFromPath(event, afterSegment) {
    const parts = event.path.split("/");
    const index = parts.findIndex(p => p === afterSegment);
    if (index === -1 || index + 1 >= parts.length) {
        return null;
    }
    return parts[index + 1] || null;
}
