import {layout} from './layout.mjs';
import {wishlistEditPath, wishlistViewPath} from '../links.mjs';
import {escapeHtml} from './escapeHtml.mjs';

export function render({name, recipient, wishlistEditUrl, wishlistViewUrl}) {
    const viewColumn = `<td align="center" style="padding: 16px; font-size: 16px;" width="50%">
            <p style="color: #555; margin: 0 0 12px 0;">
                Need ideas for what to buy?
            </p>
            <a href="${escapeHtml(wishlistViewUrl)}"
               style="display: inline-block; padding: 12px 28px; background-color: #198c0a;
                      color: white; text-decoration: none; border-radius: 6px; font-size: 15px; font-weight: bold;">
                View ${escapeHtml(recipient)}'s Wish List
            </a>
        </td>`;

    const editColumn = `<td align="center" style="padding: 16px; font-size: 16px;" width="50%">
            <p style="color: #555; margin: 0 0 12px 0;">
                Want to share your wishlist?
            </p>
            <a href="${escapeHtml(wishlistEditUrl)}"
               style="display: inline-block; padding: 12px 28px; background-color: #198c0a;
                      color: white; text-decoration: none; border-radius: 6px; font-size: 15px; font-weight: bold;">
                Add Your Wishlist
            </a>
        </td>`;

    let wishlistCtas = '';
    if (wishlistViewUrl && wishlistEditUrl) {
        wishlistCtas = `<tr>
        <td style="padding: 20px 30px;">
            <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                    ${viewColumn}
                    ${editColumn}
                </tr>
            </table>
        </td>
    </tr>`;
    } else if (wishlistViewUrl) {
        wishlistCtas = `<tr>
        <td style="padding: 20px 30px;">
            <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>${viewColumn}</tr>
            </table>
        </td>
    </tr>`;
    } else if (wishlistEditUrl) {
        wishlistCtas = `<tr>
        <td style="padding: 20px 30px;">
            <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>${editColumn}</tr>
            </table>
        </td>
    </tr>`;
    }

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
    ${wishlistCtas}
    <tr>
        <td align="center" style="padding: 30px 50px; font-size: 16px; color: #999;">
            If you lose this email, you can retrieve the name of your recipient at
            <a href="https://giftexchangegenerator.netlify.app/" style="color: #69292a;">the Gift Exchange Generator website.</a>
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
        wishlistEditUrl: wishlistEditPath(giver.token),
        wishlistViewUrl: wishlistViewPath(giver.token, exchange.exchangeId),
    };
}
