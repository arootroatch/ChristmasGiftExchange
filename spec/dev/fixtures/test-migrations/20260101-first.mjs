export const description = 'First migration';
export async function up(db) { await db.collection('test').insertOne({migrated: 1}); }
export async function down(db) { await db.collection('test').deleteOne({migrated: 1}); }
