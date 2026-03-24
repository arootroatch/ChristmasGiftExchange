# User Badge & Logout

## Problem

There is no visual indication that a user is logged in on the home/exchange page, and no way to log out from any page.

## Design

### 1. Logout endpoint — `netlify/functions/api-auth-logout-post.mjs`

A POST endpoint that clears the session cookie using the existing `clearSessionCookie()` from `netlify/shared/jwt.mjs`. No auth required (clearing an invalid cookie is harmless). Returns `{success: true}` with the `Set-Cookie` header that expires the cookie.

### 2. Shared UserBadge component — `src/UserBadge.js`

A small component used on the home/exchange page:

- **`init()`** — Checks `getSessionUser()`. If a user exists, renders a fixed top-right badge showing "Logged in as {name}" with a "Log out" link. If no user, does nothing.
- **Logout behavior** — On click: POST to `/api-auth-logout-post`, call `clearSession()`, remove the badge from the DOM.
- **`remove()`** — Removes the badge element from the DOM (for cleanup on `EXCHANGE_STARTED`).

Positioned `fixed; top: 12px; right: 16px; z-index: 10;` with frosted-glass styling matching the site aesthetic.

### 3. Exchange page integration — `src/exchange/index.js`

After `await loadSession()`, call `UserBadge.init()`. The badge appears before the user interacts with the exchange.

### 4. Dashboard integration — `src/dashboard/index.js`

Add a "Log out" link at the bottom of the sidebar nav in `dashboardLayout()`. Also add it to the mobile hamburger bar. On click: POST to logout endpoint, `clearSession()`, reload the page (which triggers `loadData()` → `loadSession()` returns null → shows auth gate).

### 5. Styling

**Exchange/home page** (`public/css/main.css` or similar):
- `.user-badge`: fixed top-right, frosted-glass background, small text, subtle appearance
- `.user-badge-logout`: link/button styled as subtle text, not a full button

**Dashboard** (`public/css/pages.css`):
- `.sidebar-logout`: styled like a nav item but at the bottom of the sidebar, visually distinct (e.g., muted color, separator above)
- Mobile hamburger bar: logout link alongside the welcome text

## Files Changed

- `netlify/functions/api-auth-logout-post.mjs` — New logout endpoint
- `spec/netlify-functions/api-auth-logout-post.spec.js` — Tests for logout endpoint
- `src/UserBadge.js` — New shared component
- `spec/UserBadge.spec.js` — Tests for UserBadge
- `src/exchange/index.js` — Call UserBadge.init() after loadSession
- `src/dashboard/index.js` — Add logout link to sidebar and hamburger bar
- `spec/dashboard/index.spec.js` — Test logout behavior
- `public/css/main.css` — UserBadge styles for exchange page
- `public/css/pages.css` — Logout link styles for dashboard

## Files NOT Changed

- `src/session.js` — `clearSession()` already exists
- `netlify/shared/jwt.mjs` — `clearSessionCookie()` already exists
- `src/authGate.js` — Unchanged
