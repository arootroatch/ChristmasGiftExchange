export async function migratePrices(db) {
    const usersCol = db.collection('users');
    const users = await usersCol.find({
        'wishItems.0': {$exists: true},
    }).toArray();

    let migrated = 0;

    for (const user of users) {
        const hasStringPrice = user.wishItems.some(item => typeof item.price === 'string');
        if (!hasStringPrice) continue;

        const updatedItems = user.wishItems.map(item => {
            if (typeof item.price !== 'string') return item;
            const cleaned = item.price.replace(/[$,]/g, '');
            const parsed = parseFloat(cleaned);
            const price = isNaN(parsed) ? 0 : Math.round(parsed * 100);
            return {...item, price};
        });

        await usersCol.updateOne(
            {_id: user._id},
            {$set: {wishItems: updatedItems, currency: 'USD'}}
        );
        migrated++;
    }

    return {migrated};
}
