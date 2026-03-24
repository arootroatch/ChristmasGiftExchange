# Participant Dashboard Design

## Overview

A new `/dashboard` page that consolidates all participant-facing features into a single authenticated hub. Replaces the home page's recipient search and reuse link components, the standalone wishlist edit page, and the standalone wishlist view page.

## Home Page Changes

### New: DashboardLink component
- Replaces `RecipientSearch.js` and `ReuseLink.js` in the `#top-actions` area
- Single `data-slot="dashboard-link"` replaces `data-slot="recipient-search"` and `data-slot="reuse-link"`
- Renders a link to `/dashboard` with a fun description of what the dashboard provides (recipient lookup, wishlist viewing/editing, contact info, reuse)
- Hides when `EXCHANGE_STARTED` fires (organizer is creating a new exchange)
- Prerender plugin updated accordingly

### Removed from home page
- `src/exchange/components/RecipientSearch.js`
- `src/exchange/components/ReuseLink.js`
- `recipientSearchTemplate()` and `reuseLinkTemplate()` from `firstScreenTemplates.js`

## Dashboard Page

### Location
- HTML: `pages/dashboard/index.html`
- Module: `src/dashboard/`

### Auth Flow (Optimistic Pattern)
Following the existing wishlist edit page pattern:
1. Page loads, renders dashboard layout immediately, initializes components, calls `snackbar.init()` and `cookieBanner.init()`
2. Fetch user data (`api-user-get`) and recipient data (`api-recipient-get`) in parallel
3. On success, render sections as data arrives
4. On 401 from either endpoint, show auth gate; on successful auth, re-render layout and re-fetch data

### Layout: Hybrid Collapsible
Mobile responsive design throughout.

**Back link** — `<a href="/">Back to Generator</a>` at the top

**Recipient card** (always visible):
- Shows "You're buying a gift for [Name]" with exchange date
- "View [Name]'s Wishlist" button that expands an inline wishlist view
- Wishlist view uses `api-user-wishlist-get` with the `exchangeId` from the recipient response
- Handles case where no exchange is found (friendly message, no expand button)
- "Email Me [Name]'s Wish List" button (uses `api-wishlist-email-post`)

**No-exchange state:** When `api-recipient-get` returns 404, the recipient card shows a "No exchange found" message. The Your Wishlist, Contact Info, and Reuse Exchange sections still render — they are independent of having a recipient assignment.

**Your Wishlist** (collapsible, collapsed by default):
- Reuses wishlist edit components moved from `src/wishlistEdit/`: WishlistList, ItemList, SaveButton
- Wired to dashboard state module

**Contact Info** (collapsible, collapsed by default):
- Reuses ContactForm component moved from `src/wishlistEdit/components/`
- Sends contact info to givers via `api-user-contact-post`

**Reuse Exchange** (collapsible, collapsed by default):
- Search button triggers `api-my-exchanges-get`
- Renders exchange results with "Use This Exchange" buttons
- Empty state: inline "No past exchanges found" message within the section (not just a snackbar)
- Selecting an exchange saves to `sessionStorage` and navigates to `/`

### State Module (`src/dashboard/state.js`)
- Private state object (following existing pattern)
- Holds: user data (name, wishlists, wishItems) from `api-user-get`, recipient data (recipientName from `recipient` field, exchangeId, date) from `api-recipient-get`, recipient wishlist data from `api-user-wishlist-get`
- EventEmitter for component subscriptions
- Getter functions for components that need current state
- State mutation functions that emit events with `{...state}` spread

### Components (`src/dashboard/components/`)
- `RecipientCard.js` — always-visible recipient info + expandable wishlist view
- `WishlistSection.js` — collapsible wrapper for wishlist editing
- `WishlistList.js` — moved from `src/wishlistEdit/components/`
- `ItemList.js` — moved from `src/wishlistEdit/components/`
- `SaveButton.js` — moved from `src/wishlistEdit/components/`
- `ContactSection.js` — collapsible wrapper for contact form
- `ContactForm.js` — moved from `src/wishlistEdit/components/`
- `ReuseSection.js` — collapsible wrapper for reuse exchange search + results
- `Collapsible.js` — shared collapsible section component (expand/collapse with heading)

### Greeting
The existing `Greeting.js` from wishlist edit is not needed — the dashboard has its own header context. The user's name can be shown in a welcome line at the top of the dashboard after auth.

## Legacy Token Handling
Old email links containing `?user=TOKEN` (from before cookie-based auth) are no longer supported. The old pages are deleted. Users with old emails will get a 404 and can navigate to `/dashboard` manually. This is acceptable since the legacy tokens were already non-functional after the auth migration.

## Pages Removed
- `pages/wishlist/edit/index.html` — editing moves to dashboard
- `pages/wishlist/view/index.html` — viewing moves to dashboard
- `pages/reuse/index.html` — reuse moves to dashboard
- `src/reuse.js` — logic absorbed into ReuseSection
- `src/wishlistView.js` — logic absorbed into RecipientCard
- `src/wishlistEdit/` — components moved to `src/dashboard/components/`

## Email Template Updates

All email templates that link to wishlist edit or wishlist view pages update to link to `/dashboard` with a hash fragment to auto-expand the relevant section:
- `netlify/shared/emails/wishlistLink.mjs` — edit link → `/dashboard#wishlist`
- `netlify/shared/emails/wishlistNotification.mjs` — view link → `/dashboard` (recipient wishlist is always visible)
- `netlify/shared/emails/secretSanta.mjs` — any wishlist links → `/dashboard`
- Other templates as needed

The dashboard reads `window.location.hash` on load and auto-expands the matching collapsible section (e.g., `#wishlist` expands Your Wishlist, `#contact` expands Contact Info, `#reuse` expands Reuse Exchange).

## API Endpoints

No new endpoints needed. Dashboard uses existing:
- `api-auth-code-post` / `api-auth-verify-post` — auth flow
- `api-recipient-get` — get most recent recipient assignment
- `api-user-get` — get user's wishlist data
- `api-user-wishlist-get?exchangeId=...` — view recipient's wishlist
- `api-user-wishlist-put` — save wishlist edits
- `api-user-contact-post` — send contact info
- `api-my-exchanges-get` — search past exchanges for reuse
- `api-wishlist-email-post` — email recipient's wishlist link

## Testing

### Unit Tests
- `spec/dashboard/state.spec.js` — state mutations and events
- `spec/dashboard/components/RecipientCard.spec.js`
- `spec/dashboard/components/WishlistSection.spec.js`
- `spec/dashboard/components/ContactSection.spec.js`
- `spec/dashboard/components/ReuseSection.spec.js`
- `spec/dashboard/components/Collapsible.spec.js`
- `spec/exchange/components/DashboardLink.spec.js`
- Updated: `spec/vitePrerenderPlugin.spec.js`

### Moved/Updated Tests
- Wishlist edit component tests move from `spec/wishlistEdit/` to `spec/dashboard/`
- Home page tests updated to reflect DashboardLink replacing RecipientSearch + ReuseLink

### E2E Tests
- Update `e2e/edit-wishlist.spec.js` — navigate to `/dashboard` instead of `/wishlist/edit`
- Update `e2e/reuse-exchange.spec.js` — navigate to `/dashboard` instead of `/reuse`
- Update `e2e/recipient-search.spec.js` — navigate to `/dashboard` instead of using home page inline search
- New e2e test for full dashboard flow (auth → view recipient → expand wishlist → reuse)

## Build Configuration
- `vitePageRoutes.js` updated to include `pages/dashboard/index.html` and remove deleted pages
- Prerender plugin updated for new dashboard-link slot
