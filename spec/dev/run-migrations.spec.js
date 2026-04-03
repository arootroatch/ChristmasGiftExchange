import {describe, it, expect, beforeAll, afterAll, afterEach} from 'vitest';
import crypto from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {setupMongo, teardownMongo, cleanCollections} from '../netlify-functions/mongoHelper.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('run-migrations', () => {
    let db, mongo;

    beforeAll(async () => {
        mongo = await setupMongo();
        ({db} = mongo);
    });

    afterEach(async () => {
        await cleanCollections(db, 'migrations', 'test');
    });

    afterAll(async () => {
        await teardownMongo(mongo);
    });

    describe('parseArgs', () => {
        it('returns no env and no target when no args given', async () => {
            const {parseArgs} = await import('../../dev/run-migrations.mjs');
            const result = parseArgs([]);
            expect(result).toEqual({env: null, target: null});
        });

        it('parses --env flag and target argument', async () => {
            const {parseArgs} = await import('../../dev/run-migrations.mjs');
            const result = parseArgs(['--env', 'dev', '20260401-some-migration']);
            expect(result).toEqual({env: 'dev', target: '20260401-some-migration'});
        });
    });

    describe('discoverMigrations', () => {
        it('returns empty array when no migration files exist', async () => {
            const {discoverMigrations} = await import('../../dev/run-migrations.mjs');
            const result = await discoverMigrations(path.join(__dirname, 'fixtures/empty-migrations'));
            expect(result).toEqual([]);
        });

        it('discovers and sorts migration files', async () => {
            const {discoverMigrations} = await import('../../dev/run-migrations.mjs');
            const result = await discoverMigrations(path.join(__dirname, 'fixtures/test-migrations'));
            expect(result).toHaveLength(2);
            expect(result[0].name).toBe('20260101-first');
            expect(result[0].description).toBe('First migration');
            expect(typeof result[0].up).toBe('function');
            expect(typeof result[0].down).toBe('function');
            expect(result[1].name).toBe('20260102-second');
        });
    });

    describe('acquireLock', () => {
        it('acquires lock when no lock exists', async () => {
            const {acquireLock} = await import('../../dev/run-migrations.mjs');
            const runId = crypto.randomUUID();
            await acquireLock(db, runId);

            const lock = await db.collection('migrations').findOne({_id: 'migration_lock'});
            expect(lock).not.toBeNull();
            expect(lock.runId).toBe(runId);
            expect(lock.acquiredAt).toBeInstanceOf(Date);
            expect(lock.expiresAt).toBeInstanceOf(Date);
        });

        it('throws when lock is held by another run', async () => {
            const {acquireLock} = await import('../../dev/run-migrations.mjs');
            const firstRunId = crypto.randomUUID();
            await acquireLock(db, firstRunId);

            const secondRunId = crypto.randomUUID();
            await expect(acquireLock(db, secondRunId)).rejects.toThrow('Migration lock held by run');
        });

        it('overwrites stale lock', async () => {
            const {acquireLock} = await import('../../dev/run-migrations.mjs');
            const staleRunId = crypto.randomUUID();
            await db.collection('migrations').insertOne({
                _id: 'migration_lock',
                acquiredAt: new Date('2020-01-01'),
                runId: staleRunId,
                expiresAt: new Date('2020-01-01'),
            });

            const newRunId = crypto.randomUUID();
            await acquireLock(db, newRunId);

            const lock = await db.collection('migrations').findOne({_id: 'migration_lock'});
            expect(lock.runId).toBe(newRunId);
        });
    });

    describe('releaseLock', () => {
        it('removes the lock document', async () => {
            const {acquireLock, releaseLock} = await import('../../dev/run-migrations.mjs');
            const runId = crypto.randomUUID();
            await acquireLock(db, runId);
            await releaseLock(db, runId);

            const lock = await db.collection('migrations').findOne({_id: 'migration_lock'});
            expect(lock).toBeNull();
        });
    });

    describe('computePlan', () => {
        it('returns all migrations as ups when none executed and no target', async () => {
            const {computePlan} = await import('../../dev/run-migrations.mjs');
            const migrations = [
                {name: '20260101-first'},
                {name: '20260102-second'},
            ];
            const executed = [];
            const result = computePlan(migrations, executed, null);
            expect(result).toEqual([
                {migration: migrations[0], direction: 'up'},
                {migration: migrations[1], direction: 'up'},
            ]);
        });

        it('skips already-executed migrations when no target', async () => {
            const {computePlan} = await import('../../dev/run-migrations.mjs');
            const migrations = [
                {name: '20260101-first'},
                {name: '20260102-second'},
                {name: '20260103-third'},
            ];
            const executed = [{_id: '20260101-first'}];
            const result = computePlan(migrations, executed, null);
            expect(result).toEqual([
                {migration: migrations[1], direction: 'up'},
                {migration: migrations[2], direction: 'up'},
            ]);
        });

        it('rolls back migrations after target in reverse order', async () => {
            const {computePlan} = await import('../../dev/run-migrations.mjs');
            const migrations = [
                {name: '20260101-first'},
                {name: '20260102-second'},
                {name: '20260103-third'},
            ];
            const executed = [
                {_id: '20260101-first'},
                {_id: '20260102-second'},
                {_id: '20260103-third'},
            ];
            const result = computePlan(migrations, executed, '20260101-first');
            expect(result).toEqual([
                {migration: migrations[2], direction: 'down'},
                {migration: migrations[1], direction: 'down'},
            ]);
        });

        it('runs ups and downs to reach target state', async () => {
            const {computePlan} = await import('../../dev/run-migrations.mjs');
            const migrations = [
                {name: '20260101-first'},
                {name: '20260102-second'},
                {name: '20260103-third'},
            ];
            const executed = [
                {_id: '20260101-first'},
                {_id: '20260103-third'},
            ];
            const result = computePlan(migrations, executed, '20260102-second');
            expect(result).toEqual([
                {migration: migrations[1], direction: 'up'},
                {migration: migrations[2], direction: 'down'},
            ]);
        });

        it('throws for unknown target migration', async () => {
            const {computePlan} = await import('../../dev/run-migrations.mjs');
            expect(() => computePlan([], [], 'nonexistent')).toThrow('Target migration "nonexistent" not found');
        });

        it('returns empty plan when already at target state', async () => {
            const {computePlan} = await import('../../dev/run-migrations.mjs');
            const migrations = [
                {name: '20260101-first'},
                {name: '20260102-second'},
            ];
            const executed = [
                {_id: '20260101-first'},
                {_id: '20260102-second'},
            ];
            const result = computePlan(migrations, executed, '20260102-second');
            expect(result).toEqual([]);
        });
    });

    describe('executePlan', () => {
        it('runs up migrations and records them in the migrations collection', async () => {
            const {executePlan} = await import('../../dev/run-migrations.mjs');

            let upCalled = false;
            const plan = [{
                migration: {
                    name: '20260101-test',
                    description: 'Test migration',
                    up: async (db) => {
                        await db.collection('test_data').insertOne({value: 1});
                        upCalled = true;
                    },
                    down: async () => {},
                },
                direction: 'up',
            }];

            await executePlan(db, plan);

            expect(upCalled).toBe(true);
            const record = await db.collection('migrations').findOne({_id: '20260101-test'});
            expect(record).not.toBeNull();
            expect(record.description).toBe('Test migration');
            expect(record.executedAt).toBeInstanceOf(Date);

            const data = await db.collection('test_data').findOne({value: 1});
            expect(data).not.toBeNull();
            await db.collection('test_data').deleteMany({});
        });

        it('runs down migrations and removes their records', async () => {
            const {executePlan} = await import('../../dev/run-migrations.mjs');

            await db.collection('migrations').insertOne({
                _id: '20260101-test',
                description: 'Test migration',
                executedAt: new Date(),
            });
            await db.collection('test_data').insertOne({value: 1});

            let downCalled = false;
            const plan = [{
                migration: {
                    name: '20260101-test',
                    description: 'Test migration',
                    up: async () => {},
                    down: async (db) => {
                        await db.collection('test_data').deleteOne({value: 1});
                        downCalled = true;
                    },
                },
                direction: 'down',
            }];

            await executePlan(db, plan);

            expect(downCalled).toBe(true);
            const record = await db.collection('migrations').findOne({_id: '20260101-test'});
            expect(record).toBeNull();

            const data = await db.collection('test_data').findOne({value: 1});
            expect(data).toBeNull();
        });

        it('halts on failure and preserves already-completed steps', async () => {
            const {executePlan} = await import('../../dev/run-migrations.mjs');

            const plan = [
                {
                    migration: {
                        name: '20260101-succeeds',
                        description: 'This one works',
                        up: async () => {},
                        down: async () => {},
                    },
                    direction: 'up',
                },
                {
                    migration: {
                        name: '20260102-fails',
                        description: 'This one breaks',
                        up: async () => { throw new Error('migration failed'); },
                        down: async () => {},
                    },
                    direction: 'up',
                },
            ];

            await expect(executePlan(db, plan)).rejects.toThrow('migration failed');

            const succeeded = await db.collection('migrations').findOne({_id: '20260101-succeeds'});
            expect(succeeded).not.toBeNull();

            const failed = await db.collection('migrations').findOne({_id: '20260102-fails'});
            expect(failed).toBeNull();
        });
    });

    describe('runMigrations', () => {
        it('runs all pending ups when no target is specified', async () => {
            const {runMigrations} = await import('../../dev/run-migrations.mjs');
            const migrationsDir = path.join(__dirname, 'fixtures/test-migrations');

            await runMigrations(db, migrationsDir, null);

            const records = await db.collection('migrations')
                .find({_id: {$ne: 'migration_lock'}})
                .sort({_id: 1})
                .toArray();
            expect(records).toHaveLength(2);
            expect(records[0]._id).toBe('20260101-first');
            expect(records[1]._id).toBe('20260102-second');

            const testData = await db.collection('test').find().toArray();
            expect(testData).toHaveLength(2);
        });

        it('rolls back to target migration', async () => {
            const {runMigrations} = await import('../../dev/run-migrations.mjs');
            const migrationsDir = path.join(__dirname, 'fixtures/test-migrations');

            // First, run all ups
            await runMigrations(db, migrationsDir, null);

            // Then roll back to the first migration
            await runMigrations(db, migrationsDir, '20260101-first');

            const records = await db.collection('migrations')
                .find({_id: {$ne: 'migration_lock'}})
                .sort({_id: 1})
                .toArray();
            expect(records).toHaveLength(1);
            expect(records[0]._id).toBe('20260101-first');

            const testData = await db.collection('test').find().toArray();
            expect(testData).toHaveLength(1);
        });

        it('is a no-op when already up to date', async () => {
            const {runMigrations} = await import('../../dev/run-migrations.mjs');
            const migrationsDir = path.join(__dirname, 'fixtures/test-migrations');

            await runMigrations(db, migrationsDir, null);
            // Run again — should be a no-op
            await runMigrations(db, migrationsDir, null);

            const records = await db.collection('migrations')
                .find({_id: {$ne: 'migration_lock'}})
                .toArray();
            expect(records).toHaveLength(2);
        });

        it('releases lock even when a migration fails', async () => {
            const {runMigrations} = await import('../../dev/run-migrations.mjs');
            const failDir = path.join(__dirname, 'fixtures/failing-migration');

            await expect(runMigrations(db, failDir, null)).rejects.toThrow();

            const lock = await db.collection('migrations').findOne({_id: 'migration_lock'});
            expect(lock).toBeNull();
        });
    });

    describe('resolveConnection', () => {
        it('returns env vars directly when no env flag given', async () => {
            const {resolveConnection} = await import('../../dev/run-migrations.mjs');
            const result = resolveConnection(null);
            expect(result.uri).toBe(process.env.MONGO_DB_URI);
            expect(result.dbName).toBe(process.env.MONGODB_DATABASE);
        });

        it('throws for unknown environment', async () => {
            const {resolveConnection} = await import('../../dev/run-migrations.mjs');
            expect(() => resolveConnection('bogus')).toThrow('Unknown environment "bogus"');
        });
    });
});
