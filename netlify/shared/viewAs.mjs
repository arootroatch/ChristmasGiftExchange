import {verifyViewAs, parseCookies} from "./jwt.mjs";
import {getSessionUser, findUserById} from "./sessionUser.mjs";

async function lookupViewAs(event) {
    const {user: admin} = await getSessionUser(event);
    if (!admin || !process.env.ADMIN_EMAIL || admin.email !== process.env.ADMIN_EMAIL) return null;

    const token = parseCookies(event.headers?.cookie).viewAs;
    if (!token) return null;

    const payload = await verifyViewAs(token);
    if (!payload || payload.adminId !== admin._id.toString()) return null;

    const target = await findUserById(payload.targetUserId);
    return target ? {admin, target} : null;
}

export async function resolveViewAs(event) {
    if (event._viewAs === undefined) event._viewAs = await lookupViewAs(event);
    return event._viewAs;
}
