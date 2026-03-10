import {ObjectId} from 'mongodb';
import {setupMongo, teardownMongo, cleanCollections} from '../netlify-functions/mongoHelper.js';

export {setupMongo, teardownMongo, cleanCollections};

export function buildEvent(httpMethod, {body, path, queryStringParameters} = {}) {
    return {
        httpMethod,
        body: body ? JSON.stringify(body) : undefined,
        path: path || '/',
        queryStringParameters: queryStringParameters || {},
    };
}

export function seedUsers(db, ...users) {
    return db.collection('users').insertMany(users);
}

export function seedExchange(db, exchange) {
    return db.collection('exchanges').insertOne(exchange);
}

export function makeUser({name, email, token, wishlists, wishItems, _id} = {}) {
    return {
        _id: _id || new ObjectId(),
        name: name || 'Test User',
        email: email || 'test@test.com',
        token: token || crypto.randomUUID(),
        wishlists: wishlists || [],
        wishItems: wishItems || [],
    };
}

export function makeExchange({exchangeId, participants, assignments, houses, isSecretSanta, createdAt} = {}) {
    return {
        exchangeId: exchangeId || 'test-exchange',
        createdAt: createdAt || new Date(),
        isSecretSanta: isSecretSanta || false,
        participants: participants || [],
        assignments: assignments || [],
        houses: houses || [],
    };
}
