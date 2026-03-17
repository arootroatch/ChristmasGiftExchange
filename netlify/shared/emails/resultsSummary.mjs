import {layout} from './layout.mjs';
import {escapeHtml} from './escapeHtml.mjs';

export function render({name, assignments}) {
    const rows = assignments.map(a => `
                <tr>
                    <td style="padding: 10px 16px; border-bottom: 1px solid #e0d8cc; font-size: 16px; color: #333;">${escapeHtml(a.giver)}</td>
                    <td style="padding: 10px 8px; text-align: center; border-bottom: 1px solid #e0d8cc; font-size: 16px; color: #333;">&#8594;</td>
                    <td style="padding: 10px 16px; border-bottom: 1px solid #e0d8cc; font-size: 16px; color: #333;">${escapeHtml(a.recipient)}</td>
                </tr>`).join('');

    return layout(`
    <tr>
        <td align="center" style="padding-top: 50px; padding-bottom: 30px; font-size: 36px; color: #69292a;">
            Hi ${escapeHtml(name)}, here are your gift exchange results:
        </td>
    </tr>
    <tr>
        <td align="center" style="padding: 0 50px 30px">
            <table role="presentation" style="border-collapse: collapse; border: 1px solid #e0d8cc; width: 100%; max-width: 500px;">
                <tr style="background-color: #f5f0eb;">
                    <th style="padding: 12px 16px; text-align: left; border-bottom: 2px solid #e0d8cc; font-size: 18px; color: #69292a;">Giver</th>
                    <th style="padding: 12px 8px; text-align: center; border-bottom: 2px solid #e0d8cc; font-size: 18px;"></th>
                    <th style="padding: 12px 16px; text-align: left; border-bottom: 2px solid #e0d8cc; font-size: 18px; color: #69292a;">Recipient</th>
                </tr>
                ${rows}
            </table>
        </td>
    </tr>
    <tr>
        <td align="center" style="padding: 30px 50px; font-size: 16px; color: #69292a; font-weight: bold;">
            This is the only copy of your results. Please save this email or take a screenshot!
        </td>
    </tr>`);
}

export async function getData(db) {
    const exchange = await db.collection('exchanges').findOne();
    const usersCol = db.collection('users');

    const assignments = await Promise.all(
        exchange.assignments.map(async ({giverId, recipientId}) => {
            const giver = await usersCol.findOne({_id: giverId});
            const recipient = await usersCol.findOne({_id: recipientId});
            return {giver: giver.name, recipient: recipient.name};
        })
    );

    const firstParticipant = await usersCol.findOne({_id: exchange.participants[0]});

    return {name: firstParticipant.name, assignments};
}
