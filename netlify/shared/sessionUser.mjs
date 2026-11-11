import {verifySession, parseCookies} from "./jwt.mjs";
import {getUsersCollection} from "./db.mjs";
import {ObjectId} from "mongodb";

export async function findUserById(id) {
    let objectId;
    try {
        objectId = new ObjectId(id);
    } catch {
        return null;
    }
    const usersCol = await getUsersCollection();
    return usersCol.findOne({_id: objectId});
}

// Resolves the real user behind the `session` cookie. Returns {user} or {error} (the 401 message).
// Memoized on the event so the session user is looked up at most once per request.
export async function getSessionUser(event) {
    if (!event._sessionUser) event._sessionUser = await lookupSessionUser(event);
    return event._sessionUser;
}

async function lookupSessionUser(event) {
    const cookies = parseCookies(event.headers?.cookie);
    if (!cookies.session) return {error: "Authentication required"};

    const payload = await verifySession(cookies.session);
    if (!payload?.userId) return {error: "Invalid session"};

    let objectId;
    try {
        objectId = new ObjectId(payload.userId);
    } catch {
        return {error: "Invalid session"};
    }

    const usersCol = await getUsersCollection();
    const user = await usersCol.findOne({_id: objectId});
    if (!user) return {error: "User not found"};
    return {user};
}
