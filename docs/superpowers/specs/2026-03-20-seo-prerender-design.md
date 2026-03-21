# SEO Pre-rendering & Build-Time HTML Generation

## Problem

The main page's first-screen content (instructions, recipient search, reuse link) is entirely JavaScript-rendered into empty `data-slot` divs. Crawlers that don't execute JS see no body content beyond the `<h1>`. Additionally, no Open Graph tags exist, so social sharing previews lack structured title/description/image metadata. Secondary pages are also missing favicons and the web manifest.

## Solution

A Vite plugin that acts as a mini static site generator — injecting first-screen templates, auto-generating OG tags from existing `<title>` and `<meta description>`, and injecting shared head elements (favicons, manifest). The JS components remain the single source of truth for templates; the existing HTML tags remain the source of truth for metadata.

## Design

### 1. Template Extraction

Create `src/exchange/firstScreenTemplates.js` exporting three pure template functions:

- `introTemplate()` — instructions text, step list, "Let's Go" and "Secret Santa Mode" buttons. Uses `introId` constant.
- `recipientSearchTemplate()` — the full `template()` output: outer `<div id="query" class="recipientSearch">` wrapping the label, email input, and "Search it!" button. Uses `recipientSearchId`, `recipientSearchBtnId`, and `queryDivId` constants.
- `reuseLinkTemplate()` — "Been here before?" label and link to `/reuse`

These functions return HTML strings with zero dependencies (no DOM, no imports from state.js or utils.js). All element ID constants used by the templates are defined in this file and exported.

**What moves to `firstScreenTemplates.js`:**
- `introId`, `introTemplate()` (from Instructions.js)
- `recipientSearchId`, `recipientSearchBtnId`, `queryDivId`, `recipientSearchInit` (the inner HTML fragment), `recipientSearchTemplate()` (the full wrapper — currently the unnamed `template()` in RecipientSearch.js)
- `reuseLinkTemplate()` (from ReuseLink.js)

**What stays in the component files:**
- `Instructions.js` — `attachButtonHandlers()`, `secretSantaMode()`, `render()`, `init()`, event wiring. Imports `introTemplate` and `introId` from templates module.
- `RecipientSearch.js` — `recipientSearchResult()` (depends on `escapeAttr` from utils.js, so cannot be zero-dependency), `renderResult()`, `renderError()`, `getName()`, `sendWishlistEmail()`, `init()`. Imports `recipientSearchInit`, `recipientSearchTemplate`, and ID constants from templates module. Also re-exports `recipientSearchInit` and `recipientSearchResult` (used by tests).
- `ReuseLink.js` — `init()`, event wiring. Imports `reuseLinkTemplate` from templates module.

**Note on `recipientSearchInput`:** This HTML fragment is used both in the initial template and in `recipientSearchResult()`. It is defined in `firstScreenTemplates.js` (zero-dependency, pure string) and imported by `RecipientSearch.js` for reuse in the result renderer.

### 2. Vite Build Plugin

Create `src/vitePrerenderPlugin.js` — a Vite plugin with three responsibilities, all running in the `transformIndexHtml` hook. Register it in `vite.config.js` alongside the existing `pageRoutesPlugin`. Both plugins use `transformIndexHtml` — Vite chains them in plugin order, so they compose correctly.

Runs in both dev and build, so behavior is consistent.

#### 2a. First-screen template injection (index.html only)

- Imports the three template functions from `firstScreenTemplates.js` at the top level (safe in Node — pure string functions)
- Replaces empty `data-slot` divs with pre-populated versions:

```
<div data-slot="instructions"></div>
  becomes
<div data-slot="instructions"><div id="intro">...</div></div>
```

Same for `recipient-search` and `reuse-link` slots. Only applies to `index.html` (detected via the `ctx` path argument).

**Component re-rendering:** Components still call `slot.innerHTML = template()` in `init()`. Since the pre-rendered HTML is identical to what the component produces, this is a no-op in effect. No "skip if present" logic needed.

#### 2b. Open Graph tag generation (all pages)

Auto-generates OG meta tags by reading existing HTML elements — no manual OG tags in any source file:

- `og:title` — parsed from `<title>` tag
- `og:description` — parsed from `<meta name="description">`
- `og:url` — derived from page path using a configured `BASE_URL` constant
- `og:image` — shared constant: `${BASE_URL}/Gift-Giving-Banner.webp`
- `og:type` — shared constant: `website`

The generated tags are injected just before `</head>`. The base URL and OG image path are constants defined at the top of the plugin file.

**URL derivation logic:**
- `index.html` → `/`
- `pages/wishlist/view/index.html` → `/wishlist/view`
- `pages/wishlist/edit/index.html` → `/wishlist/edit`
- `pages/reuse/index.html` → `/reuse`

Pattern: strip `pages/` prefix and `/index.html` suffix. Root `index.html` maps to `/`.

#### 2c. Shared head elements (all pages)

Injects favicon and manifest links into `<head>` for all pages that don't already have them:

```html
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="manifest" href="/site.webmanifest">
```

Detection: check if the HTML already contains `apple-touch-icon`. If present, skip injection (avoids duplicates on `index.html`). If absent, inject after `<meta charset>`.

**Source HTML cleanup:** After the plugin handles favicon/manifest injection, remove the hardcoded favicon/manifest links from `index.html` so all pages get them from the same source (the plugin). This makes the plugin the single source of truth for shared head elements.

## Files

### New
- `src/exchange/firstScreenTemplates.js` — shared template functions (source of truth)
- `src/vitePrerenderPlugin.js` — Vite plugin: template injection, OG generation, shared head elements
- `spec/exchange/firstScreenTemplates.spec.js` — tests for template output (HTML structure, expected IDs/classes)
- `spec/vitePrerenderPlugin.spec.js` — tests for all three plugin responsibilities

### Modified
- `src/exchange/components/Instructions.js` — import `introTemplate` and `introId` from templates module
- `src/exchange/components/RecipientSearch.js` — import template content and ID constants from templates module
- `src/exchange/components/ReuseLink.js` — import `reuseLinkTemplate` from templates module
- `vite.config.js` — register prerender plugin
- `index.html` — remove hardcoded favicon/manifest links (plugin now injects them)

### Unchanged
- `pages/wishlist/view/index.html` — no changes (OG tags and favicons injected by plugin)
- `pages/wishlist/edit/index.html` — no changes (OG tags and favicons injected by plugin)
- `pages/reuse/index.html` — no changes (OG tags and favicons injected by plugin)
- Existing test files — templates produce identical output, components behave identically

## Verification

1. `npx vite build` succeeds
2. `npx vitest run` — all tests pass (including new template and plugin specs)
3. `dist/index.html` contains pre-rendered first-screen content (not empty slots)
4. All four built HTML files contain OG meta tags (derived from their `<title>` and `<meta description>`)
5. All four built HTML files contain favicon and manifest links
6. Dev server (`npx vite`) shows the same content
7. View page source in browser confirms content is in raw HTML
8. OG tags validated (e.g., via Facebook Sharing Debugger or manual inspection after deploy)
