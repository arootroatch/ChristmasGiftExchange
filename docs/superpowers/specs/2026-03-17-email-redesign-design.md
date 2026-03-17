# Email Template Redesign

## Problem

The current email templates are visually plain (white background, minimal styling, no branding) and include outdated Venmo/PayPal donation links. They need to be refreshed with the site's burgundy/green brand identity, and the donation links replaced with a Buy Me a Coffee button that encourages supporters without requiring account creation.

## Design Decisions

- **Style direction**: Dark header/footer with light body (A3 from brainstorming)
- **Donation**: Replace Venmo + PayPal with Buy Me a Coffee link to `https://buymeacoffee.com/arootroatch`
- **Supporter CTA**: "Love the Gift Exchange Generator? Supporters help keep it running and get a say in what's built next — no account needed."
- **Sign-off**: Keep existing "Happy gift giving!" / "Alex at the Gift Exchange Generator"
- **errorAlert**: No changes (developer-only email with its own layout)

## Scope

### Files Modified

| File | Change |
|------|--------|
| `src/bmcButton.js` | New shared module exporting BMC URL and button label constants |
| `netlify/shared/emails/layout.mjs` | Complete restyle: branded header, light body wrapper, burgundy footer with BMC button |
| `netlify/shared/emails/secretSanta.mjs` | Update inline styles for new color scheme |
| `netlify/shared/emails/wishlistNotification.mjs` | Update inline styles for new color scheme |
| `netlify/shared/emails/wishlistLink.mjs` | Update inline styles for new color scheme |
| `netlify/shared/emails/resultsSummary.mjs` | Update inline styles for new color scheme |
| `netlify/shared/emails/contactInfo.mjs` | Update inline styles for new color scheme |
| `spec/netlify-functions/emails/layout.spec.js` | Update assertions: BMC link replaces Venmo/PayPal |

### Files Not Modified

| File | Reason |
|------|--------|
| `netlify/shared/emails/errorAlert.mjs` | Developer-only email, has its own HTML structure |
| `netlify/shared/emails/escapeHtml.mjs` | Utility, no visual changes |
| All other spec files | Template render tests check content, not styling; layout test covers shared footer |

## Buy Me a Coffee Button — Shared Constants

The BMC URL and label are used in both the email layout and the frontend site. To avoid duplication, a shared module exports the constants:

```js
// src/bmcButton.js
export const BMC_URL = 'https://buymeacoffee.com/arootroatch';
export const BMC_LABEL = 'Buy me a coffee';
```

- **Email layout** (`layout.mjs`): imports `BMC_URL` and `BMC_LABEL` to render the static HTML button
- **Frontend site**: imports the same constants to render the BMC button wherever needed on the site (frontend placement is out of scope for this spec but the constants are ready to use)

## Layout Structure

The shared `layout(contentRows)` function wraps all non-error emails. The new structure:

```
+--------------------------------------------------+
|  HEADER (burgundy #69292a bg)                    |
|  "Gift Exchange Generator" in white              |
|  Green (#198c0a) bottom border (3px)             |
+--------------------------------------------------+
|  BODY (cream #f9f5f0 → white gradient)           |
|  ${contentRows} — dark text for readability      |
|                                                  |
+--------------------------------------------------+
|  FOOTER (burgundy #69292a bg)                    |
|  Supporter CTA text (light text)                 |
|  [BMC button: white bg, burgundy text]           |
|  "Happy gift giving!"                            |
|  "Alex at the Gift Exchange Generator"           |
+--------------------------------------------------+
```

### Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| burgundy | `#69292a` | Header bg, footer bg, BMC button text |
| green | `#198c0a` | CTA buttons, header border, recipient name highlight |
| cream | `#f9f5f0` | Body background |
| white | `#ffffff` | Header text, BMC button bg, body gradient end |
| dark text | `#333` / `#555` | Body text (primary / secondary) |
| muted | `#999` | Fine print, helper text |

### Button Styles

**Action CTA** (wishlist, view links):
- Background: `#198c0a` (green)
- Text: white, bold, 15px
- Padding: 12px 28px
- Border-radius: 6px

**Buy Me a Coffee**:
- Background: `#ffffff`
- Text: `#69292a` (burgundy), bold, 13px
- Padding: 8px 20px
- Border-radius: 6px
- Content: "Buy me a coffee" (with coffee emoji)
- Links to: `https://buymeacoffee.com/arootroatch`

### Footer Content (exact copy)

```
Love the Gift Exchange Generator? Supporters help keep it running
and get a say in what's built next — no account needed.

[Buy me a coffee]

Happy gift giving!
Alex at the Gift Exchange Generator
```

## Per-Template Style Updates

### secretSanta.mjs

- Greeting text: `#69292a` (burgundy) instead of black
- "Your gift exchange recipient is..." subtext: `#555`
- Recipient name: `#198c0a` (green), bold, in a white card with green border and shadow (`0 2px 8px rgba(0,0,0,0.08)`)
- CTA buttons: green with white text (already close, just align to design tokens)
- Fine print ("Lost this email?"): `#999`

### wishlistNotification.mjs

- "Wishlist Alert!" heading: `#198c0a` (green), keep large size
- Body text: `#333`
- CTA button: green (already correct)

### wishlistLink.mjs

- Heading text: `#333`
- CTA button: green (already correct)

### resultsSummary.mjs

- Heading text: `#69292a` (burgundy)
- Table header row: light cream `#f5f0eb` background
- Table borders: `#e0d8cc` (warm gray, not cold `#ccc`)
- Cell text: `#333`
- Warning text ("This is the only copy..."): `#69292a`, bold

### contactInfo.mjs

- "Contact Info Received!" heading: `#198c0a` (green)
- Body text: `#333`
- Table label cells: `#69292a` (burgundy), bold
- Table value cells: `#333`

## Test Changes

### layout.spec.js

**Existing test "includes footer with feedback and donate links"**:
- Remove assertions for `venmo.com` and `paypal.me`
- Add assertion for `buymeacoffee.com/arootroatch`
- Add assertion for supporter CTA text ("no account needed")
- Update assertion for branded header ("Gift Exchange Generator")

## Email Client Compatibility

All styling uses inline CSS (no `<style>` blocks, no CSS classes). This is the standard approach for email HTML and works across Gmail, Outlook, Apple Mail, and other major clients.

Considerations:
- `background: linear-gradient(...)` may not render in Outlook — use a solid fallback `background-color: #f9f5f0` (cream) on the same element
- `border-radius` is ignored by Outlook but degrades gracefully
- `box-shadow` is ignored by Outlook but degrades gracefully
- Table-based layout is already in use and is the most compatible approach
