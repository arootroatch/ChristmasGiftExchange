import {setupMongo, teardownMongo, cleanCollections} from '../netlify-functions/mongoHelper.js';

export {setupMongo, teardownMongo, cleanCollections};
export {makeUser, makeExchange, buildEvent} from '../shared/testFactories.js';

export function seedUsers(db, ...users) {
    return db.collection('users').insertMany(users);
}

export function seedExchange(db, exchange) {
    return db.collection('exchanges').insertOne(exchange);
}
