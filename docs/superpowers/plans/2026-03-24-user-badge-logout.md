# User Badge & Logout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a logged-in indicator with logout on the exchange page, and add logout to the dashboard sidebar.

**Architecture:** A new logout endpoint clears the session cookie. A shared `UserBadge` component renders a fixed top-right badge on the exchange page. The dashboard gets a logout link in its sidebar and hamburger bar.

**Tech Stack:** Vanilla JS, Vitest + jsdom, Netlify serverless functions

**Spec:** `docs/superpowers/specs/2026-03-24-user-badge-logout-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `netlify/functions/api-auth-logout-post.mjs` | Create | Logout endpoint — clears session cookie |
| `spec/netlify-functions/api-auth-logout-post.spec.js` | Create | Tests for logout endpoint |
| `src/UserBadge.js` | Create | Fixed top-right badge showing logged-in user + logout |
| `spec/UserBadge.spec.js` | Create | Tests for UserBadge component |
| `src/exchange/index.js` | Modify | Call UserBadge.init() after loadSession |
| `src/dashboard/index.js` | Modify | Add logout to sidebar and hamburger bar |
| `spec/dashboard/index.spec.js` | Modify | Test logout link |
| `public/css/components/user-badge.css` | Create | Frosted-glass badge styles |
| `public/css/main.css` | Modify | Import user-badge.css |
| `public/css/pages.css` | Modify | Sidebar logout styles |

---

### Task 1: Logout endpoint

**Files:**
- Create: `spec/netlify-functions/api-auth-logout-post.spec.js`
- Create: `netlify/functions/api-auth-logout-post.mjs`

- [ ] **Step 1: Write failing tests**

Create `spec/netlify-functions/api-auth-logout-post.spec.js`:

```js
import {describe, it, expect, beforeAll, vi} from "vitest";
import {buildEvent} from "../shared/testFactories.js";

describe("api-auth-logout-post", () => {
    let handler;

    beforeAll(async () => {
        process.env.URL = "https://test.netlify.app";
        const mod = await import("../../netlify/functions/api-auth-logout-post.mjs");
        handler = mod.handler;
    });

    it("rejects non-POST requests", async () => {
        const event = buildEvent("GET");
        const response = await handler(event);
        expect(response.statusCode).toBe(405);
    });

    it("returns 200 with Set-Cookie that clears session", async () => {
        const event = buildEvent("POST", {
            headers: {origin: "https://test.netlify.app"},
        });
        const response = await handler(event);
        expect(response.statusCode).toBe(200);
        expect(response.headers["Set-Cookie"]).toContain("session=;");
        expect(response.headers["Set-Cookie"]).toContain("Max-Age=0");
    });

    it("returns success body", async () => {
        const event = buildEvent("POST", {
            headers: {origin: "https://test.netlify.app"},
        });
        const response = await handler(event);
        const body = JSON.parse(response.body);
        expect(body.success).toBe(true);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run spec/netlify-functions/api-auth-logout-post.spec.js`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

Create `netlify/functions/api-auth-logout-post.mjs`:

```js
import {apiHandler} from "../shared/middleware.mjs";
import {okWithHeaders} from "../shared/responses.mjs";
import {clearSessionCookie} from "../shared/jwt.mjs";

export const handler = apiHandler("POST", async () => {
    return okWithHeaders({success: true}, {"Set-Cookie": clearSessionCookie()});
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run spec/netlify-functions/api-auth-logout-post.spec.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add netlify/functions/api-auth-logout-post.mjs spec/netlify-functions/api-auth-logout-post.spec.js
git commit -m "feat: add logout endpoint"
```

---

### Task 2: UserBadge component

**Files:**
- Create: `spec/UserBadge.spec.js`
- Create: `src/UserBadge.js`

- [ ] **Step 1: Write failing tests**

Create `spec/UserBadge.spec.js`:

```js
import {describe, it, expect, vi, beforeEach} from "vitest";
import {getSessionUser} from "../src/session.js";

vi.mock("../src/session.js", () => ({
    getSessionUser: vi.fn(() => null),
    clearSession: vi.fn(),
}));

const flush = () => new Promise(r => setTimeout(r, 0));

describe("UserBadge", () => {
    let init, remove;

    beforeEach(async () => {
        vi.resetModules();
        document.getElementById("user-badge")?.remove();
        getSessionUser.mockReturnValue(null);
        globalThis.fetch = vi.fn(() => Promise.resolve({ok: true, status: 200, json: async () => ({success: true})}));

        const mod = await import("../src/UserBadge.js");
        init = mod.init;
        remove = mod.remove;
    });

    it("does nothing when no user is logged in", () => {
        init();
        expect(document.getElementById("user-badge")).toBeNull();
    });

    it("renders badge when user is logged in", () => {
        getSessionUser.mockReturnValue({name: "Alice", email: "alice@test.com"});
        init();

        const badge = document.getElementById("user-badge");
        expect(badge).not.toBeNull();
        expect(badge.textContent).toContain("Alice");
    });

    it("renders a logout link", () => {
        getSessionUser.mockReturnValue({name: "Alice", email: "alice@test.com"});
        init();

        const logoutBtn = document.getElementById("user-badge-logout");
        expect(logoutBtn).not.toBeNull();
    });

    it("calls logout endpoint on click", async () => {
        getSessionUser.mockReturnValue({name: "Alice", email: "alice@test.com"});
        init();

        document.getElementById("user-badge-logout").click();
        await flush();

        expect(fetch).toHaveBeenCalledWith(
            "/.netlify/functions/api-auth-logout-post",
            expect.objectContaining({method: "POST"})
        );
    });

    it("removes badge after logout", async () => {
        getSessionUser.mockReturnValue({name: "Alice", email: "alice@test.com"});
        init();

        document.getElementById("user-badge-logout").click();
        await flush();

        expect(document.getElementById("user-badge")).toBeNull();
    });

    it("calls clearSession after logout", async () => {
        const {clearSession} = await import("../src/session.js");
        getSessionUser.mockReturnValue({name: "Alice", email: "alice@test.com"});
        init();

        document.getElementById("user-badge-logout").click();
        await flush();

        expect(clearSession).toHaveBeenCalled();
    });

    it("remove() removes the badge from DOM", () => {
        getSessionUser.mockReturnValue({name: "Alice", email: "alice@test.com"});
        init();
        expect(document.getElementById("user-badge")).not.toBeNull();

        remove();
        expect(document.getElementById("user-badge")).toBeNull();
    });

    it("does not render duplicate badges on multiple init calls", () => {
        getSessionUser.mockReturnValue({name: "Alice", email: "alice@test.com"});
        init();
        init();

        const badges = document.querySelectorAll("#user-badge");
        expect(badges.length).toBe(1);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run spec/UserBadge.spec.js`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

Create `src/UserBadge.js`:

```js
import {getSessionUser, clearSession} from "./session.js";
import {escape} from "./utils.js";

const badgeId = "user-badge";
const logoutId = "user-badge-logout";

export function init() {
    const user = getSessionUser();
    if (!user) return;

    remove();

    const html = `<div id="${badgeId}">
        <span>Logged in as <strong>${escape(user.name)}</strong></span>
        <a id="${logoutId}" href="#">Log out</a>
    </div>`;
    document.body.insertAdjacentHTML("beforeend", html);

    document.getElementById(logoutId).addEventListener("click", async (e) => {
        e.preventDefault();
        await fetch("/.netlify/functions/api-auth-logout-post", {method: "POST"});
        clearSession();
        remove();
    });
}

export function remove() {
    document.getElementById(badgeId)?.remove();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run spec/UserBadge.spec.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/UserBadge.js spec/UserBadge.spec.js
git commit -m "feat: add UserBadge component with logout"
```

---

### Task 3: UserBadge styling

**Files:**
- Create: `public/css/components/user-badge.css`
- Modify: `public/css/main.css`

- [ ] **Step 1: Create user-badge.css**

Create `public/css/components/user-badge.css`:

```css
#user-badge {
    position: fixed;
    top: 12px;
    right: 16px;
    z-index: 10;
    background: rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 8px;
    padding: 6px 14px;
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.7);
    display: flex;
    align-items: center;
    gap: 10px;
    strong {
        color: rgba(255, 255, 255, 0.9);
        font-weight: 600;
    }
    #user-badge-logout {
        color: rgba(255, 255, 255, 0.5);
        text-decoration: none;
        font-size: 0.75rem;
        transition: color 0.15s;
        &:hover {
            color: rgba(255, 255, 255, 0.9);
        }
    }
}
```

- [ ] **Step 2: Add import to main.css**

In `public/css/main.css`, add the import after the existing component imports (after the `cookie-banner.css` import around line 22):

```css
@import url('components/user-badge.css');
```

- [ ] **Step 3: Commit**

```bash
git add public/css/components/user-badge.css public/css/main.css
git commit -m "style: add UserBadge frosted-glass styling"
```

---

### Task 4: Exchange page integration

**Files:**
- Modify: `src/exchange/index.js`
- Modify: `spec/exchange/index.spec.js`

- [ ] **Step 1: Add UserBadge import and init**

In `src/exchange/index.js`, add the imports:

```js
import * as userBadge from "../UserBadge.js";
```

After the `loadSession()` try/catch and before `snackbar.init()`, add:

```js
userBadge.init();
```

The full top of `main()` becomes:

```js
export default async function main() {
  try { await loadSession(); } catch { /* not authenticated or server error — organizer form will handle it */ }
  userBadge.init();
  snackbar.init();
  cookieBanner.init();
```

Also, import the exchange events and subscribe to `EXCHANGE_STARTED` to remove the badge when a new exchange starts. Add after `dashboardLink.init();`:

```js
stateEvents.on(Events.EXCHANGE_STARTED, () => userBadge.remove());
```

This requires adding imports at the top:

```js
import {exchangeEvents as stateEvents, ExchangeEvents as Events} from "./state.js";
```

Note: `loadExchange` is already imported from `./state.js`, so merge them:

```js
import {loadExchange, exchangeEvents as stateEvents, ExchangeEvents as Events} from "./state.js";
```

- [ ] **Step 2: Update exchange index spec to mock UserBadge**

In `spec/exchange/index.spec.js`, add a mock for UserBadge (near the existing session mock):

```js
vi.mock('../../src/UserBadge.js', () => ({init: vi.fn(), remove: vi.fn()}));
```

- [ ] **Step 3: Run tests to verify nothing breaks**

Run: `npx vitest run spec/exchange/`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/exchange/index.js spec/exchange/index.spec.js
git commit -m "feat: show UserBadge on exchange page"
```

---

### Task 5: Dashboard logout

**Files:**
- Modify: `src/dashboard/index.js`
- Modify: `spec/dashboard/index.spec.js`

- [ ] **Step 1: Write failing test**

In `spec/dashboard/index.spec.js`, add a new test in the "loadData: success response" describe block:

```js
it('renders logout link in sidebar', () => {
    const logout = document.getElementById('sidebar-logout');
    expect(logout).not.toBeNull();
    expect(logout.textContent).toContain('Log out');
});

it('renders logout link in hamburger bar', () => {
    const logout = document.querySelector('.hamburger-bar #hamburger-logout');
    expect(logout).not.toBeNull();
});

it('calls logout endpoint when sidebar logout is clicked', async () => {
    globalThis.fetch.mockClear();
    document.getElementById('sidebar-logout').click();
    await flush();

    expect(globalThis.fetch).toHaveBeenCalledWith(
        '/.netlify/functions/api-auth-logout-post',
        expect.objectContaining({method: 'POST'})
    );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run spec/dashboard/index.spec.js`
Expected: FAIL — element not found

- [ ] **Step 3: Add logout to dashboardLayout**

In `src/dashboard/index.js`, add `clearSession` to the session import:

```js
import {loadSession, getSessionUser, clearSession} from '../session.js';
```

Update `dashboardLayout()` to add logout links. In the sidebar nav, add a logout link after the nav items div:

```js
function dashboardLayout(userName) {
  return `
    <div class="hamburger-bar">
      <button class="hamburger-btn" id="hamburger-btn" aria-label="Toggle menu">&#9776;</button>
      <span class="dashboard-welcome">Welcome, ${userName}!</span>
      <a class="hamburger-logout" id="hamburger-logout" href="#">Log out</a>
    </div>
    <div class="sidebar-backdrop" id="sidebar-backdrop"></div>
    <div class="dashboard-layout">
      <nav class="dashboard-sidebar" id="dashboard-sidebar">
        <div class="sidebar-title">Participant Dashboard</div>
        <div class="sidebar-welcome">Welcome, ${userName}!</div>
        <div class="sidebar-nav">
          ${SECTIONS.map(s =>
            `<a class="nav-item${s === defaultSection() ? ' active' : ''}" data-section="${s}">${LABELS[s]}</a>`
          ).join('')}
        </div>
        <a class="sidebar-logout" id="sidebar-logout" href="#">Log out</a>
      </nav>
      <main class="dashboard-main">
        ${SECTIONS.map(s =>
          `<div class="dashboard-section" id="section-${s}"${s !== defaultSection() ? ' hidden' : ''}></div>`
        ).join('')}
      </main>
    </div>`;
}
```

- [ ] **Step 4: Add logout click handler**

In `src/dashboard/index.js`, add a `initLogout()` function and call it from `initDashboard()`:

```js
function initLogout() {
    const handler = async (e) => {
        e.preventDefault();
        await fetch("/.netlify/functions/api-auth-logout-post", {method: "POST"});
        clearSession();
        window.location.reload();
    };
    document.getElementById('sidebar-logout').addEventListener('click', handler);
    document.getElementById('hamburger-logout').addEventListener('click', handler);
}
```

Add `initLogout()` call inside `initDashboard()`:

```js
function initDashboard() {
  initNavigation();
  initBeforeUnloadGuard();
  initLogout();
  recipientCard.init();
  wishlistSection.init();
  contactSection.init();
  reuseSection.init();
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run spec/dashboard/index.spec.js`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/dashboard/index.js spec/dashboard/index.spec.js
git commit -m "feat: add logout to dashboard sidebar and hamburger bar"
```

---

### Task 6: Dashboard logout styling

**Files:**
- Modify: `public/css/pages.css`

- [ ] **Step 1: Add sidebar logout styles**

In `public/css/pages.css`, add after the `.nav-item.active` block (around line 492):

```css
.sidebar-logout {
    display: block;
    padding: 10px 20px;
    font-size: 0.85rem;
    color: var(--text-secondary);
    text-decoration: none;
    border-top: 1px solid var(--frost-border);
    margin-top: auto;
    position: absolute;
    bottom: 24px;
    left: 0;
    right: 0;
    transition: color 0.15s;
}

.sidebar-logout:hover {
    color: var(--text-primary);
}

.hamburger-logout {
    margin-left: auto;
    font-size: 0.8rem;
    color: var(--text-secondary);
    text-decoration: none;
    transition: color 0.15s;
}

.hamburger-logout:hover {
    color: var(--text-primary);
}
```

- [ ] **Step 2: Visually verify**

Run the dev server. Verify:
1. Exchange page: frosted-glass badge in top-right when logged in, disappears after logout click
2. Dashboard: "Log out" at bottom of sidebar, also in hamburger bar on mobile. Clicking redirects to auth gate.

- [ ] **Step 3: Commit**

```bash
git add public/css/pages.css
git commit -m "style: add logout link styling for dashboard"
```
