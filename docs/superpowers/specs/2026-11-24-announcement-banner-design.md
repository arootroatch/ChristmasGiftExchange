# Announcement Banner — Design

## Intent
Let the site owner tell every visitor about things like bug fixes or outages. The message shows as a strip across the top of every page until the visitor dismisses it or it expires.

## Goals
- Edit a JSON file, push, and the redeployed site shows the message.
- Shown to everyone, logged in or not, on every page that runs scripts.
- Dismissible; once dismissed it never shows again in that browser.
- Not rendered after its expiration date.

## Non-goals / anti-goals
- No admin page, database collection or new endpoint. An earlier idea used `settings` plus an admin page; it was dropped as over-engineered.
- No multiple simultaneous messages, scheduling, or per-user targeting.
- No HTML or links in the message (plain text only).

## Approaches
- **Chosen: a JSON file in the repo, bundled at build time.** Zero backend, and it works for logged-out visitors.
- Rejected: the message stored in the `settings` doc and delivered through `api-user-get`. `api-user-get` returns `null` for logged-out visitors, and the privacy and SEO landing pages never call it. It would also need an admin page.

## Design
- **File:** `src/announcement.json`, shaped `{"message": "", "expires": "YYYY-MM-DD"}`. An empty `message` means no banner. Ship it empty.
- **Component:** `src/AnnouncementBanner.js`, following the `ViewAsBanner.js` shape (`template()`, `init()`). It imports the JSON directly (Vite bundles it).
- **Render rules:** render only if `message` is non-empty AND today (visitor's local time) is on or before `expires`. The banner shows through the end of the expires day. It also must not have been dismissed.
- **Dismissal (builder's call, approved):** the ✕ button stores the message text in `localStorage` (single key, e.g. `dismissedAnnouncement`) and removes the banner. A banner whose text equals the stored value is not rendered. Editing the text, even for a typo, re-shows it. Wrap every `localStorage` access in try/catch: if storage is unavailable, still render, and dismissal hides it for the current page only.
- **Placement:** inserted at the top of `<body>`. It is **not sticky**, so it never overlaps the sticky view-as banner. The view-as banner inserts with `afterbegin` after the session loads, so it stays above the announcement.
- **Look:** same strip shape as the view-as banner (`viewAsBanner.module.css`), in a different color so it isn't confused with admin mode. Own CSS module `assets/styles/components/announcementBanner.module.css`. The message is escaped with `escape()` from `utils.js`. Use `role="status"` and a ✕ button with `aria-label="Dismiss announcement"`.
- **Wiring:** call `init()` from every page entry: `src/exchange/index.js`, `src/dashboard/index.js`, `src/draw/index.js`, `src/admin/index.js`, and the inline module scripts in `pages/privacy`, `pages/family-gift-exchange` and `pages/office-secret-santa` (these currently call only `Navbar.init()`).

## Testing
- Frontend spec `spec/AnnouncementBanner.spec.js`. It must be added to the `frontend` project's `include` list in `vitest.config.ts`.
- Cover: empty message, expired, expires-today still shows, dismissed text, dismiss click persists and removes, storage throwing.
- Inject or mock the announcement data and the current date so the tests don't depend on the real file or clock.

## Left to the builder
Exact color, test seam for the JSON/date, and whether to also show the expiry in the README/how-to.
