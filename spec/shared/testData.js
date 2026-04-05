import {ObjectId} from 'mongodb';

//region Factories

export function makeUser({name, email, wishlists, wishItems, currency, _id} = {}) {
    return {
        _id: _id ?? new ObjectId(),
        name: name ?? 'Test User',
        email: email ?? 'test@test.com',
        wishlists: wishlists ?? [],
        wishItems: wishItems ?? [],
        ...(currency !== undefined && {currency}),
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

//endregion

//region Shared Test Data

export const alex = makeUser({name: 'Alex', email: 'alex@test.com'});
export const whitney = makeUser({name: 'Whitney', email: 'whitney@test.com'});
export const hunter = makeUser({name: 'Hunter', email: 'hunter@test.com'});
export const megan = makeUser({name: 'Megan', email: 'megan@test.com'});

export const twoPersonExchange = makeExchange({
    exchangeId: 'two-person-exchange',
    organizer: alex._id,
    createdAt: new Date('2025-12-01'),
    participants: [alex._id, whitney._id],
    assignments: [{giverId: alex._id, recipientId: whitney._id}],
    houses: [{name: 'Family', members: [alex._id, whitney._id]}],
});

export const threePersonExchange = makeExchange({
    exchangeId: 'three-person-exchange',
    organizer: alex._id,
    createdAt: new Date('2025-12-01'),
    participants: [alex._id, whitney._id, hunter._id],
    assignments: [
        {giverId: alex._id, recipientId: whitney._id},
        {giverId: whitney._id, recipientId: hunter._id},
        {giverId: hunter._id, recipientId: alex._id},
    ],
    houses: [{name: 'Family', members: [alex._id, whitney._id, hunter._id]}],
});

export const twoPersonSecretSanta = makeExchange({
    exchangeId: 'two-person-secret-santa',
    organizer: alex._id,
    createdAt: new Date('2025-12-01'),
    isSecretSanta: true,
    participants: [alex._id, whitney._id],
    assignments: [{giverId: alex._id, recipientId: whitney._id}],
    houses: [{name: 'Family', members: [alex._id, whitney._id]}],
});

export const threePersonSecretSanta = makeExchange({
    exchangeId: 'three-person-secret-santa',
    organizer: alex._id,
    createdAt: new Date('2025-12-01'),
    isSecretSanta: true,
    participants: [alex._id, whitney._id, hunter._id],
    assignments: [
        {giverId: alex._id, recipientId: whitney._id},
        {giverId: whitney._id, recipientId: hunter._id},
        {giverId: hunter._id, recipientId: alex._id},
    ],
    houses: [{name: 'Family', members: [alex._id, whitney._id, hunter._id]}],
});

//endregion

//region Seeding Helpers

export function seedUsers(db, ...users) {
    return db.collection('users').insertMany(users);
}

export function seedExchange(db, exchange) {
    return db.collection('exchanges').insertOne(exchange);
}

export function findUser(db, query) {
    return db.collection('users').findOne(query);
}

export function findExchange(db, query) {
    return db.collection('exchanges').findOne(query);
}

//endregion
