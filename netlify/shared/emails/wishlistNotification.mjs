import {layout} from './layout.mjs';
import {wishlistViewPath} from '../links.mjs';
import {escapeHtml} from './escapeHtml.mjs';

export function render({recipientName, wishlistViewUrl}) {
    return layout(`
    <tr>
        <td align="center" style="padding: 30px; font-size: 36px; color: #2e7d32;">
            Wishlist Alert!
        </td>
    </tr>
    <tr>
        <td align="center" style="padding: 20px 50px; font-size: 18px; color: #333;">
            ${escapeHtml(recipientName)} has added a wishlist for you to check out!
        </td>
    </tr>
    <tr>
        <td align="center" style="padding: 20px 50px;">
            <a href="${escapeHtml(wishlistViewUrl)}"
               style="display: inline-block; padding: 12px 24px; background-color: #2e7d32;
                      color: white; text-decoration: none; border-radius: 4px; font-size: 16px;">
                View Their Wishlist
            </a>
        </td>
    </tr>`);
}

export async function getData(db) {
    const recipient = await db.collection('users').findOne({wishlists: {$ne: []}});
    const exchange = await db.collection('exchanges').findOne({
        'assignments.recipientId': recipient._id,
    });
    const assignment = exchange.assignments.find(a => a.recipientId.equals(recipient._id));
    const giver = await db.collection('users').findOne({_id: assignment.giverId});

    return {
        recipientName: recipient.name,
        wishlistViewUrl: wishlistViewPath(giver.token, exchange.exchangeId),
    };
}
