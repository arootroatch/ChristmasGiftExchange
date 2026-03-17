import {layout} from './layout.mjs';
import {escapeHtml} from './escapeHtml.mjs';

export function render({recipientName, address, phone, notes}) {
    return layout(`
    <tr>
        <td align="center" style="padding: 30px; font-size: 36px; color: #2e7d32;">
            Contact Info Received!
        </td>
    </tr>
    <tr>
        <td align="center" style="padding: 20px 50px; font-size: 18px; color: #333;">
            ${escapeHtml(recipientName)} has shared their contact information with you:
        </td>
    </tr>
    <tr>
        <td style="padding: 10px 50px;">
            <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
                <tr>
                    <td style="padding: 8px; font-weight: bold; color: #555;">Shipping Address:</td>
                    <td style="padding: 8px; color: #333;">${escapeHtml(address)}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; font-weight: bold; color: #555;">Phone:</td>
                    <td style="padding: 8px; color: #333;">${escapeHtml(phone)}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; font-weight: bold; color: #555;">Notes:</td>
                    <td style="padding: 8px; color: #333;">${escapeHtml(notes)}</td>
                </tr>
            </table>
        </td>
    </tr>`);
}

export async function getData() {
    return {
        recipientName: 'Hunter',
        address: '123 Main St, Springfield, IL 62701',
        phone: '555-867-5309',
        notes: 'Leave packages at the front door. Dog is friendly!',
    };
}
