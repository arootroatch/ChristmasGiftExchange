import {getUsersCollection} from "./db.mjs";

export async function getUserByToken(token) {
    const usersCol = await getUsersCollection();
    return usersCol.findOne({token});
}

export function extractTokenFromPath(event, afterSegment) {
    const parts = event.path.split("/");
    const index = parts.indexOf(afterSegment);
    if (index === -1 || index + 1 >= parts.length) {
        return null;
    }
    return parts[index + 1] || null;
}
