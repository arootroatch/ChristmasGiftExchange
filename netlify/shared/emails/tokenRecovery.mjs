import {layout} from './layout.mjs';
import {escapeHtml} from './escapeHtml.mjs';

export function render({name, token, wishlistEditUrl}) {
    return layout(`
    <tr>
        <td align="center" style="padding-top: 50px; padding-bottom: 30px; font-size: 36px; color: #69292a;">
            Hi ${escapeHtml(name)}!
        </td>
    </tr>
    <tr>
        <td align="center" style="font-size: 18px; padding: 0 50px 30px; color: #555;">
            You requested your Gift Exchange token. Here it is:
        </td>
    </tr>
    <tr>
        <td align="center" style="padding: 0 50px 30px;">
            <span style="display: inline-block; font-size: 16px; font-family: monospace; color: #198c0a; font-weight: bold; padding: 16px 24px;
                         background: #fff; border-radius: 10px; border: 2px solid #198c0a;
                         box-shadow: 0 2px 8px rgba(0,0,0,0.08); word-break: break-all;">
                ${escapeHtml(token)}
            </span>
        </td>
    </tr>
    <tr>
        <td align="center" style="font-size: 16px; padding: 0 50px 30px; color: #555;">
            Use this token to look up your gift exchange recipient on the website. Save it somewhere safe!
        </td>
    </tr>
    <tr>
        <td align="center" style="padding: 0 50px 30px;">
            <a href="${escapeHtml(wishlistEditUrl)}"
               style="display: inline-block; padding: 12px 28px; background-color: #198c0a;
                      color: white; text-decoration: none; border-radius: 6px; font-size: 15px; font-weight: bold;">
                Edit Your Wishlist
            </a>
        </td>
    </tr>`);
}
