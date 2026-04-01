import dotenv from 'dotenv';
dotenv.config({path: '.env'});
import {MongoClient} from 'mongodb';
import {glob} from 'glob';
import path from 'path';
import {fileURLToPath} from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemasDir = path.resolve(__dirname, '../netlify/shared/schemas');

function indexName(keyObj) {
    return Object.entries(keyObj).map(([k, v]) => `${k}_${v}`).join('_');
}

async function syncCollection(db, collectionName, desiredIndexes) {
    const col = db.collection(collectionName);
    const existing = await col.indexes();

    const desiredNames = new Set(desiredIndexes.map(idx => idx.options?.name || indexName(idx.key)));

    for (const idx of existing) {
        if (idx.name === '_id_') continue;
        if (!desiredNames.has(idx.name)) {
            console.log(`  DROP ${idx.name}`);
            await col.dropIndex(idx.name);
        }
    }

    for (const idx of desiredIndexes) {
        const name = idx.options?.name || indexName(idx.key);
        const options = {...(idx.options || {}), name};
        console.log(`  ENSURE ${name}`);
        await col.createIndex(idx.key, options);
    }
}

async function loadSchemas() {
    const files = (await glob('*.mjs', {cwd: schemasDir})).sort();
    const schemas = [];
    for (const file of files) {
        const mod = await import(path.join(schemasDir, file));
        if (mod.collection && mod.indexes) {
            schemas.push({collection: mod.collection, indexes: mod.indexes, file});
        }
    }
    return schemas;
}

async function main() {
    const uri = process.env.MONGO_DB_URI;
    const dbName = process.env.MONGODB_DATABASE;
    if (!uri || !dbName) {
        console.error('Missing required env vars: MONGO_DB_URI, MONGODB_DATABASE');
        process.exit(1);
    }

    const schemas = await loadSchemas();
    console.log(`Found ${schemas.length} schema(s) with index definitions`);

    console.log(`Connecting to ${dbName}...`);
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const db = client.db(dbName);

        for (const schema of schemas) {
            console.log(`\n${schema.collection} (${schema.file}):`);
            await syncCollection(db, schema.collection, schema.indexes);
        }

        // TODO: Remove after first production run — cleans up legacy used authCode docs
        const deleted = await db.collection('authCodes').deleteMany({used: true});
        if (deleted.deletedCount > 0) {
            console.log(`\nCleaned up ${deleted.deletedCount} legacy used auth codes`);
        }

        console.log('\nDone.');
    } finally {
        await client.close();
    }
}

main().catch(err => {
    console.error('Index sync failed:', err);
    process.exit(1);
});
