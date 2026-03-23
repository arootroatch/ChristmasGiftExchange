import {layout} from './layout.mjs';
import {escapeHtml} from './escapeHtml.mjs';

export function render({recipientName}) {
    return layout(`
    <tr>
        <td align="center" style="padding: 30px; font-size: 36px; color: #198c0a;">
            Wishlist Alert!
        </td>
    </tr>
    <tr>
        <td align="center" style="padding: 20px 50px; font-size: 18px; color: #333;">
            ${escapeHtml(recipientName)} has added a wishlist for you to check out!
        </td>
    </tr>`);
}

export async function getData(db) {
    const recipient = await db.collection('users').findOne({wishlists: {$ne: []}});

    return {
        recipientName: recipient.name,
    };
}
