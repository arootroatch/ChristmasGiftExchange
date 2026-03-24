import {getUsersCollection} from "./db.mjs";

/**
 * Given an exchange and a giver's ID, find the recipient and return their wishlist data.
 * Returns null if the giver has no assignment in this exchange.
 */
export async function getRecipientWishlist(exchange, giverId) {
    const assignment = exchange.assignments.find(a => a.giverId.equals(giverId));
    if (!assignment) return null;

    const usersCol = await getUsersCollection();
    const recipient = await usersCol.findOne({_id: assignment.recipientId});
    if (!recipient) return null;

    return {
        recipientName: recipient.name,
        wishlists: recipient.wishlists ?? [],
        wishItems: recipient.wishItems ?? [],
        currency: recipient.currency ?? 'USD',
    };
}
