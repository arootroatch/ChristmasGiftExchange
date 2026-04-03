export const description = 'Second migration';
export async function up(db) { await db.collection('test').insertOne({migrated: 2}); }
export async function down(db) { await db.collection('test').deleteOne({migrated: 2}); }
