export function layout(contentRows) {
    return `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta charset="UTF-8"/>
    <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
    <title></title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; color: #333; background-color: #f9f5f0;">
<table role="presentation" style="width: 100%; border-collapse: collapse; border: 0; border-spacing: 0;">
    <tr>
        <td style="background-color: #69292a; padding: 24px; text-align: center; border-bottom: 3px solid #198c0a;">
            <span style="font-size: 28px; color: #f0f0f0; font-weight: bold;">&#127873; Gift Exchange Generator</span>
        </td>
    </tr>
    <tr>
        <td style="background-color: #f9f5f0; background: linear-gradient(180deg, #f9f5f0 0%, #fff 100%);">
            <table role="presentation" style="width: 100%; border-collapse: collapse; border: 0; border-spacing: 0;">
                ${contentRows}
            </table>
        </td>
    </tr>
    <tr>
        <td style="background-color: #69292a; padding: 24px; text-align: center;">
            <p style="font-size: 14px; color: rgba(240,240,240,0.7); margin: 0 0 16px 0;">
                Love the Gift Exchange Generator? Supporters help keep it running and get a say in what's built next &mdash; no account needed.
            </p>
            <a href="https://buymeacoffee.com/arootroatch" target="_blank" style="text-decoration: none;">
                <img src="https://img.buymeacoffee.com/button-api/?text=Buy me a coffee&emoji=☕&slug=arootroatch&button_colour=ffffff&font_colour=69292a&font_family=Arial&outline_colour=69292a&coffee_colour=FFDD00" alt="Buy Me A Coffee" style="height:60px;width:217px;"/>
            </a>
            <p style="font-size: 14px; color: rgba(240,240,240,0.8); margin: 20px 0 0 0;">
                Happy gift giving!
            </p>
            <p style="font-size: 14px; color: rgba(240,240,240,0.6); margin: 4px 0 0 0;">
                Alex at the Gift Exchange Generator
            </p>
        </td>
    </tr>
</table>
</body>
</html>`;
}
