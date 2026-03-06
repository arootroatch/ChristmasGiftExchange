import {methodNotAllowed, serverError} from "./responses.mjs";

export function formatZodError(zodError) {
    const issue = zodError.issues[0];
    const path = issue.path.join(".");
    if (issue.code === "invalid_type" && issue.received === "undefined") {
        return `Missing required field: ${path}`;
    }
    if (issue.code === "invalid_type") {
        return `Expected ${issue.expected} for ${path}, got ${issue.received}`;
    }
    return issue.message;
}

export function validateBody(schema, event) {
    const result = schema.safeParse(JSON.parse(event.body));
    if (!result.success) {
        return {error: formatZodError(result.error)};
    }
    return {data: result.data};
}

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
