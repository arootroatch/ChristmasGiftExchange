import {methodNotAllowed, serverError} from "./responses.mjs";

export function apiHandler(method, fn) {
    return async (event) => {
        if (event.httpMethod !== method) {
            return methodNotAllowed();
        }
        try {
            return await fn(event);
        } catch (error) {
            return serverError(error.message);
        }
    };
}
