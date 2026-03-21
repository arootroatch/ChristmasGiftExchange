# SEO Pre-rendering & Build-Time HTML Generation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pre-generate first-screen HTML at build time and auto-inject OG tags + favicons into all pages, keeping JS components as the single source of truth.

**Architecture:** A shared templates module (`firstScreenTemplates.js`) exports pure string functions. A Vite plugin (`vitePrerenderPlugin.js`) uses `transformIndexHtml` to inject those templates into `index.html` slots, auto-generate OG tags from existing `<title>`/`<meta description>`, and inject shared favicon/manifest links. Components import from the templates module instead of defining templates inline.

**Tech Stack:** Vite (plugin API, `transformIndexHtml` hook), Vitest

**Spec:** `docs/superpowers/specs/2026-03-20-seo-prerender-design.md`

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `src/exchange/firstScreenTemplates.js` | Pure template functions + ID constants (zero dependencies) |
| `src/vitePrerenderPlugin.js` | Vite plugin: slot injection, OG generation, favicon injection |
| `spec/exchange/firstScreenTemplates.spec.js` | Template output tests |
| `spec/vitePrerenderPlugin.spec.js` | Plugin transformation tests |

### Modified Files
| File | Change |
|------|--------|
| `src/exchange/components/Instructions.js` | Import `introTemplate`, `introId` from templates module |
| `src/exchange/components/RecipientSearch.js` | Import template + ID constants from templates module |
| `src/exchange/components/ReuseLink.js` | Import `reuseLinkTemplate` from templates module |
| `vite.config.js` | Register `prerenderPlugin` |
| `vitest.config.ts` | Add `spec/vitePrerenderPlugin.spec.js` to frontend includes |
| `index.html` | Remove hardcoded favicon/manifest links (plugin injects them) |

---

## Task 1: Create firstScreenTemplates module

Extract template functions from the three components into a shared, zero-dependency module.

**Files:**
- Create: `src/exchange/firstScreenTemplates.js`
- Create: `spec/exchange/firstScreenTemplates.spec.js`

- [ ] **Step 1: Write failing tests for introTemplate**

```js
// spec/exchange/firstScreenTemplates.spec.js
import {describe, it, expect} from "vitest";
import {introTemplate, introId} from "../../src/exchange/firstScreenTemplates";

describe("firstScreenTemplates", () => {
  describe("introTemplate", () => {
    it("returns HTML with the intro id", () => {
      expect(introTemplate()).toContain(`id="${introId}"`);
    });

    it("contains the instructions text", () => {
      expect(introTemplate()).toContain("Drawing names for a gift exchange");
    });

    it("contains Let's go button", () => {
      expect(introTemplate()).toContain('id="letsGo"');
    });

    it("contains Secret Santa button", () => {
      expect(introTemplate()).toContain('id="secretSantaBtn"');
    });

    it("contains the ordered list of steps", () => {
      const html = introTemplate();
      expect(html).toContain("Add all participant names");
      expect(html).toContain("Generate the list");
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run spec/exchange/firstScreenTemplates.spec.js`
Expected: FAIL — module does not exist

- [ ] **Step 3: Implement introTemplate**

```js
// src/exchange/firstScreenTemplates.js
export const introId = "intro";

export function introTemplate() {
  return `<div id="${introId}">
    <p>
      Drawing names for a gift exchange or Secret Santa? Here's a
      web app to make it easier! <br><br>
      Simply:
    </p>
    <ol>
      <li>Add all participant names</li>
      <li>Separate people who live together into Houses (optional)</li>
      <li>Generate the list</li>
      <li>Send everyone an email with the name of their recipient (optional)</li>
    </ol>
    <p>
      To keep the results a secret, click
      "Secret Santa Mode" instead.
    </p>
    <p>
      This site will always be free to use and your information will never be shared.
    </p>
    <div id="get-started">
      <p>Ready to get started?</p>
      <button class="button" id="letsGo" style="margin-bottom: 0;">Let's go!</button>
      <button class="btn-bottom" id="secretSantaBtn">Secret Santa Mode</button>
    </div>
  </div>`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run spec/exchange/firstScreenTemplates.spec.js`
Expected: PASS

- [ ] **Step 5: Write failing tests for recipientSearchTemplate**

Add to the same spec file:

```js
import {
  recipientSearchTemplate,
  recipientSearchInput,
  recipientSearchInit,
  recipientSearchId,
  recipientSearchBtnId,
  queryDivId,
} from "../../src/exchange/firstScreenTemplates";

describe("recipientSearchTemplate", () => {
  it("wraps content in a div with queryDivId and recipientSearch class", () => {
    const html = recipientSearchTemplate();
    expect(html).toContain(`id="${queryDivId}"`);
    expect(html).toContain('class="recipientSearch"');
  });

  it("contains the search label", () => {
    expect(recipientSearchTemplate()).toContain("Need to know who you're buying a gift for?");
  });

  it("contains an email input with recipientSearchId", () => {
    expect(recipientSearchTemplate()).toContain(`id="${recipientSearchId}"`);
  });

  it("contains a search button with recipientSearchBtnId", () => {
    expect(recipientSearchTemplate()).toContain(`id="${recipientSearchBtnId}"`);
  });
});

describe("recipientSearchInput", () => {
  it("contains the email input and search button but not the label", () => {
    expect(recipientSearchInput).toContain(`id="${recipientSearchId}"`);
    expect(recipientSearchInput).toContain(`id="${recipientSearchBtnId}"`);
    expect(recipientSearchInput).not.toContain("Need to know");
  });
});
```

- [ ] **Step 6: Run tests to verify they fail**

Run: `npx vitest run spec/exchange/firstScreenTemplates.spec.js`
Expected: FAIL — exports not found

- [ ] **Step 7: Implement recipientSearch templates**

Add to `src/exchange/firstScreenTemplates.js`:

```js
export const recipientSearchId = "recipientSearch";
export const recipientSearchBtnId = "recipientSearchBtn";
export const queryDivId = "query";

export const recipientSearchInput =
  `<div>
        <input
            type="email"
            maxlength="100"
            id="${recipientSearchId}"
            placeholder="you@example.com"
        />
        <button
            type="submit"
            class="button queryBtn"
            id="${recipientSearchBtnId}"
        >
        Search it!
        </button>
    </div>`;

export const recipientSearchInit =
  `<label for="${recipientSearchId}">
        Need to know who you're buying a gift for?
    </label>
    ${recipientSearchInput}`;

export function recipientSearchTemplate() {
  return `<div id="${queryDivId}" class="recipientSearch">${recipientSearchInit}</div>`;
}
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `npx vitest run spec/exchange/firstScreenTemplates.spec.js`
Expected: PASS

- [ ] **Step 9: Write failing tests for reuseLinkTemplate**

Add to the same spec file:

```js
import {reuseLinkTemplate} from "../../src/exchange/firstScreenTemplates";

describe("reuseLinkTemplate", () => {
  it("contains the 'Been here before?' label", () => {
    expect(reuseLinkTemplate()).toContain("Been here before?");
  });

  it("contains a link to /reuse", () => {
    expect(reuseLinkTemplate()).toContain('href="/reuse"');
  });

  it("wraps content in a div with reuseLink class", () => {
    expect(reuseLinkTemplate()).toContain('class="reuseLink"');
  });
});
```

- [ ] **Step 10: Run tests to verify they fail**

Run: `npx vitest run spec/exchange/firstScreenTemplates.spec.js`
Expected: FAIL — `reuseLinkTemplate` not exported

- [ ] **Step 11: Implement reuseLinkTemplate**

Add to `src/exchange/firstScreenTemplates.js`:

```js
export function reuseLinkTemplate() {
  return `<div class="reuseLink">
        <label>Been here before?</label>
        <div>
            <a href="/reuse" class="button" style="text-decoration: none; width: auto;">Reuse a Previous Exchange</a>
        </div>
    </div>`;
}
```

- [ ] **Step 12: Run tests to verify they pass**

Run: `npx vitest run spec/exchange/firstScreenTemplates.spec.js`
Expected: PASS

- [ ] **Step 13: Commit**

```bash
git add src/exchange/firstScreenTemplates.js spec/exchange/firstScreenTemplates.spec.js
git commit -m "feat: extract first-screen templates to shared module"
```

---

## Task 2: Update components to import from firstScreenTemplates

Rewire the three components to import templates from the shared module. Existing component tests must continue to pass unchanged.

**Files:**
- Modify: `src/exchange/components/Instructions.js`
- Modify: `src/exchange/components/RecipientSearch.js`
- Modify: `src/exchange/components/ReuseLink.js`

- [ ] **Step 1: Update Instructions.js**

Replace the `introId` const and `introTemplate()` function with an import. Keep everything else.

Before (lines 1-32):
```js
import {ExchangeEvents as Events, exchangeEvents as stateEvents, startExchange} from "../state.js";
import {leftContainerId, selectElement} from "../../utils.js";

const introId = "intro";

function introTemplate() {
  return `<div id="${introId}">
    ...
  </div>`;
}
```

After:
```js
import {ExchangeEvents as Events, exchangeEvents as stateEvents, startExchange} from "../state.js";
import {leftContainerId, selectElement} from "../../utils.js";
import {introTemplate, introId} from "../firstScreenTemplates.js";
```

Remove `const introId = "intro";` and the entire `introTemplate()` function (lines 4-32).

- [ ] **Step 2: Run Instructions tests to verify they pass**

Run: `npx vitest run spec/exchange/components/Instructions.spec.js`
Expected: PASS — no behavior change

- [ ] **Step 3: Update RecipientSearch.js**

Replace the local constants, `recipientSearchInput`, `recipientSearchInit`, and `template()` with imports.

Before (lines 1-7, 9-30, 111-113):
```js
import {addEventListener, removeEventListener, selectElement, setLoadingState, escapeAttr, apiFetch} from "../../utils";
import {ExchangeEvents as Events, exchangeEvents as stateEvents} from "../state.js";

const recipientSearchId = "recipientSearch";
const recipientSearchBtnId = "recipientSearchBtn";
const queryDivId = "query";
const wishlistEmailBtnId = "wishlistEmailBtn";

export const recipientSearchInput = `...`;
export const recipientSearchInit = `...`;
...
function template() {
  return `<div id="${queryDivId}" class="recipientSearch">${recipientSearchInit}</div>`;
}
```

After:
```js
import {addEventListener, removeEventListener, selectElement, setLoadingState, escapeAttr, apiFetch} from "../../utils";
import {ExchangeEvents as Events, exchangeEvents as stateEvents} from "../state.js";
import {
  recipientSearchId,
  recipientSearchBtnId,
  queryDivId,
  recipientSearchInput,
  recipientSearchInit,
  recipientSearchTemplate,
} from "../firstScreenTemplates.js";

const wishlistEmailBtnId = "wishlistEmailBtn";
```

- Remove the four `const` declarations (lines 4-7)
- Remove `export const recipientSearchInput = ...` (lines 9-24)
- Remove `export const recipientSearchInit = ...` (lines 26-30)
- Remove `function template() { ... }` (lines 111-113)
- No re-exports needed — nothing imports `recipientSearchInput`/`recipientSearchInit` from RecipientSearch.js
- In `init()`, change `template()` to `recipientSearchTemplate()`:
  ```js
  export function init() {
    selectElement('[data-slot="recipient-search"]').innerHTML = recipientSearchTemplate();
    addEventListener(`#${recipientSearchBtnId}`, "click", getName);
    ...
  }
  ```

- [ ] **Step 4: Run RecipientSearch tests to verify they pass**

Run: `npx vitest run spec/exchange/components/RecipientSearch.spec.js`
Expected: PASS — no behavior change

- [ ] **Step 5: Update ReuseLink.js**

Before:
```js
import {selectElement} from "../../utils";
import {ExchangeEvents as Events, exchangeEvents as stateEvents} from "../state.js";

function template() {
    return `<div class="reuseLink">
        ...
    </div>`;
}

export function init() {
    selectElement('[data-slot="reuse-link"]').innerHTML = template();
    ...
}
```

After:
```js
import {selectElement} from "../../utils";
import {ExchangeEvents as Events, exchangeEvents as stateEvents} from "../state.js";
import {reuseLinkTemplate} from "../firstScreenTemplates.js";

export function init() {
    selectElement('[data-slot="reuse-link"]').innerHTML = reuseLinkTemplate();
    stateEvents.on(Events.EXCHANGE_STARTED, () => {
        selectElement('[data-slot="reuse-link"]').innerHTML = "";
    });
}
```

- [ ] **Step 6: Run full test suite to verify nothing broke**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 7: Commit**

```bash
git add src/exchange/components/Instructions.js src/exchange/components/RecipientSearch.js src/exchange/components/ReuseLink.js
git commit -m "refactor: components import templates from shared module"
```

---

## Task 3: Create Vite prerender plugin

Build the plugin with all three responsibilities: slot injection, OG generation, favicon injection.

**Files:**
- Create: `src/vitePrerenderPlugin.js`
- Create: `spec/vitePrerenderPlugin.spec.js`
- Modify: `vitest.config.ts` — add `spec/vitePrerenderPlugin.spec.js` to frontend includes

- [ ] **Step 1: Add spec file to vitest config**

In `vitest.config.ts`, add `'spec/vitePrerenderPlugin.spec.js'` to the frontend project's `include` array (after `'spec/vitePageRoutes.spec.js'`):

```ts
include: [
  'spec/exchange/**/*.spec.js',
  'spec/CookieBanner.spec.js',
  'spec/Snackbar.spec.js',
  'spec/utils.spec.js',
  'spec/vitePageRoutes.spec.js',
  'spec/vitePrerenderPlugin.spec.js',
],
```

- [ ] **Step 2: Write failing tests for slot injection**

```js
// spec/vitePrerenderPlugin.spec.js
import {describe, it, expect, beforeEach} from "vitest";
import {prerenderPlugin} from "../src/vitePrerenderPlugin.js";

describe("prerenderPlugin", () => {
  let plugin;

  beforeEach(() => {
    plugin = prerenderPlugin();
  });

  describe("slot injection", () => {
    const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Gift Exchange Generator</title>
    <meta name="description" content="Draw names for a gift exchange.">
</head>
<body>
    <div data-slot="instructions"></div>
    <div data-slot="recipient-search"></div>
    <div data-slot="reuse-link"></div>
</body>
</html>`;

    it("injects introTemplate into instructions slot on index.html", () => {
      const result = plugin.transformIndexHtml(indexHtml, {path: "/index.html"});
      expect(result).toContain('data-slot="instructions"><div id="intro">');
      expect(result).toContain("Drawing names for a gift exchange");
    });

    it("injects recipientSearchTemplate into recipient-search slot", () => {
      const result = plugin.transformIndexHtml(indexHtml, {path: "/index.html"});
      expect(result).toContain('data-slot="recipient-search"><div id="query"');
    });

    it("injects reuseLinkTemplate into reuse-link slot", () => {
      const result = plugin.transformIndexHtml(indexHtml, {path: "/index.html"});
      expect(result).toContain('data-slot="reuse-link"><div class="reuseLink"');
    });

    it("does not inject templates into non-index pages", () => {
      const pageHtml = `<html><head><meta charset="UTF-8"><title>Other</title><meta name="description" content="Other page."></head><body></body></html>`;
      const result = plugin.transformIndexHtml(pageHtml, {path: "/pages/reuse/index.html"});
      expect(result).not.toContain("Drawing names");
      expect(result).not.toContain('id="intro"');
    });
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run spec/vitePrerenderPlugin.spec.js`
Expected: FAIL — module does not exist

- [ ] **Step 4: Implement slot injection**

```js
// src/vitePrerenderPlugin.js
import {introTemplate, recipientSearchTemplate, reuseLinkTemplate} from "./exchange/firstScreenTemplates.js";

const BASE_URL = "https://gift-exchange-generator.com";
const OG_IMAGE = `${BASE_URL}/Gift-Giving-Banner.webp`;

const FAVICON_LINKS = `    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
    <link rel="manifest" href="/site.webmanifest">`;

function injectSlots(html) {
  return html
    .replace(
      '<div data-slot="instructions"></div>',
      `<div data-slot="instructions">${introTemplate()}</div>`
    )
    .replace(
      '<div data-slot="recipient-search"></div>',
      `<div data-slot="recipient-search">${recipientSearchTemplate()}</div>`
    )
    .replace(
      '<div data-slot="reuse-link"></div>',
      `<div data-slot="reuse-link">${reuseLinkTemplate()}</div>`
    );
}

function deriveUrlPath(filePath) {
  if (filePath === "/index.html") return "/";
  return filePath.replace(/^\/pages/, "").replace(/\/index\.html$/, "");
}

function generateOgTags(html, filePath) {
  const titleMatch = html.match(/<title>([^<]+)<\/title>/);
  const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]+)"/);
  if (!titleMatch || !descMatch) return "";

  const title = titleMatch[1];
  const description = descMatch[1];
  const url = BASE_URL + deriveUrlPath(filePath);

  return `    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:image" content="${OG_IMAGE}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="${url}">`;
}

function injectFavicons(html) {
  if (html.includes("apple-touch-icon")) return html;
  return html.replace(/<meta charset="[^"]*"[^>]*>/, (match) => `${match}\n${FAVICON_LINKS}`);
}

export function prerenderPlugin() {
  return {
    name: "vite-prerender",

    transformIndexHtml(html, ctx) {
      const filePath = ctx.path || "/index.html";

      if (filePath === "/index.html") {
        html = injectSlots(html);
      }

      html = injectFavicons(html);

      const ogTags = generateOgTags(html, filePath);
      if (ogTags) {
        html = html.replace("</head>", `${ogTags}\n</head>`);
      }

      return html;
    },
  };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run spec/vitePrerenderPlugin.spec.js`
Expected: PASS

- [ ] **Step 6: Write failing tests for OG tag generation**

Add to the spec file:

```js
  describe("OG tag generation", () => {
    const pageHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Reuse a Previous Exchange</title>
    <meta name="description" content="Reuse a previous gift exchange to draw new names.">
</head>
<body></body>
</html>`;

    it("generates og:title from the title tag", () => {
      const result = plugin.transformIndexHtml(pageHtml, {path: "/pages/reuse/index.html"});
      expect(result).toContain('og:title" content="Reuse a Previous Exchange"');
    });

    it("generates og:description from meta description", () => {
      const result = plugin.transformIndexHtml(pageHtml, {path: "/pages/reuse/index.html"});
      expect(result).toContain('og:description" content="Reuse a previous gift exchange to draw new names."');
    });

    it("generates og:url from page path", () => {
      const result = plugin.transformIndexHtml(pageHtml, {path: "/pages/reuse/index.html"});
      expect(result).toContain('og:url" content="https://gift-exchange-generator.com/reuse"');
    });

    it("generates og:url as root for index.html", () => {
      const html = `<html><head><meta charset="UTF-8"><title>Gift Exchange Generator</title><meta name="description" content="Draw names."></head><body></body></html>`;
      const result = plugin.transformIndexHtml(html, {path: "/index.html"});
      expect(result).toContain('og:url" content="https://gift-exchange-generator.com/"');
    });

    it("derives /wishlist/edit from pages/wishlist/edit path", () => {
      const html = `<html><head><meta charset="UTF-8"><title>Add Your Wishlist</title><meta name="description" content="Add wishlists."></head><body></body></html>`;
      const result = plugin.transformIndexHtml(html, {path: "/pages/wishlist/edit/index.html"});
      expect(result).toContain('og:url" content="https://gift-exchange-generator.com/wishlist/edit"');
    });

    it("includes og:image and og:type", () => {
      const result = plugin.transformIndexHtml(pageHtml, {path: "/pages/reuse/index.html"});
      expect(result).toContain('og:image" content="https://gift-exchange-generator.com/Gift-Giving-Banner.webp"');
      expect(result).toContain('og:type" content="website"');
    });

    it("injects OG tags before </head>", () => {
      const result = plugin.transformIndexHtml(pageHtml, {path: "/pages/reuse/index.html"});
      const ogIndex = result.indexOf("og:title");
      const headCloseIndex = result.indexOf("</head>");
      expect(ogIndex).toBeLessThan(headCloseIndex);
      expect(ogIndex).toBeGreaterThan(0);
    });
  });
```

- [ ] **Step 7: Run tests to verify they pass**

These should already pass since the implementation in step 4 includes OG generation.

Run: `npx vitest run spec/vitePrerenderPlugin.spec.js`
Expected: PASS

- [ ] **Step 8: Write failing tests for favicon injection**

Add to the spec file:

```js
  describe("favicon injection", () => {
    const bareHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Add Your Wishlist</title>
    <meta name="description" content="Add wishlists.">
</head>
<body></body>
</html>`;

    it("injects favicon links into pages that lack them", () => {
      const result = plugin.transformIndexHtml(bareHtml, {path: "/pages/wishlist/edit/index.html"});
      expect(result).toContain('rel="apple-touch-icon"');
      expect(result).toContain('rel="manifest"');
      expect(result).toContain("favicon-32x32.png");
      expect(result).toContain("favicon-16x16.png");
    });

    it("does not duplicate favicons when already present", () => {
      const htmlWithFavicons = `<html><head><meta charset="UTF-8"><link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png"><title>Test</title><meta name="description" content="Test."></head><body></body></html>`;
      const result = plugin.transformIndexHtml(htmlWithFavicons, {path: "/index.html"});
      const count = (result.match(/apple-touch-icon/g) || []).length;
      expect(count).toBe(1);
    });

    it("injects favicons after meta charset", () => {
      const result = plugin.transformIndexHtml(bareHtml, {path: "/pages/reuse/index.html"});
      const charsetIndex = result.indexOf('charset="UTF-8"');
      const faviconIndex = result.indexOf("apple-touch-icon");
      expect(faviconIndex).toBeGreaterThan(charsetIndex);
    });
  });
```

- [ ] **Step 9: Run tests to verify they pass**

These should already pass since the implementation in step 4 includes favicon injection.

Run: `npx vitest run spec/vitePrerenderPlugin.spec.js`
Expected: PASS

- [ ] **Step 10: Commit**

```bash
git add src/vitePrerenderPlugin.js spec/vitePrerenderPlugin.spec.js vitest.config.ts
git commit -m "feat: add Vite prerender plugin with OG tags and favicon injection"
```

---

## Task 4: Wire up plugin and clean index.html

Register the plugin in Vite config and remove hardcoded favicon/manifest links from `index.html` (the plugin now injects them for all pages).

**Files:**
- Modify: `vite.config.js`
- Modify: `index.html`

- [ ] **Step 1: Register plugin in vite.config.js**

Before:
```js
import {defineConfig} from 'vite';
import {pageRoutesPlugin} from './src/vitePageRoutes.js';

export default defineConfig({
    appType: 'mpa',
    plugins: [pageRoutesPlugin()],
});
```

After:
```js
import {defineConfig} from 'vite';
import {pageRoutesPlugin} from './src/vitePageRoutes.js';
import {prerenderPlugin} from './src/vitePrerenderPlugin.js';

export default defineConfig({
    appType: 'mpa',
    plugins: [prerenderPlugin(), pageRoutesPlugin()],
});
```

Note: `prerenderPlugin` goes first so it injects content before `pageRoutesPlugin` strips Verifalia in dev mode. Order matters for `transformIndexHtml` chaining.

- [ ] **Step 2: Remove hardcoded favicon/manifest links from index.html**

Remove these four lines from `index.html` (lines 4-7):
```html
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
    <link rel="manifest" href="/site.webmanifest">
```

The plugin will now inject these for all pages including `index.html`.

- [ ] **Step 3: Run full test suite**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 4: Build and verify output**

Run: `npx vite build`
Expected: Build succeeds

- [ ] **Step 5: Verify dist/index.html has pre-rendered content**

Run: `grep -c 'Drawing names for a gift exchange' dist/index.html`
Expected: `1` (content is in the HTML, not just JS)

Run: `grep -c 'og:title' dist/index.html`
Expected: `1`

Run: `grep -c 'apple-touch-icon' dist/index.html`
Expected: `1`

- [ ] **Step 6: Verify secondary pages have OG tags and favicons**

Run: `grep -c 'og:title' dist/reuse/index.html`
Expected: `1`

Run: `grep -c 'apple-touch-icon' dist/reuse/index.html`
Expected: `1`

Run: `grep -c 'og:title' dist/wishlist/edit/index.html`
Expected: `1`

Run: `grep -c 'og:url' dist/wishlist/view/index.html`
Expected: `1`

- [ ] **Step 7: Commit**

```bash
git add vite.config.js index.html
git commit -m "feat: wire up prerender plugin, remove hardcoded favicons from index.html"
```
