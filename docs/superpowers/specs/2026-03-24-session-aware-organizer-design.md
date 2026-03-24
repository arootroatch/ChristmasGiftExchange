# Session-Aware Organizer Flow

## Problem

The organizer form (email verification step before the email table) has two issues:

1. **Broken styling** — It renders as a bare div appended to `document.body` with no frosted-glass treatment, appearing unstyled in the bottom-left corner instead of matching the `#emailTable` component's centered, frosted-glass modal appearance.
2. **Redundant when authenticated** — If the user already has a valid JWT session (they verified their email on the dashboard or elsewhere), we already know who the organizer is. The form should be skipped entirely.

## Design

### 1. Add `email` to `/api-user-get` response

The user document has `email` but the endpoint only returns `name`, wishlists, wishItems, and currency. Add `email` to the response so the frontend can get both `name` and `email` from a single call.

### 2. Shared session module — `src/session.js`

A new module providing site-wide access to the authenticated user:

- **`loadSession()`** — Calls `/api-user-get`. On success, caches the user object (`{name, email}`) in a module-level variable. On 401 or error, caches `null`. Returns the user or `null`.
- **`getSessionUser()`** — Synchronous getter returning the cached user or `null`.
- **`setSessionUser({name, email})`** — Sets the cached user directly (used after auth gate verification to avoid a redundant API call).

### 3. Auth gate integration

Update `authGate.js`'s `initAuthGate` so that after successful verification, it calls `setSessionUser({name, email})`. This makes the user data immediately available to any module that imports `getSessionUser()` without needing another API call.

### 4. Exchange page startup — load session

In `src/exchange/index.js`, call `await loadSession()` at the start of `main()`. This ensures `getSessionUser()` has data by the time the exchange is generated and the organizer check fires.

### 5. OrganizerForm — skip when authenticated

When `RECIPIENTS_ASSIGNED` (secret santa) or `EMAIL_RESULTS_REQUESTED` fires:

1. Check `getSessionUser()`.
2. If user exists: call `setOrganizer(user.name, user.email)` directly. This triggers `ORGANIZER_SET`, which renders `EmailTable`. The organizer form never appears.
3. If no user: render the organizer form as before (with styling fix applied).

### 6. Organizer form frosted-glass styling

Add CSS for `#organizerFormContainer` matching `#emailTable`'s treatment:

- `position: fixed; left: 50%; transform: translateX(-50%); top: 20px;`
- `background: rgba(255, 255, 255, 0.08);`
- `backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);`
- `border: 1px solid rgba(255, 255, 255, 0.15);`
- `border-radius: 16px;`
- `box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);`
- `z-index: 10;`

Style the inner `#auth-gate` elements (inputs, buttons, headings) to match the email dialog's visual treatment.

### 7. Dashboard uses session module

Refactor the dashboard's `loadData()` to use `loadSession()` from the shared session module instead of its own raw fetch to `/api-user-get`. On success, it gets the user from `getSessionUser()` and proceeds as before. On `null`, it shows the auth gate. The dashboard's `showAuthGate` `onSuccess` callback calls `loadSession()` (or `setSessionUser` + proceeds) to reload data after verification.

## Files Changed

- `netlify/functions/api-user-get.mjs` — Add `email` to response
- `src/session.js` — New shared session module
- `src/authGate.js` — Call `setSessionUser` on successful verification
- `src/exchange/components/OrganizerForm.js` — Check `getSessionUser()` before rendering
- `src/exchange/index.js` — Call `loadSession()` at startup
- `src/dashboard/index.js` — Use `loadSession()` / `getSessionUser()` instead of raw fetch
- `dist/css/components/email-dialog.css` (or new CSS file) — Frosted-glass styles for `#organizerFormContainer`

## Files NOT Changed

- `src/exchange/state.js` — `setOrganizer()` API unchanged
- `src/exchange/components/EmailTable/EmailTable.js` — Still listens for `ORGANIZER_SET`, unchanged
- `netlify/shared/jwt.mjs` — JWT payload unchanged (still just `userId`)
- `netlify/functions/api-auth-verify-post.mjs` — Response unchanged; frontend gets name/email from input fields and `setSessionUser`
