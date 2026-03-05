import dotenv from 'dotenv';
dotenv.config({path: '.env.local'});
import {MongoClient} from 'mongodb';
import {migrateLegacyData} from './migrate-legacy.mjs';

const dryRun = process.argv.includes('--dry-run');

async function main() {
    const uri = process.env.MONGO_DB_URI;
    const dbName = process.env.MONGODB_DATABASE;
    const collectionName = process.env.MONGODB_COLLECTION;

    if (!uri || !dbName || !collectionName) {
        console.error('Missing required env vars: MONGO_DB_URI, MONGODB_DATABASE, MONGODB_COLLECTION');
        process.exit(1);
    }

    console.log(`Connecting to ${dbName}...`);
    if (dryRun) console.log('*** DRY RUN — no data will be written ***');

    const client = new MongoClient(uri);
    try {
        await client.connect();
        const db = client.db(dbName);
        const result = await migrateLegacyData(db, collectionName, {dryRun});
        console.log('Result:', JSON.stringify(result, null, 2));
    } finally {
        await client.close();
    }
}

main().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
