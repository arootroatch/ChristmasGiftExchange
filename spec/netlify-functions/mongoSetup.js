import {MongoMemoryServer} from 'mongodb-memory-server';

let server;

export async function setup() {
    server = await MongoMemoryServer.create();
    process.env.MONGO_DB_URI = server.getUri();
    process.env.MONGODB_DATABASE = 'test-db';
    process.env.MONGODB_COLLECTION = 'legacy-names';
}

export async function teardown() {
    await server.stop();
}
