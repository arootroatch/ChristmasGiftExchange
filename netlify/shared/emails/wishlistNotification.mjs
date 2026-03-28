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
    </tr>
    <tr>
        <td align="center" style="padding: 10px 50px 30px;">
            <a href="https://gift-exchange-generator.com/dashboard/recipient" style="display: inline-block; padding: 14px 32px; background-color: #198c0a; color: #fff; font-size: 18px; font-weight: bold; text-decoration: none; border-radius: 8px;">
                View Wish List
            </a>
        </td>
    </tr>`);
}

export async function getData(db) {
    const recipient = await db.collection('users').findOne({wishlists: {$ne: []}});

    return {
        recipientName: recipient.name,
    };
}
