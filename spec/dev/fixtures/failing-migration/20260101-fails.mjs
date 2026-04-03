export const description = 'This migration always fails';
export async function up() { throw new Error('intentional failure'); }
export async function down() {}
