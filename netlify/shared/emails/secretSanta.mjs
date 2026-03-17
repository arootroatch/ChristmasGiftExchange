import {layout} from './layout.mjs';
import {wishlistEditPath, wishlistViewPath} from '../links.mjs';
import {escapeHtml} from './escapeHtml.mjs';

export function render({name, recipient, wishlistEditUrl, wishlistViewUrl}) {
    const wishlistCta = wishlistEditUrl
        ? `<tr>
        <td align="center" style="padding: 30px 50px; font-size: 18px">
            <p style="color: #555;">
                Want to share your wishlist with your Secret Santa?
            </p>
            <a href="${escapeHtml(wishlistEditUrl)}"
               style="display: inline-block; padding: 12px 28px; background-color: #198c0a;
                      color: white; text-decoration: none; border-radius: 6px; font-size: 15px; font-weight: bold;">
                Add Your Wishlist
            </a>
        </td>
    </tr>`
        : '';

    const wishlistViewCta = wishlistViewUrl
        ? `<tr>
        <td align="center" style="padding: 30px 50px; font-size: 18px">
            <p style="color: #555;">
                Need ideas for what to buy?
            </p>
            <a href="${escapeHtml(wishlistViewUrl)}"
               style="display: inline-block; padding: 12px 28px; background-color: #198c0a;
                      color: white; text-decoration: none; border-radius: 6px; font-size: 15px; font-weight: bold;">
                View ${escapeHtml(recipient)}'s Wish List
            </a>
        </td>
    </tr>`
        : '';

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
    ${wishlistCta}
    <tr>
        <td align="center" style="padding: 30px 50px; font-size: 16px; color: #999;">
            If you lose this email, you can retrieve the name of your recipient at
            <a href="https://giftexchangegenerator.netlify.app/" style="color: #69292a;">the Gift Exchange Generator website.</a>
        </td>
    </tr>
    ${wishlistViewCta}`);
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
