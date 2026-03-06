export function ok(data) {
    return {statusCode: 200, body: JSON.stringify(data)};
}

export function error(statusCode, message) {
    return {statusCode, body: JSON.stringify({error: message})};
}

export function methodNotAllowed() {
    return {statusCode: 405, body: "Method Not Allowed"};
}

export function badRequest(msg) {
    return error(400, msg);
}

export function unauthorized(msg) {
    return error(401, msg);
}

export function forbidden(msg) {
    return error(403, msg);
}

export function notFound(msg) {
    return error(404, msg);
}

export function serverError(msg) {
    return error(500, msg);
}
