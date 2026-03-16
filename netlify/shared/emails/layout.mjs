export function layout(contentRows) {
    return `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta charset="UTF-8"/>
    <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
    <title></title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; color: #000; background-color: #fff;">
<table role="presentation" style="width: 100%; border-collapse: collapse; border: 0; border-spacing: 0; padding: 20px;">
    ${contentRows}
    <tr>
        <td align="center" style="padding: 0px 50px; font-size: 16px">
            This site is developed in my spare time and thrives on user feedback
            to be the best it can be. If you have thoughts on how the site could
            be improved, it would mean the world to me if you responded to this
            email with your feedback.
        </td>
    </tr>
    <tr>
        <td align="center" style="padding: 10px 50px; font-size: 16px">
            The site does cost money to operate. If you enjoyed using the Gift Exchange Generator, please consider
            donating to keep it going! I accept <a href="https://venmo.com/u/Alex-Root-Roatch">Venmo</a> and <a
                href="https://paypal.me/arootroatch?country.x=US&locale.x=en_US">PayPal</a>.
        </td>
    </tr>
    <tr>
        <td align="left" style="padding: 50px; font-size: 20px">
            Happy gift giving!
        </td>
    </tr>
    <tr>
        <td align="left" style="padding-left: 50px; padding-top: 0; font-size: 20px">
            Alex at the Gift Exchange Generator
        </td>
    </tr>
</table>
</body>
</html>`;
}
