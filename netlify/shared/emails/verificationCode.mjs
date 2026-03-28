import {layout} from './layout.mjs';
import {escapeHtml} from './escapeHtml.mjs';

export async function getData() {
    return {code: '483291'};
}

export function render({code}) {
    return layout(`
    <tr>
        <td align="center" style="padding-top: 50px; padding-bottom: 30px; font-size: 36px; color: #69292a;">
            Your Verification Code
        </td>
    </tr>
    <tr>
        <td align="center" style="padding: 0 50px 20px;">
            <span style="display: inline-block; font-size: 36px; font-family: monospace; letter-spacing: 8px; color: #198c0a; font-weight: bold; padding: 20px 32px;
                         background: #fff; border-radius: 10px; border: 2px solid #198c0a;
                         box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                ${escapeHtml(code)}
            </span>
        </td>
    </tr>
    <tr>
        <td align="center" style="font-size: 16px; padding: 0 50px 30px; color: #555;">
            Enter this code on the Gift Exchange Generator website to continue. This code expires in 10 minutes.
        </td>
    </tr>`);
}
