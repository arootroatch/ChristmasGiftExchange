export const description = 'Merge users whose emails differ only by case/whitespace, and lowercase all emails';

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

// Batched: thousands of users only need lowercasing, and one round trip each is too slow for CI.
async function normalizeUsers(db, pending) {
    if (pending.length === 0) return;
    await db.collection('users').bulkWrite(
        pending.map(({email, user}) => ({updateOne: {filter: {_id: user._id}, update: {$set: {email}}}})),
        {ordered: false},
    );
}

export async function up(db) {
    const users = await db.collection('users').find().toArray();
    const pending = [];
    let merged = 0, removed = 0;
    for (const [email, group] of groupByNormalizedEmail(users)) {
        if (group.length > 1) {
            await mergeGroup(db, email, group);
            merged++;
            removed += group.length - 1;
        } else if (group[0].email !== email) {
            pending.push({email, user: group[0]});
        }
    }
    await normalizeUsers(db, pending);
    console.log(`Merged ${merged} duplicate groups (${removed} users removed); lowercased ${pending.length} other users`);
}

// Intentionally irreversible: this repairs data corrupted by case-sensitive email handling,
// and that state should never be recreated.
export async function down() {
}
