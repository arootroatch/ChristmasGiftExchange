export async function migrateLegacyData(db, legacyCollectionName, options = {}) {
    const {dryRun = false} = options;
    const legacyCol = db.collection(legacyCollectionName);
    const usersCol = db.collection('users');
    const exchangesCol = db.collection('exchanges');

    const allDocs = await legacyCol.find().toArray();
    console.log(`Found ${allDocs.length} legacy documents`);

    // Group by exchange id (skip docs without an exchange id)
    const exchangeGroups = {};
    for (const doc of allDocs) {
        if (!doc.id || !doc.email) continue;
        if (!exchangeGroups[doc.id]) exchangeGroups[doc.id] = [];
        exchangeGroups[doc.id].push(doc);
    }
    console.log(`Found ${Object.keys(exchangeGroups).length} exchanges`);

    // Look up all existing users by email
    const emailToUser = {};
    const allUsers = await usersCol.find().toArray();
    for (const user of allUsers) {
        emailToUser[user.email] = user;
    }
    console.log(`Loaded ${allUsers.length} users`);
    const usersCreated = 0;
    const usersSkipped = allUsers.length;

    // Create exchanges
    let exchangesCreated = 0;
    let exchangesSkipped = 0;

    const exchangeIds = Object.keys(exchangeGroups);
    let exchangeIndex = 0;

    for (const [exchangeId, docs] of Object.entries(exchangeGroups)) {
        exchangeIndex++;
        console.log(`Processing exchange ${exchangeIndex}/${exchangeIds.length}: ${exchangeId} (${docs.length} participants)`);
        const existing = await exchangesCol.findOne({exchangeId});
        if (existing) {
            exchangesSkipped++;
            console.log(`  Skipping (already exists)`);
            continue;
        }

        const nameToEmail = {};
        for (const doc of docs) {
            nameToEmail[doc.name] = doc.email;
        }

        const hasUnresolvableUser = docs.some(doc =>
            !emailToUser[doc.email] || !nameToEmail[doc.recipient] || !emailToUser[nameToEmail[doc.recipient]]
        );
        if (hasUnresolvableUser) {
            exchangesSkipped++;
            console.log(`  Skipping (unresolvable participant or recipient)`);
            continue;
        }

        const participants = docs.map(doc => emailToUser[doc.email]._id);

        const assignments = docs.map(doc => ({
            giverId: emailToUser[doc.email]._id,
            recipientId: emailToUser[nameToEmail[doc.recipient]]._id,
        }));

        if (dryRun) {
            exchangesCreated++;
            continue;
        }

        await exchangesCol.insertOne({
            exchangeId,
            createdAt: new Date(docs[0].date),
            isSecretSanta: true,
            houses: [],
            participants,
            assignments,
        });
        exchangesCreated++;
    }

    const summary = {usersCreated, usersSkipped, exchangesCreated, exchangesSkipped, dryRun};
    console.log('Migration complete:', summary);
    return summary;
}
