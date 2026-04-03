import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {glob} from 'glob';
import {MongoClient} from 'mongodb';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const LOCK_ID = 'migration_lock';
const LOCK_TTL_MS = 10 * 60 * 1000;

const ENV_FILES = {
    dev: '.env.local',
    prod: '.env',
};

function readEnvValue(envFile, key) {
    const content = fs.readFileSync(envFile, 'utf-8');
    const match = content.match(new RegExp(`^${key}="(.+)"$`, 'm'));
    return match ? match[1] : null;
}

export function parseArgs(args) {
    let env = null;
    let target = null;

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--env' && args[i + 1]) {
            env = args[++i];
        } else {
            target = args[i];
        }
    }

    return {env, target};
}

export function resolveConnection(env) {
    if (!env) {
        const uri = process.env.MONGO_DB_URI;
        const dbName = process.env.MONGODB_DATABASE;
        if (!uri || !dbName) {
            throw new Error('Missing required env vars: MONGO_DB_URI, MONGODB_DATABASE');
        }
        return {uri, dbName};
    }

    const envFile = ENV_FILES[env];
    if (!envFile) {
        throw new Error(`Unknown environment "${env}". Available: ${Object.keys(ENV_FILES).join(', ')}`);
    }

    const uri = readEnvValue(envFile, 'MONGO_DB_URI');
    const dbName = readEnvValue(envFile, 'MONGODB_DATABASE') || 'gift-exchange';
    if (!uri) {
        throw new Error(`MONGO_DB_URI not found in ${envFile}`);
    }
    return {uri, dbName};
}

export async function discoverMigrations(migrationsDir) {
    const files = (await glob('*.mjs', {cwd: migrationsDir})).sort();
    const migrations = [];
    for (const file of files) {
        if (file === '.gitkeep') continue;
        const mod = await import(path.join(migrationsDir, file));
        const name = file.replace(/\.mjs$/, '');
        migrations.push({
            name,
            description: mod.description || name,
            up: mod.up,
            down: mod.down,
        });
    }
    return migrations;
}

export function computePlan(migrations, executed, target) {
    const executedSet = new Set(executed.map(e => e._id));

    if (!target) {
        return migrations
            .filter(m => !executedSet.has(m.name))
            .map(m => ({migration: m, direction: 'up'}));
    }

    const targetIndex = migrations.findIndex(m => m.name === target);
    if (targetIndex === -1) {
        throw new Error(`Target migration "${target}" not found in migration files.`);
    }

    const plan = [];

    // Run ups for any unexecuted migration up to and including the target
    for (let i = 0; i <= targetIndex; i++) {
        if (!executedSet.has(migrations[i].name)) {
            plan.push({migration: migrations[i], direction: 'up'});
        }
    }

    // Run downs for any executed migration after the target, in reverse order
    for (let i = migrations.length - 1; i > targetIndex; i--) {
        if (executedSet.has(migrations[i].name)) {
            plan.push({migration: migrations[i], direction: 'down'});
        }
    }

    return plan;
}

export async function executePlan(db, plan) {
    const migrationsCol = db.collection('migrations');

    for (const step of plan) {
        const {migration, direction} = step;
        console.log(`  ${direction.toUpperCase()} ${migration.name}: ${migration.description}`);

        await migration[direction](db);

        if (direction === 'up') {
            await migrationsCol.insertOne({
                _id: migration.name,
                description: migration.description,
                executedAt: new Date(),
            });
        } else {
            await migrationsCol.deleteOne({_id: migration.name});
        }
    }
}

export async function acquireLock(db, runId) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + LOCK_TTL_MS);
    const migrationsCol = db.collection('migrations');

    try {
        await migrationsCol.insertOne({
            _id: LOCK_ID,
            acquiredAt: now,
            runId,
            expiresAt,
        });
    } catch (err) {
        if (err.code === 11000) {
            const existing = await migrationsCol.findOne({_id: LOCK_ID});
            if (existing && existing.expiresAt < now) {
                await migrationsCol.replaceOne(
                    {_id: LOCK_ID, expiresAt: {$lt: now}},
                    {_id: LOCK_ID, acquiredAt: now, runId, expiresAt},
                );
                return;
            }
            throw new Error(`Migration lock held by run ${existing?.runId} (acquired ${existing?.acquiredAt.toISOString()}). If this is stale, wait for expiry or manually remove the migration_lock document.`);
        }
        throw err;
    }
}

export async function releaseLock(db, runId) {
    await db.collection('migrations').deleteOne({_id: LOCK_ID, runId});
}

export async function runMigrations(db, migrationsDir, target) {
    const runId = crypto.randomUUID();

    await acquireLock(db, runId);
    try {
        const migrations = await discoverMigrations(migrationsDir);
        if (migrations.length === 0) {
            console.log('No migration files found.');
            return;
        }

        const executed = await db.collection('migrations')
            .find({_id: {$ne: LOCK_ID}})
            .toArray();

        const plan = computePlan(migrations, executed, target);
        if (plan.length === 0) {
            console.log('Database is up to date.');
            return;
        }

        console.log(`Running ${plan.length} migration(s):`);
        await executePlan(db, plan);
        console.log('All migrations completed successfully.');
    } finally {
        await releaseLock(db, runId);
    }
}

const DEFAULT_MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function main() {
    const args = process.argv.slice(2);
    const {env, target} = parseArgs(args);
    const {uri, dbName} = resolveConnection(env);

    console.log(`Connecting to ${dbName}...`);
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const db = client.db(dbName);
        await runMigrations(db, DEFAULT_MIGRATIONS_DIR, target);
    } finally {
        await client.close();
    }
}

if (process.argv[1]?.endsWith('run-migrations.mjs')) {
    main().catch(err => {
        console.error('Migration failed:', err.message);
        process.exit(1);
    });
}
