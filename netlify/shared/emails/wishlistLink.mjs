import {layout} from './layout.mjs';
import {escapeHtml} from './escapeHtml.mjs';

export function render({recipientName}) {
    return layout(`
    <tr>
        <td align="center" style="padding-top: 50px; padding-bottom: 20px; font-size: 24px; color: #333;">
            Here's the link to view ${escapeHtml(recipientName)}'s wish list
        </td>
    </tr>`);
}

export async function getData(db) {
    const exchange = await db.collection('exchanges').findOne();
    const assignment = exchange.assignments[0];
    const recipient = await db.collection('users').findOne({_id: assignment.recipientId});

    return {
        recipientName: recipient.name,
    };
}
