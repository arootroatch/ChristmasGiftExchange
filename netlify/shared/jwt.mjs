import {SignJWT, jwtVerify} from "jose";

const SESSION_MAX_AGE = 172800; // 48 hours in seconds

function getSecret() {
    return new TextEncoder().encode(process.env.JWT_SECRET);
}

export async function signSession(userId) {
    return new SignJWT({userId})
        .setProtectedHeader({alg: "HS256"})
        .setIssuedAt()
        .setExpirationTime(`${SESSION_MAX_AGE}s`)
        .sign(getSecret());
}

export async function verifySession(token) {
    try {
        const {payload} = await jwtVerify(token, getSecret());
        return payload;
    } catch {
        return null;
    }
}

export function buildSessionCookie(jwt) {
    return `session=${jwt}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${SESSION_MAX_AGE}`;
}

export function clearSessionCookie() {
    return "session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0";
}

export function parseCookies(cookieHeader) {
    if (!cookieHeader) return {};
    return Object.fromEntries(
        cookieHeader.split(";").map(c => {
            const [key, ...rest] = c.trim().split("=");
            return [key, rest.join("=")];
        })
    );
}
