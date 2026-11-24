export const description = 'Merge users whose emails differ only by case/whitespace, and lowercase all emails';

// Every change is snapshotted here first so down() can restore it.
const BACKUP = 'userMergeBackup';

// Inlined (not imported from netlify/shared) so this migration stays frozen if app code changes.
function normalizeEmail(email) {
    return email.trim().toLowerCase();
}

function groupByNormalizedEmail(users) {
    const groups = new Map();
    for (const user of users) {
        const email = normalizeEmail(user.email);
        if (!groups.has(email)) groups.set(email, []);
        groups.get(email).push(user);
    }
    return groups;
}

async function latestExchangeDate(db, userId) {
    const [latest] = await db.collection('exchanges')
        .find({participants: userId}, {projection: {createdAt: 1}})
        .sort({createdAt: -1})
        .limit(1)
        .toArray();
    return latest?.createdAt?.getTime() ?? -Infinity;
}

// Keep the user in the most recent exchange (their current identity); ties go to the oldest account.
async function pickSurvivor(db, group) {
    const ranked = await Promise.all(group.map(async user => ({user, latest: await latestExchangeDate(db, user._id)})));
    ranked.sort((a, b) => (b.latest - a.latest) || a.user._id.toString().localeCompare(b.user._id.toString()));
    return ranked[0].user;
}

function uniqueIds(ids) {
    const seen = new Set();
    return ids.filter(id => !seen.has(id.toString()) && seen.add(id.toString()));
}

function repointExchange(exchange, otherIds, survivorId) {
    const isOther = id => otherIds.some(other => other.equals(id));
    const swap = id => isOther(id) ? survivorId : id;
    return {
        ...exchange,
        ...(exchange.organizer && {organizer: swap(exchange.organizer)}),
        participants: uniqueIds(exchange.participants.map(swap)),
        assignments: exchange.assignments.map(a => ({giverId: swap(a.giverId), recipientId: swap(a.recipientId)})),
        houses: exchange.houses.map(h => ({...h, members: uniqueIds(h.members.map(swap))})),
    };
}

function referencesQuery(ids) {
    return {$or: [{participants: {$in: ids}}, {organizer: {$in: ids}}]};
}

async function mergeGroup(db, email, group) {
    const survivor = await pickSurvivor(db, group);
    const others = group.filter(u => !u._id.equals(survivor._id));
    const otherIds = others.map(u => u._id);

    const exchanges = await db.collection('exchanges').find(referencesQuery(otherIds)).toArray();
    const linkExchanges = await db.collection('linkExchanges')
        .find({organizer: {$in: otherIds}}, {projection: {organizer: 1}})
        .toArray();
    await db.collection(BACKUP).insertOne({
        type: 'merge',
        survivorBefore: survivor,
        removedUsers: others,
        exchangesBefore: exchanges,
        linkExchangesBefore: linkExchanges,
    });

    for (const exchange of exchanges) {
        await db.collection('exchanges').replaceOne({_id: exchange._id}, repointExchange(exchange, otherIds, survivor._id));
    }
    await db.collection('linkExchanges').updateMany({organizer: {$in: otherIds}}, {$set: {organizer: survivor._id}});

    await db.collection('users').deleteMany({_id: {$in: otherIds}});
    await db.collection('users').updateOne({_id: survivor._id}, {$set: mergedFields(email, survivor, others)});
}

// The survivor's entries win on url collisions; the others' extra entries are appended.
function unionByUrl(lists) {
    const seen = new Set();
    return lists.flat().filter(entry => !seen.has(entry.url) && seen.add(entry.url));
}

function mergedFields(email, survivor, others) {
    const all = [survivor, ...others];
    const currency = all.find(u => u.currency)?.currency;
    return {
        email,
        wishlists: unionByUrl(all.map(u => u.wishlists ?? [])),
        wishItems: unionByUrl(all.map(u => u.wishItems ?? [])),
        ...(currency && {currency}),
    };
}

async function normalizeUser(db, email, user) {
    await db.collection(BACKUP).insertOne({type: 'normalize', userId: user._id, originalEmail: user.email});
    await db.collection('users').updateOne({_id: user._id}, {$set: {email}});
}

export async function up(db) {
    const users = await db.collection('users').find().toArray();
    for (const [email, group] of groupByNormalizedEmail(users)) {
        if (group.length > 1) await mergeGroup(db, email, group);
        else if (group[0].email !== email) await normalizeUser(db, email, group[0]);
    }
}

async function restoreMerge(db, backup) {
    await db.collection('users').replaceOne({_id: backup.survivorBefore._id}, backup.survivorBefore, {upsert: true});
    for (const user of backup.removedUsers) {
        await db.collection('users').replaceOne({_id: user._id}, user, {upsert: true});
    }
    for (const exchange of backup.exchangesBefore) {
        await db.collection('exchanges').replaceOne({_id: exchange._id}, exchange);
    }
    for (const {_id, organizer} of backup.linkExchangesBefore) {
        await db.collection('linkExchanges').updateOne({_id}, {$set: {organizer}});
    }
}

// Best effort: merged users and their exchanges are restored from snapshots, so any edits made to
// them after up() (e.g. wishlist changes) are overwritten. Exchanges created after up() keep
// pointing at the survivor.
export async function down(db) {
    const backups = await db.collection(BACKUP).find().sort({_id: -1}).toArray();
    for (const backup of backups) {
        if (backup.type === 'merge') await restoreMerge(db, backup);
        else await db.collection('users').updateOne({_id: backup.userId}, {$set: {email: backup.originalEmail}});
    }
    await db.collection(BACKUP).deleteMany({});
}
