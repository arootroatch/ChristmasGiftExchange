import {getUsersCollection} from "./db.mjs";
import {userSchema} from "./schemas/user.mjs";

const recipientWishlistSchema = userSchema.pick({
    name: true,
    wishlists: true,
    wishItems: true,
    currency: true,
});

export async function getRecipientWishlist(exchange, giverId) {
    const assignment = exchange.assignments.find(a => a.giverId.equals(giverId));
    if (!assignment) return null;

    const usersCol = await getUsersCollection();
    const recipient = await usersCol.findOne({_id: assignment.recipientId});
    if (!recipient) return null;

    return recipientWishlistSchema.parse(recipient);
}
