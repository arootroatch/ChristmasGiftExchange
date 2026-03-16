import {layout} from './layout.mjs';
import {wishlistEditPath, wishlistViewPath} from '../links.mjs';

export function render({name, recipient, wishlistEditUrl, wishlistViewUrl}) {
    const wishlistCta = wishlistEditUrl
        ? `<tr>
        <td align="center" style="padding: 30px 50px; font-size: 18px">
            <p style="color: #333;">
                Want to share your wishlist with your Secret Santa?
            </p>
            <a href="${wishlistEditUrl}"
               style="display: inline-block; padding: 12px 24px; background-color: #2e7d32;
                      color: white; text-decoration: none; border-radius: 4px; font-size: 16px;">
                Add Your Wishlist
            </a>
        </td>
    </tr>`
        : '';

    const wishlistViewCta = wishlistViewUrl
        ? `<tr>
        <td align="center" style="padding: 30px 50px; font-size: 18px">
            <p style="color: #333;">
                Need ideas for what to buy?
            </p>
            <a href="${wishlistViewUrl}"
               style="display: inline-block; padding: 12px 24px; background-color: #2e7d32;
                      color: white; text-decoration: none; border-radius: 4px; font-size: 16px;">
                View ${recipient}'s Wish List
            </a>
        </td>
    </tr>`
        : '';

    return layout(`
    <tr>
        <td align="center" style="padding-top: 50px; padding-bottom: 30px; font-size: 36px">
            Greetings, ${name}!
        </td>
    </tr>
    <tr>
        <td align="center" style="font-size: 36px; padding-bottom: 30px">
            Your gift exchange recipient is...
        </td>
    </tr>
    <tr>
        <td align="center" style="font-size: 36px; color: rgb(1, 195, 1)">
            ${recipient}!
        </td>
    </tr>
    ${wishlistCta}
    <tr>
        <td align="center" style="padding: 50px; font-size: 20px">
            If you lose this email, you can retrieve the name of your recipient at
            <a href="https://giftexchangegenerator.netlify.app/">the Gift Exchange Generator website.</a>
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
