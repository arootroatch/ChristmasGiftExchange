import crypto from 'crypto';

export async function migrateLegacyData(db, legacyCollectionName, options = {}) {
    const {dryRun = false} = options;
    const legacyCol = db.collection(legacyCollectionName);
    const usersCol = db.collection('users');
    const exchangesCol = db.collection('exchanges');

    const allDocs = await legacyCol.find().toArray();
    console.log(`Found ${allDocs.length} legacy documents`);

    // Group by exchange id
    const exchangeGroups = {};
    for (const doc of allDocs) {
        if (!exchangeGroups[doc.id]) exchangeGroups[doc.id] = [];
        exchangeGroups[doc.id].push(doc);
    }
    console.log(`Found ${Object.keys(exchangeGroups).length} exchanges`);

    // Upsert all unique users (by email)
    const emailToUser = {};
    let usersCreated = 0;
    let usersSkipped = 0;

    for (const doc of allDocs) {
        if (emailToUser[doc.email]) continue;

        if (dryRun) {
            const existing = await usersCol.findOne({email: doc.email});
            if (existing) {
                emailToUser[doc.email] = existing;
                usersSkipped++;
            } else {
                emailToUser[doc.email] = {_id: `dry-run-${doc.email}`, name: doc.name, email: doc.email};
                usersCreated++;
            }
            continue;
        }

        const existing = await usersCol.findOne({email: doc.email});
        const result = await usersCol.findOneAndUpdate(
            {email: doc.email},
            {
                $set: {name: doc.name, email: doc.email},
                $setOnInsert: {
                    token: crypto.randomUUID(),
                    wishlists: [],
                    wishItems: [],
                },
            },
            {upsert: true, returnDocument: 'after'}
        );
        emailToUser[doc.email] = result;
        if (existing) {
            usersSkipped++;
        } else {
            usersCreated++;
        }
    }

    // Create exchanges
    let exchangesCreated = 0;
    let exchangesSkipped = 0;

    for (const [exchangeId, docs] of Object.entries(exchangeGroups)) {
        const existing = await exchangesCol.findOne({exchangeId});
        if (existing) {
            exchangesSkipped++;
            console.log(`Skipping exchange ${exchangeId} (already exists)`);
            continue;
        }

        const nameToEmail = {};
        for (const doc of docs) {
            nameToEmail[doc.name] = doc.email;
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
