// Read-only audit: lists users whose emails differ only by case/whitespace.
// Usage: node dev/find-duplicate-users.mjs --env prod   (or --env dev)
import {MongoClient} from 'mongodb';
import {fileURLToPath} from 'node:url';
import {normalizeEmail} from '../netlify/shared/email.mjs';
import {parseArgs, resolveConnection} from './run-migrations.mjs';

export async function findDuplicateUserGroups(db) {
    const users = await db.collection('users').find().toArray();

    const byEmail = new Map();
    for (const user of users) {
        const email = normalizeEmail(user.email);
        if (!byEmail.has(email)) byEmail.set(email, []);
        byEmail.get(email).push(user);
    }

    const groups = [...byEmail.entries()].filter(([, group]) => group.length > 1);
    return Promise.all(groups.map(async ([email, group]) => ({
        email,
        users: await Promise.all(group.map(user => withActivity(db, user))),
    })));
}

function formatUser(u) {
    const latest = u.latestExchange ? u.latestExchange.toISOString().slice(0, 10) : 'never';
    return `    ${u._id}  "${u.email}"  name="${u.name}"  exchanges=${u.exchangeCount} (latest ${latest})  ` +
        `organized=${u.organizedExchanges}+${u.organizedLinkExchanges} link  wishlists=${u.wishlistCount}  wishItems=${u.wishItemCount}`;
}

async function main() {
    const {env} = parseArgs(process.argv.slice(2));
    const {uri, dbName} = resolveConnection(env);
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const db = client.db(dbName);
        const groups = await findDuplicateUserGroups(db);
        const mixedCase = await db.collection('users').countDocuments({email: {$regex: /[A-Z]|^\s|\s$/}});

        console.log(`Database: ${dbName}`);
        console.log(`Duplicate groups: ${groups.length} (${groups.reduce((n, g) => n + g.users.length, 0)} users)\n`);
        for (const group of groups) {
            console.log(group.email);
            group.users.forEach(u => console.log(formatUser(u)));
        }
        console.log(`\nUsers with uppercase/whitespace in email (incl. duplicates): ${mixedCase}`);
    } finally {
        await client.close();
    }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main().catch(err => {
        console.error('Audit failed:', err);
        process.exit(1);
    });
}

async function withActivity(db, user) {
    const exchanges = await db.collection('exchanges')
        .find({participants: user._id}, {projection: {createdAt: 1}})
        .sort({createdAt: -1})
        .toArray();
    return {
        ...user,
        exchangeCount: exchanges.length,
        latestExchange: exchanges[0]?.createdAt ?? null,
        organizedExchanges: await db.collection('exchanges').countDocuments({organizer: user._id}),
        organizedLinkExchanges: await db.collection('linkExchanges').countDocuments({organizer: user._id}),
        wishlistCount: user.wishlists?.length ?? 0,
        wishItemCount: user.wishItems?.length ?? 0,
    };
}
