import {layout} from './layout.mjs';
import {wishlistViewPath} from '../links.mjs';

export function render({recipientName, wishlistViewUrl}) {
    return layout(`
    <tr>
        <td align="center" style="padding-top: 50px; padding-bottom: 20px; font-size: 24px">
            Here's the link to view ${recipientName}'s wish list
        </td>
    </tr>
    <tr>
        <td align="center" style="padding: 20px 50px;">
            <a href="${wishlistViewUrl}"
               style="display: inline-block; padding: 12px 24px; background-color: #2e7d32;
                      color: white; text-decoration: none; border-radius: 4px; font-size: 16px;">
                View ${recipientName}'s Wish List
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
        recipientName: recipient.name,
        wishlistViewUrl: wishlistViewPath(giver.token, exchange.exchangeId),
    };
}
