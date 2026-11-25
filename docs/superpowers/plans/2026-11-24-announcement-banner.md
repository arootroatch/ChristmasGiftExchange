# Announcement Banner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a dismissible, expiring site-wide announcement strip driven by a JSON file in the repo.

**Architecture:** `src/announcement.json` is imported by `src/AnnouncementBanner.js` and bundled by Vite. Every page entry calls `init()` at startup. Dismissal is remembered in `localStorage` by message text. No backend changes.

**Tech Stack:** Vanilla JS, Vite, CSS modules, Vitest + jsdom.

**Spec:** `docs/superpowers/specs/2026-11-24-announcement-banner-design.md`

## Global Constraints
- No new endpoint, collection or admin page.
- Message is plain text, always escaped with `escape()` from `src/utils.js`.
- `localStorage` key: `dismissedAnnouncement`. Every access is wrapped in try/catch.
- The banner is not sticky (the view-as banner is sticky and must stay on top).
- Ship `src/announcement.json` as `{"message": "", "expires": ""}`.
- Follow the CLAUDE.md TDD workflow: one test at a time, with the vitest autorunner (`npx vitest --watch`) running in the background.

## Review Focus
- Whitespace-only `message` should render nothing (Task 1 test `renders nothing for a whitespace-only message`).
- Missing or malformed `expires` should render nothing, so a bad edit can't create a permanent banner (Task 1 test `renders nothing when expires is missing or invalid`).
- Calling `init()` twice should leave a single banner (Task 1 test `does not render twice`).
- The expiry boundary uses the visitor's local day: still shown at 23:59 on `expires`, gone at 00:00 the next day (Task 1 tests).
- Storage that throws on read/write must not break the page (Task 1 test `renders and dismisses when localStorage throws`).

---

### Task 1: AnnouncementBanner component

**Files:**
- Create: `src/announcement.json`
- Create: `src/AnnouncementBanner.js`
- Create: `assets/styles/components/announcementBanner.module.css`
- Create: `spec/AnnouncementBanner.spec.js`
- Modify: `vitest.config.ts`, adding `'spec/AnnouncementBanner.spec.js'` to the `frontend` project's `include` list next to `spec/ViewAsBanner.spec.js`.

**Interfaces:**
- Produces: `export function init({announcement = <imported json>, now = new Date()} = {})`.
  - Inserts `<div id="announcement-banner" class="${styles.banner}" role="status">` at `document.body` `afterbegin`.
  - The div contains `<span>${escape(message)}</span>` and `<button type="button" aria-label="Dismiss announcement">✕</button>`.

**Render rule.** Render only when all of these hold:
- `message.trim()` is non-empty;
- `expires` matches `/^\d{4}-\d{2}-\d{2}$/` and parses to a valid date;
- `now < new Date(y, m - 1, d + 1)` (local midnight after the expires day);
- the stored `dismissedAnnouncement` is not equal to `message`;
- `#announcement-banner` is not already in the DOM.

**Click ✕:** set `localStorage.dismissedAnnouncement = message` (in a try/catch) and remove the element.

**CSS:** same box model as `viewAsBanner.module.css` `.banner`, but `position: static` (no sticky) and a distinct non-orange background. Builder's choice of color with readable contrast, e.g. `#1f4e79` background, `#fff` text. Style the dismiss button like `.exitBtn`, adapted to the colors.

- [ ] **Step 1: Write the failing tests one at a time**, each with `document.body.innerHTML = '<div id="container"></div>'` and `localStorage.clear()` in `beforeEach`.
  - `renders the message when active`: `init({announcement: {message: "Emails fixed", expires: "2026-12-01"}, now: new Date(2026, 10, 24)})`. Then `document.body.firstElementChild.id === "announcement-banner"` and its text contains `"Emails fixed"`.
  - `renders nothing for an empty message` (`message: ""`) and `renders nothing for a whitespace-only message` (`message: "  "`): `#announcement-banner` is null.
  - `still shows on the expires day`: `now: new Date(2026, 11, 1, 23, 59)`, banner present.
  - `hides after the expires day`: `now: new Date(2026, 11, 2, 0, 0)`, banner absent.
  - `renders nothing when expires is missing or invalid`: `expires` of `undefined`, `""`, `"12/01/2026"` and `"2026-13-45"` each give no banner.
  - `escapes HTML in the message`: `message: "<img src=x onerror=alert(1)>"` gives no `img` element in the banner, and `textContent` contains `<img`.
  - `dismiss removes the banner and remembers the message`: click the button. The banner is gone, and `localStorage.getItem("dismissedAnnouncement")` is the message.
  - `does not render a dismissed message`: pre-set the key to the message, then `init(...)` gives no banner.
  - `renders a new message even if a different one was dismissed`: key set to `"old"`, message `"new"`, banner present.
  - `does not render twice`: call `init(...)` twice, giving exactly one `#announcement-banner`.
  - `renders and dismisses when localStorage throws`: `vi.spyOn(Storage.prototype, "getItem")` and `"setItem"` both throw. The banner renders, the click removes it, and nothing throws.
  - `renders below an existing view-as banner`: body starts with `<div id="view-as-banner"></div>`. After `init`, the view-as banner is first. So insert after `#view-as-banner` when present, else `afterbegin`. This covers pages where the session loads first.

- [ ] **Step 2: Run `npx vitest run --project frontend spec/AnnouncementBanner.spec.js` and confirm each new test fails for the expected reason** (module missing first, then assertion failures).

- [ ] **Step 3: Implement `src/announcement.json`, `src/AnnouncementBanner.js` and the CSS module per the Interfaces and Render rule above.** Add the `vitest.config.ts` include entry.

- [ ] **Step 4: Run the same command. Expected: all AnnouncementBanner tests PASS.**

- [ ] **Step 5: Commit**
```bash
git add src/announcement.json src/AnnouncementBanner.js assets/styles/components/announcementBanner.module.css spec/AnnouncementBanner.spec.js vitest.config.ts
git commit -m "feat: add JSON-driven dismissible announcement banner"
```

### Task 2: Wire the banner into every page

**Files:**
- Modify: `src/exchange/index.js`, `src/dashboard/index.js`, `src/draw/index.js`, `src/admin/index.js`. In each, `import * as announcementBanner from '../AnnouncementBanner.js'` and call `announcementBanner.init()` as the first statement of `main()` (before any `await`).
- Modify: `pages/privacy/index.html`, `pages/family-gift-exchange/index.html`, `pages/office-secret-santa/index.html`. In the inline module, add `import {init as initAnnouncement} from '/src/AnnouncementBanner.js';` and call `initAnnouncement();` next to `init()`.
- Modify: `README.md`. Add a short "Site announcements" section: edit `src/announcement.json` (`message` and `expires` as `YYYY-MM-DD`; shown through the end of that day; an empty message disables it), then push to deploy.

**Interfaces:**
- Consumes: `init()` from Task 1 with default arguments.

- [ ] **Step 1: Make the edits above.**
- [ ] **Step 2: Verify the wiring.** Run `grep -l "AnnouncementBanner" src/exchange/index.js src/dashboard/index.js src/draw/index.js src/admin/index.js pages/privacy/index.html pages/family-gift-exchange/index.html pages/office-secret-santa/index.html | wc -l`. Expected: `7`.
- [ ] **Step 3: Smoke-check rendering.** Temporarily set `src/announcement.json` to a message expiring in the future, run `npx vite build`, and confirm the build succeeds. Optionally load `/`, `/dashboard`, `/privacy` in `npm run dev` and see the strip. Then **revert the JSON to the empty shipped value**.
- [ ] **Step 4: Run the full suite with `npx vitest run`. Expected: all tests pass.** Then run `npx eslint src spec`, which should be clean.
- [ ] **Step 5: Commit**
```bash
git add src/exchange/index.js src/dashboard/index.js src/draw/index.js src/admin/index.js pages/privacy/index.html pages/family-gift-exchange/index.html pages/office-secret-santa/index.html README.md
git commit -m "feat: show announcement banner on every page"
```
