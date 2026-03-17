# Email Template Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle all email templates with branded burgundy/green design, replace Venmo/PayPal with Buy Me a Coffee button.

**Architecture:** The shared `layout.mjs` wraps all non-error emails. Restyle layout first (header, body wrapper, footer with BMC), then update each template's inline styles to match the new color scheme.

**Tech Stack:** Vanilla JS email templates (inline CSS, table-based layout), Vitest tests.

**Spec:** `docs/superpowers/specs/2026-03-17-email-redesign-design.md`

---

## Chunk 1: Layout and Tests

### Task 1: Update layout tests

**Files:**
- Modify: `spec/netlify-functions/emails/layout.spec.js`

- [ ] **Step 1: Update the "includes footer with feedback and donate links" test**

Rename the test and replace Venmo/PayPal assertions with BMC and supporter CTA assertions:

```js
it('includes footer with BMC button and supporter CTA', () => {
    const html = layout('<tr><td>Content</td></tr>');

    expect(html).toContain('Happy gift giving!');
    expect(html).toContain('Alex at the Gift Exchange Generator');
    expect(html).toContain('buymeacoffee.com/arootroatch');
    expect(html).toContain('no account needed');
    expect(html).not.toContain('venmo.com');
    expect(html).not.toContain('paypal.me');
});
```

- [ ] **Step 2: Add test for branded header**

The header contains the gift emoji (`&#127873;`) followed by "Gift Exchange Generator". Assert that the header text appears before the content to confirm it's actually a header, not just the footer sign-off which also contains "Gift Exchange Generator":

```js
it('includes branded header before content', () => {
    const html = layout('<tr><td>Content</td></tr>');

    expect(html).toContain('&#127873; Gift Exchange Generator');
    const headerIndex = html.indexOf('&#127873; Gift Exchange Generator');
    const contentIndex = html.indexOf('Content');
    expect(headerIndex).toBeLessThan(contentIndex);
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run spec/netlify-functions/emails/layout.spec.js`
Expected: FAIL — layout doesn't have BMC link or branded header yet.

### Task 2: Restyle layout.mjs

**Files:**
- Modify: `netlify/shared/emails/layout.mjs`

- [ ] **Step 1: Replace the entire layout function**

Replace the contents of `layout.mjs` with:

```js
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
            <a href="https://buymeacoffee.com/arootroatch"
               style="display: inline-block; padding: 8px 20px; background-color: #fff; color: #69292a; border-radius: 6px; font-size: 13px; font-weight: bold; text-decoration: none;">
                &#9749; Buy me a coffee
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
```

Key changes from the old layout:
- Added burgundy header with gift emoji and site name, green bottom border
- Body content wrapped in a cream-to-white gradient area (with solid `#f9f5f0` fallback for Outlook)
- Content rows are now inside a nested table within the body area
- Footer: burgundy background with supporter CTA, BMC button, and sign-off
- Removed Venmo/PayPal paragraph and generic feedback paragraph

- [ ] **Step 2: Run tests to verify they pass**

Run: `npx vitest run spec/netlify-functions/emails/layout.spec.js`
Expected: All 4 tests PASS.

- [ ] **Step 3: Commit**

```bash
git add spec/netlify-functions/emails/layout.spec.js netlify/shared/emails/layout.mjs
git commit -m "feat: restyle email layout with branded header, footer, and BMC button"
```

### Task 3: Update secretSanta test for new green color

**Files:**
- Modify: `spec/netlify-functions/emails/secretSanta.spec.js:13-17`

- [ ] **Step 1: Update the "renders recipient name in green" test**

The current test checks for `rgb(1, 195, 1)`. The new design uses `#198c0a`. Update line 16:

```js
it('renders recipient name in green', () => {
    const html = render({name: 'Alex', recipient: 'Hunter'});
    expect(html).toContain('Hunter!');
    expect(html).toContain('#198c0a');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run spec/netlify-functions/emails/secretSanta.spec.js`
Expected: FAIL — secretSanta still uses `rgb(1, 195, 1)`.

### Task 4: Restyle secretSanta.mjs

**Files:**
- Modify: `netlify/shared/emails/secretSanta.mjs`

- [ ] **Step 1: Update the render function styles**

Replace **only the `render` function**. Keep the existing `import` statements and `getData` function unchanged.

```js
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
```

Changes from old version:
- Greeting color: `#69292a` (burgundy)
- Subtext color: `#555`
- Recipient name: `#198c0a` green, white card with green border and subtle shadow
- CTA buttons: `#198c0a` bg, white text, bold, 6px radius
- Fine print: `#999`, link color `#69292a`

- [ ] **Step 2: Run tests to verify they pass**

Run: `npx vitest run spec/netlify-functions/emails/secretSanta.spec.js`
Expected: All 9 tests PASS.

- [ ] **Step 3: Commit**

```bash
git add spec/netlify-functions/emails/secretSanta.spec.js netlify/shared/emails/secretSanta.mjs
git commit -m "feat: restyle secretSanta email with branded colors"
```

---

## Chunk 2: Remaining Templates

### Task 5: Restyle wishlistNotification.mjs

**Files:**
- Modify: `netlify/shared/emails/wishlistNotification.mjs`

No test changes needed — existing tests check content strings (`'Alex has added a wishlist'`, `'View Their Wishlist'`, URL, footer), not color values.

- [ ] **Step 1: Update the render function styles**

Replace **only the `render` function**. Keep the existing `import` statements and `getData` function unchanged.

```js
export function render({recipientName, wishlistViewUrl}) {
    return layout(`
    <tr>
        <td align="center" style="padding: 30px; font-size: 36px; color: #198c0a;">
            Wishlist Alert!
        </td>
    </tr>
    <tr>
        <td align="center" style="padding: 20px 50px; font-size: 18px; color: #333;">
            ${escapeHtml(recipientName)} has added a wishlist for you to check out!
        </td>
    </tr>
    <tr>
        <td align="center" style="padding: 20px 50px;">
            <a href="${escapeHtml(wishlistViewUrl)}"
               style="display: inline-block; padding: 12px 28px; background-color: #198c0a;
                      color: white; text-decoration: none; border-radius: 6px; font-size: 15px; font-weight: bold;">
                View Their Wishlist
            </a>
        </td>
    </tr>`);
}
```

Changes: heading color `#198c0a`, body text `#333`, button aligned to design tokens (bold, 6px radius, 15px).

- [ ] **Step 2: Run tests to verify they pass**

Run: `npx vitest run spec/netlify-functions/emails/wishlistNotification.spec.js`
Expected: All 6 tests PASS.

- [ ] **Step 3: Commit**

```bash
git add netlify/shared/emails/wishlistNotification.mjs
git commit -m "feat: restyle wishlistNotification email with branded colors"
```

### Task 6: Restyle wishlistLink.mjs

**Files:**
- Modify: `netlify/shared/emails/wishlistLink.mjs`

No test changes needed — tests check content strings and URL, not colors.

- [ ] **Step 1: Update the render function styles**

Replace **only the `render` function**. Keep the existing `import` statements and `getData` function unchanged.

```js
export function render({recipientName, wishlistViewUrl}) {
    return layout(`
    <tr>
        <td align="center" style="padding-top: 50px; padding-bottom: 20px; font-size: 24px; color: #333;">
            Here's the link to view ${escapeHtml(recipientName)}'s wish list
        </td>
    </tr>
    <tr>
        <td align="center" style="padding: 20px 50px;">
            <a href="${escapeHtml(wishlistViewUrl)}"
               style="display: inline-block; padding: 12px 28px; background-color: #198c0a;
                      color: white; text-decoration: none; border-radius: 6px; font-size: 15px; font-weight: bold;">
                View ${escapeHtml(recipientName)}'s Wish List
            </a>
        </td>
    </tr>`);
}
```

Changes: heading color `#333`, button aligned to design tokens.

- [ ] **Step 2: Run tests to verify they pass**

Run: `npx vitest run spec/netlify-functions/emails/wishlistLink.spec.js`
Expected: All 4 tests PASS.

- [ ] **Step 3: Commit**

```bash
git add netlify/shared/emails/wishlistLink.mjs
git commit -m "feat: restyle wishlistLink email with branded colors"
```

### Task 7: Restyle resultsSummary.mjs

**Files:**
- Modify: `netlify/shared/emails/resultsSummary.mjs`

No test changes needed — tests check content strings (`'Giver'`, `'Recipient'`, names, `'&#8594;'`, `'only copy'`, footer), not colors.

- [ ] **Step 1: Update the render function styles**

Replace **only the `render` function**. Keep the existing `import` statements and `getData` function unchanged.

```js
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
```

Changes: heading `#69292a`, table header bg `#f5f0eb`, borders `#e0d8cc`, header text `#69292a`, cell text `#333`, warning text `#69292a` bold.

- [ ] **Step 2: Run tests to verify they pass**

Run: `npx vitest run spec/netlify-functions/emails/resultsSummary.spec.js`
Expected: All 7 tests PASS.

- [ ] **Step 3: Commit**

```bash
git add netlify/shared/emails/resultsSummary.mjs
git commit -m "feat: restyle resultsSummary email with branded colors"
```

### Task 8: Restyle contactInfo.mjs

**Files:**
- Modify: `netlify/shared/emails/contactInfo.mjs`

No test changes needed — tests check content strings, not colors.

- [ ] **Step 1: Update the render function styles**

Replace **only the `render` function**. Keep the existing `import` statements and `getData` function unchanged.

```js
export function render({recipientName, address, phone, notes}) {
    return layout(`
    <tr>
        <td align="center" style="padding: 30px; font-size: 36px; color: #198c0a;">
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
                    <td style="padding: 8px; font-weight: bold; color: #69292a;">Shipping Address:</td>
                    <td style="padding: 8px; color: #333;">${escapeHtml(address)}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; font-weight: bold; color: #69292a;">Phone:</td>
                    <td style="padding: 8px; color: #333;">${escapeHtml(phone)}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; font-weight: bold; color: #69292a;">Notes:</td>
                    <td style="padding: 8px; color: #333;">${escapeHtml(notes)}</td>
                </tr>
            </table>
        </td>
    </tr>`);
}
```

Changes: heading `#198c0a`, body text `#333`, table labels `#69292a` bold, values `#333`.

- [ ] **Step 2: Run tests to verify they pass**

Run: `npx vitest run spec/netlify-functions/emails/contactInfo.spec.js`
Expected: All 4 tests PASS.

- [ ] **Step 3: Commit**

```bash
git add netlify/shared/emails/contactInfo.mjs
git commit -m "feat: restyle contactInfo email with branded colors"
```

### Task 9: Run full test suite

- [ ] **Step 1: Run all email template tests together**

Run: `npx vitest run spec/netlify-functions/emails/`
Expected: All tests PASS across all 7 spec files.

- [ ] **Step 2: Run full project test suite**

Run: `npx vitest run`
Expected: All tests PASS. No regressions.
