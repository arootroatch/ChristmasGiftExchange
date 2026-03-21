# SEO Pre-rendering & Open Graph Tags

## Problem

The main page's first-screen content (instructions, recipient search, reuse link) is entirely JavaScript-rendered into empty `data-slot` divs. Crawlers that don't execute JS see no body content beyond the `<h1>`. Additionally, no Open Graph tags exist, so social sharing previews lack structured title/description/image metadata.

## Solution

Pre-generate the first screen's HTML at build time using a Vite plugin, keeping the JS components as the single source of truth. Add OG meta tags to all pages.

## Design

### 1. Template Extraction

Create `src/exchange/firstScreenTemplates.js` exporting three pure template functions:

- `introTemplate()` — instructions text, step list, "Let's Go" and "Secret Santa Mode" buttons
- `recipientSearchTemplate()` — label, email input, "Search it!" button (wraps existing `recipientSearchInit` content)
- `reuseLinkTemplate()` — "Been here before?" label and link to `/reuse`

These functions return HTML strings with zero dependencies (no DOM, no imports from state.js or utils.js). String constants used in templates (element IDs like `introId`, `recipientSearchId`, etc.) are defined in this file and re-exported so components can import them.

Each component (`Instructions.js`, `RecipientSearch.js`, `ReuseLink.js`) imports its template from this module instead of defining it inline.

### 2. Vite Prerender Plugin

Create `src/vitePrerenderPlugin.js`:

- Exports a Vite plugin using the `transformIndexHtml` hook
- Imports the three template functions from `firstScreenTemplates.js` at the top level (safe in Node — pure string functions)
- Replaces empty `data-slot` divs in `index.html` with pre-populated versions:

```
<div data-slot="instructions"></div>
  becomes
<div data-slot="instructions"><div id="intro">...</div></div>
```

- Only transforms `index.html` (not secondary pages)
- Runs in both dev and build, so behavior is consistent

Register the plugin in `vite.config.js` alongside the existing `pageRoutesPlugin`.

**Component re-rendering:** Components still call `slot.innerHTML = template()` in `init()`. Since the pre-rendered HTML is identical to what the component produces, this is a no-op in effect. No "skip if present" logic needed.

### 3. Open Graph Meta Tags

Add OG tags to all four HTML files in `<head>`:

**`index.html`:**
```html
<meta property="og:title" content="Gift Exchange Generator">
<meta property="og:description" content="Digitally draw names at random for a gift exchange or Secret Santa and email the results.">
<meta property="og:image" content="https://gift-exchange-generator.com/Gift-Giving-Banner.webp">
<meta property="og:type" content="website">
<meta property="og:url" content="https://gift-exchange-generator.com/">
```

**`pages/wishlist/view/index.html`:**
```html
<meta property="og:title" content="Wishlist">
<meta property="og:description" content="View your gift exchange recipient's wishlist.">
<meta property="og:image" content="https://gift-exchange-generator.com/Gift-Giving-Banner.webp">
<meta property="og:type" content="website">
<meta property="og:url" content="https://gift-exchange-generator.com/wishlist/view">
```

**`pages/wishlist/edit/index.html`:**
```html
<meta property="og:title" content="Add Your Wishlist">
<meta property="og:description" content="Add wishlists and items for your gift exchange.">
<meta property="og:image" content="https://gift-exchange-generator.com/Gift-Giving-Banner.webp">
<meta property="og:type" content="website">
<meta property="og:url" content="https://gift-exchange-generator.com/wishlist/edit">
```

**`pages/reuse/index.html`:**
```html
<meta property="og:title" content="Reuse a Previous Exchange">
<meta property="og:description" content="Reuse a previous gift exchange to draw new names.">
<meta property="og:image" content="https://gift-exchange-generator.com/Gift-Giving-Banner.webp">
<meta property="og:type" content="website">
<meta property="og:url" content="https://gift-exchange-generator.com/reuse">
```

All pages share the banner image. OG title and description match each page's existing `<title>` and `<meta name="description">`.

## Files

### New
- `src/exchange/firstScreenTemplates.js` — shared template functions (source of truth)
- `src/vitePrerenderPlugin.js` — Vite plugin to inject templates into HTML

### Modified
- `src/exchange/components/Instructions.js` — import `introTemplate` and `introId` from templates module
- `src/exchange/components/RecipientSearch.js` — import template content and ID constants from templates module
- `src/exchange/components/ReuseLink.js` — import `reuseLinkTemplate` from templates module
- `vite.config.js` — register prerender plugin
- `index.html` — add OG tags
- `pages/wishlist/view/index.html` — add OG tags
- `pages/wishlist/edit/index.html` — add OG tags
- `pages/reuse/index.html` — add OG tags

### Unchanged
- All test files — templates produce identical output, components behave identically

## Verification

1. `npx vite build` succeeds
2. `npx vitest run` — all tests pass
3. `dist/index.html` contains pre-rendered first-screen content (not empty slots)
4. Dev server (`npx vite`) shows the same content
5. View page source in browser confirms content is in raw HTML
