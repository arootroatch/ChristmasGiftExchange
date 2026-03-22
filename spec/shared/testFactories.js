import {ObjectId} from 'mongodb';

export function makeUser({name, email, token, wishlists, wishItems, _id} = {}) {
    return {
        _id: _id ?? new ObjectId(),
        name: name ?? 'Test User',
        email: email ?? 'test@test.com',
        token: token ?? crypto.randomUUID(),
        wishlists: wishlists ?? [],
        wishItems: wishItems ?? [],
    };
}

export function makeExchange({exchangeId, organizer, participants, assignments, houses, isSecretSanta, createdAt} = {}) {
    return {
        exchangeId: exchangeId ?? crypto.randomUUID(),
        organizer: organizer ?? new ObjectId(),
        createdAt: createdAt ?? new Date(),
        isSecretSanta: isSecretSanta ?? false,
        participants: participants ?? [],
        assignments: assignments ?? [],
        houses: houses ?? [],
    };
}

export function buildEvent(httpMethod, {body, path, queryStringParameters} = {}) {
    return {
        httpMethod,
        body: body ? JSON.stringify(body) : undefined,
        path: path ?? '/',
        queryStringParameters: queryStringParameters ?? {},
    };
}
