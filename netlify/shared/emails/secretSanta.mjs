import {layout} from './layout.mjs';
import {escapeHtml} from './escapeHtml.mjs';

export function render({name, recipient}) {
    return layout(`
    <tr>
        <td align="center" style="padding-top: 50px; padding-bottom: 30px; font-size: 36px; color: #69292a;">
            Greetings, ${escapeHtml(name)}!
        </td>
    </tr>
    <tr>
        <td align="center" style="font-size: 36px; padding-bottom: 30px; color: #555;">
            Your gift exchange recipient is...
        </td>
    </tr>
    <tr>
        <td align="center" style="padding: 0 50px 30px;">
            <span style="display: inline-block; font-size: 32px; color: #198c0a; font-weight: bold; padding: 16px 24px;
                         background: #fff; border-radius: 10px; border: 2px solid #198c0a;
                         box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                ${escapeHtml(recipient)}!
            </span>
        </td>
    </tr>
    <tr>
        <td align="center" style="padding: 20px 50px 10px; font-size: 16px; color: #333;">
            View ${escapeHtml(recipient)}'s wish list and send your Secret Santa your wishlist in your participant dashboard.
        </td>
    </tr>
    <tr>
        <td align="center" style="padding: 10px 50px 30px;">
            <a href="https://gift-exchange-generator.com/dashboard" style="display: inline-block; padding: 14px 32px; background-color: #198c0a; color: #fff; font-size: 18px; font-weight: bold; text-decoration: none; border-radius: 8px;">
                Open Dashboard
            </a>
        </td>
    </tr>`);
}

export async function getData(db) {
    const exchange = await db.collection('exchanges').findOne();
    const assignment = exchange.assignments[0];
    const giver = await db.collection('users').findOne({_id: assignment.giverId});
    const recipient = await db.collection('users').findOne({_id: assignment.recipientId});

    return {
        name: giver.name,
        recipient: recipient.name,
    };
}
