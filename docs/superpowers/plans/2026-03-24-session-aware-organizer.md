# Session-Aware Organizer Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Skip the organizer verification form when the user is already authenticated, and fix the form's styling to match the frosted-glass email table when it does appear.

**Architecture:** A shared `src/session.js` module caches authenticated user data (name + email) fetched from `/api-user-get`. The exchange page loads the session at startup; `OrganizerForm` checks it before rendering. The dashboard is refactored to use the same module. The organizer form container gets frosted-glass CSS matching `#emailTable`.

**Tech Stack:** Vanilla JS, Vitest + jsdom, Netlify serverless functions, MongoDB

**Spec:** `docs/superpowers/specs/2026-03-24-session-aware-organizer-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `netlify/functions/api-user-get.mjs` | Modify | Add `email` to response |
| `spec/netlify-functions/api-user-get.spec.js` | Modify | Assert `email` in response |
| `src/session.js` | Create | Shared session: `loadSession()`, `getSessionUser()`, `setSessionUser()` |
| `spec/session.spec.js` | Create | Unit tests for session module |
| `src/authGate.js` | Modify | Call `setSessionUser` on successful verification |
| `spec/authGate.spec.js` | Modify | Assert `setSessionUser` is called |
| `src/exchange/components/OrganizerForm.js` | Modify | Check `getSessionUser()` before rendering form |
| `spec/exchange/components/OrganizerForm.spec.js` | Modify | Add tests for authenticated skip behavior |
| `src/exchange/index.js` | Modify | Call `await loadSession()` at startup |
| `src/dashboard/index.js` | Modify | Use `loadSession()`/`getSessionUser()` instead of raw fetch |
| `spec/dashboard/index.spec.js` | Modify | Update tests for session module usage |
| `dist/css/components/email-dialog.css` | Modify | Add `#organizerFormContainer` frosted-glass styles |

---

### Task 1: Add `email` to `/api-user-get` response

**Files:**
- Modify: `spec/netlify-functions/api-user-get.spec.js:43-62`
- Modify: `netlify/functions/api-user-get.mjs:10-15`

- [ ] **Step 1: Write the failing test**

In `spec/netlify-functions/api-user-get.spec.js`, add to the existing "returns user data for authenticated user" test, after line 57 (`expect(body.name).toBe("Alex");`):

```js
expect(body.email).toBe("alex@test.com");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run spec/netlify-functions/api-user-get.spec.js`
Expected: FAIL — `body.email` is `undefined`

- [ ] **Step 3: Write minimal implementation**

In `netlify/functions/api-user-get.mjs`, add `email` to the response object:

```js
return ok({
    name: user.name,
    email: user.email,
    wishlists: user.wishlists ?? [],
    wishItems: user.wishItems ?? [],
    currency: user.currency ?? 'USD',
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run spec/netlify-functions/api-user-get.spec.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add netlify/functions/api-user-get.mjs spec/netlify-functions/api-user-get.spec.js
git commit -m "feat: add email to api-user-get response"
```

---

### Task 2: Create shared session module

**Files:**
- Create: `spec/session.spec.js`
- Create: `src/session.js`

`loadSession()` returns the full API response data (for consumers like the dashboard that need wishlists, wishItems, etc.) while internally caching only `{name, email}` in the session. Returns `null` on 401 (not authenticated). Throws on other errors (500, network) so callers can distinguish server failures from unauthenticated state.

- [ ] **Step 1: Write failing tests**

Create `spec/session.spec.js`:

```js
import {describe, it, expect, vi, beforeEach} from "vitest";

describe("session", () => {
  let loadSession, getSessionUser, setSessionUser, clearSession;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import("../src/session.js");
    loadSession = mod.loadSession;
    getSessionUser = mod.getSessionUser;
    setSessionUser = mod.setSessionUser;
    clearSession = mod.clearSession;
  });

  describe("loadSession", () => {
    it("returns full response data and caches name/email", async () => {
      globalThis.fetch = vi.fn(() => Promise.resolve({
        ok: true, status: 200,
        json: async () => ({name: "Alice", email: "alice@test.com", wishlists: [], wishItems: [], currency: "USD"}),
      }));

      const data = await loadSession();

      expect(data).toEqual({name: "Alice", email: "alice@test.com", wishlists: [], wishItems: [], currency: "USD"});
      expect(getSessionUser()).toEqual({name: "Alice", email: "alice@test.com"});
      expect(fetch).toHaveBeenCalledWith("/.netlify/functions/api-user-get", {method: "GET"});
    });

    it("returns null on 401", async () => {
      globalThis.fetch = vi.fn(() => Promise.resolve({
        ok: false, status: 401,
        json: async () => ({error: "Unauthorized"}),
      }));

      const data = await loadSession();

      expect(data).toBeNull();
      expect(getSessionUser()).toBeNull();
    });

    it("throws on non-401 error", async () => {
      globalThis.fetch = vi.fn(() => Promise.resolve({
        ok: false, status: 500,
        json: async () => ({}),
      }));

      await expect(loadSession()).rejects.toThrow("Session load failed");
      expect(getSessionUser()).toBeNull();
    });

    it("throws on fetch error", async () => {
      globalThis.fetch = vi.fn(() => Promise.reject(new Error("network")));

      await expect(loadSession()).rejects.toThrow("network");
      expect(getSessionUser()).toBeNull();
    });
  });

  describe("getSessionUser", () => {
    it("returns null before loadSession is called", () => {
      expect(getSessionUser()).toBeNull();
    });

    it("returns cached user after loadSession", async () => {
      globalThis.fetch = vi.fn(() => Promise.resolve({
        ok: true, status: 200,
        json: async () => ({name: "Alice", email: "alice@test.com"}),
      }));

      await loadSession();

      expect(getSessionUser()).toEqual({name: "Alice", email: "alice@test.com"});
    });
  });

  describe("setSessionUser", () => {
    it("sets user accessible via getSessionUser", () => {
      setSessionUser({name: "Bob", email: "bob@test.com"});

      expect(getSessionUser()).toEqual({name: "Bob", email: "bob@test.com"});
    });
  });

  describe("clearSession", () => {
    it("clears cached user", () => {
      setSessionUser({name: "Bob", email: "bob@test.com"});
      clearSession();

      expect(getSessionUser()).toBeNull();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run spec/session.spec.js`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

Create `src/session.js`:

```js
let sessionUser = null;

export async function loadSession() {
  const response = await fetch("/.netlify/functions/api-user-get", {method: "GET"});
  if (response.status === 401) {
    sessionUser = null;
    return null;
  }
  if (!response.ok) {
    sessionUser = null;
    throw new Error("Session load failed");
  }
  const data = await response.json();
  sessionUser = {name: data.name, email: data.email};
  return data;
}

export function getSessionUser() {
  return sessionUser;
}

export function setSessionUser({name, email}) {
  sessionUser = {name, email};
}

export function clearSession() {
  sessionUser = null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run spec/session.spec.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/session.js spec/session.spec.js
git commit -m "feat: create shared session module"
```

---

### Task 3: Auth gate calls `setSessionUser` on verification

**Files:**
- Modify: `spec/authGate.spec.js:103-115`
- Modify: `src/authGate.js`

- [ ] **Step 1: Write the failing test**

In `spec/authGate.spec.js`, add mock at the top (after the imports):

```js
vi.mock("../src/session.js", () => ({setSessionUser: vi.fn()}));
```

Add a new test after the "calls onSuccess after successful verification" test (line 115):

```js
it("calls setSessionUser after successful verification", async () => {
    const {setSessionUser} = await import("../src/session.js");
    stubFetch({success: true});
    initAuthGate({onSuccess: vi.fn(), showName: true});

    document.getElementById("auth-email").value = "test@test.com";
    document.getElementById("auth-code").value = "12345678";
    document.getElementById("auth-name").value = "Alex";
    document.getElementById("auth-verify-code").click();

    await flush();
    expect(setSessionUser).toHaveBeenCalledWith({name: "Alex", email: "test@test.com"});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run spec/authGate.spec.js`
Expected: FAIL — `setSessionUser` never called

- [ ] **Step 3: Write minimal implementation**

In `src/authGate.js`, add the import and call:

```js
import {apiFetch} from "./utils.js";
import {setSessionUser} from "./session.js";
```

In the `verifyBtn` click handler, add `setSessionUser({name, email});` before the `onSuccess` call:

```js
verifyBtn.addEventListener("click", () => {
    const email = document.getElementById("auth-email").value.trim();
    const code = document.getElementById("auth-code").value.trim();
    const name = showName ? document.getElementById("auth-name")?.value.trim() : undefined;
    if (!code) return;
    apiFetch("/.netlify/functions/api-auth-verify-post", {
        method: "POST",
        body: {email, code, ...(name && {name})},
        onSuccess: () => {
            setSessionUser({name, email});
            onSuccess({email, name});
        },
        onError: onError || (() => {}),
    });
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run spec/authGate.spec.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/authGate.js spec/authGate.spec.js
git commit -m "feat: authGate calls setSessionUser on verification"
```

---

### Task 4: OrganizerForm skips when authenticated

**Files:**
- Modify: `spec/exchange/components/OrganizerForm.spec.js`
- Modify: `src/exchange/components/OrganizerForm.js`

- [ ] **Step 1: Write failing tests**

In `spec/exchange/components/OrganizerForm.spec.js`, add mock and import at the top (after existing imports):

```js
import {getSessionUser} from "../../../src/session.js";
vi.mock("../../../src/session.js", () => ({
  getSessionUser: vi.fn(() => null),
  setSessionUser: vi.fn(),
}));
```

Add `getSessionUser.mockReturnValue(null);` to the existing `beforeEach` block (after `vi.spyOn(state, "setOrganizer");`) to prevent mock leakage between tests.

Add a new describe block inside the main describe, after the existing "verify code step" describe:

```js
describe("authenticated user bypass", () => {
  it("calls setOrganizer directly when user is authenticated (secret santa)", () => {
    getSessionUser.mockReturnValue({name: "Alice", email: "alice@test.com"});
    triggerSecretSantaAssign();

    expect(state.setOrganizer).toHaveBeenCalledWith("Alice", "alice@test.com");
    shouldNotSelect("#organizerFormContainer");
  });

  it("calls setOrganizer directly when user is authenticated (email results)", () => {
    getSessionUser.mockReturnValue({name: "Alice", email: "alice@test.com"});
    triggerNonSecretSantaEmailResults();

    expect(state.setOrganizer).toHaveBeenCalledWith("Alice", "alice@test.com");
    shouldNotSelect("#organizerFormContainer");
  });

  it("shows organizer form when no authenticated user", () => {
    getSessionUser.mockReturnValue(null);
    triggerSecretSantaAssign();

    shouldSelect("#organizerFormContainer");
    expect(state.setOrganizer).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run spec/exchange/components/OrganizerForm.spec.js`
Expected: FAIL — `setOrganizer` not called, `#organizerFormContainer` present

- [ ] **Step 3: Write minimal implementation**

Replace `src/exchange/components/OrganizerForm.js`:

```js
import {ExchangeEvents as Events, exchangeEvents as stateEvents, setOrganizer} from "../state.js";
import {selectElement} from "../../utils.js";
import {showError} from "../../Snackbar.js";
import {authGateTemplate, initAuthGate} from "../../authGate.js";
import {getSessionUser} from "../../session.js";

const containerId = "organizerFormContainer";

export function init() {
  stateEvents.on(Events.RECIPIENTS_ASSIGNED, (state) => {
    if (state.isSecretSanta) {
      renderOrSkip();
    }
  });
  stateEvents.on(Events.EMAIL_RESULTS_REQUESTED, () => {
    renderOrSkip();
  });
  stateEvents.on(Events.EXCHANGE_STARTED, () => {
    selectElement(`#${containerId}`)?.remove();
  });
}

function renderOrSkip() {
  const user = getSessionUser();
  if (user) {
    setOrganizer(user.name, user.email);
    return;
  }
  render();
}

function render() {
  selectElement(`#${containerId}`)?.remove();
  const html = `<div id="${containerId}" class="show">${authGateTemplate({heading: "Who's organizing this exchange?", showName: true})}</div>`;
  document.body.insertAdjacentHTML("beforeend", html);
  initAuthGate({
    onSuccess: ({email, name}) => {
      selectElement(`#${containerId}`)?.remove();
      setOrganizer(name, email);
    },
    onError: (msg) => showError(msg),
    showName: true,
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run spec/exchange/components/OrganizerForm.spec.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/exchange/components/OrganizerForm.js spec/exchange/components/OrganizerForm.spec.js
git commit -m "feat: skip organizer form when user is authenticated"
```

---

### Task 5: Exchange page loads session at startup

**Files:**
- Modify: `src/exchange/index.js`

- [ ] **Step 1: Add `await loadSession()` call to `main()`**

In `src/exchange/index.js`, add the import:

```js
import {loadSession} from "../session.js";
```

Make `main()` async and `await loadSession()` before component init. This ensures `getSessionUser()` has data by the time anything needs it (including the reuse-exchange path where `RECIPIENTS_ASSIGNED` can fire immediately). Catch errors silently — the exchange page doesn't need to distinguish 401 from 500; if there's no session, the organizer form will appear:

```js
export default async function main() {
  try { await loadSession(); } catch { /* not authenticated or server error — organizer form will handle it */ }
  snackbar.init();
  cookieBanner.init();
  house.init();
  name.init();
  nameList.init();
  select.init();
  resultsTable.init();
  controlStrip.init();
  generateButton.init();
  ghostHouse.init();
  instructions.init();

  organizerForm.init();
  emailTable.init();
  completionModal.init();
  dashboardLink.init();

  initDragDrop();

  const reuseData = sessionStorage.getItem("reuseExchange");
  if (reuseData) {
    sessionStorage.removeItem("reuseExchange");
    loadExchange(JSON.parse(reuseData));
  }
}
```

- [ ] **Step 2: Run existing tests to verify nothing breaks**

Run: `npx vitest run spec/exchange/`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/exchange/index.js
git commit -m "feat: load session at exchange page startup"
```

---

### Task 6: Frosted-glass styling for organizer form

**Files:**
- Modify: `dist/css/components/email-dialog.css`

- [ ] **Step 1: Add `#organizerFormContainer` styles**

Add to `dist/css/components/email-dialog.css`, after the `#emailTable` block. Match the frosted-glass treatment from `#emailTable`:

```css
#organizerFormContainer {
  min-width: 400px;
  width: auto;
  position: fixed;
  left: 50%;
  top: 20px;
  border-radius: 16px;
  transform: translateX(-50%);
  z-index: 10;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  overflow: hidden;
  padding: 20px;
  #auth-gate {
    h2 {
      margin-top: 0;
      margin-bottom: 15px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      padding-bottom: 15px;
    }
    label {
      display: block;
      margin-bottom: 10px;
      color: rgba(255, 255, 255, 0.7);
      font-size: inherit;
      font-weight: normal;
      text-transform: none;
      letter-spacing: normal;
    }
    input {
      width: 100%;
      background: rgba(0, 0, 0, 0.25);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 6px;
      color: #f0f0f0;
      padding: 8px;
      margin-top: 4px;
      box-sizing: border-box;
    }
  }
}
```

- [ ] **Step 2: Visually verify**

Run the dev server and trigger the organizer form (non-authenticated, non-secret-santa mode: generate → click email results). Confirm the form appears centered with frosted-glass styling matching the email table.

- [ ] **Step 3: Commit**

```bash
git add dist/css/components/email-dialog.css
git commit -m "style: add frosted-glass styling to organizer form"
```

---

### Task 7: Dashboard uses session module

**Files:**
- Modify: `src/dashboard/index.js:1-5,135-176`
- Modify: `spec/dashboard/index.spec.js`

The dashboard's `loadData()` currently has distinct handling for 401 (show auth gate) vs other errors (show snackbar). `loadSession()` returns `null` on 401 and throws on other errors, so the dashboard's `try/catch` naturally preserves this distinction.

- [ ] **Step 1: Update dashboard test mock data**

In `spec/dashboard/index.spec.js`, add `email` and `currency` to the `successUserResponse` mock to match the updated API:

```js
const successUserResponse = {
  ok: true,
  status: 200,
  json: async () => ({
    name: 'Alice',
    email: 'alice@test.com',
    wishlists: [],
    wishItems: [],
    currency: 'USD',
  }),
};
```

- [ ] **Step 2: Run tests to confirm baseline**

Run: `npx vitest run spec/dashboard/index.spec.js`
Expected: PASS

- [ ] **Step 3: Refactor dashboard to use session module**

In `src/dashboard/index.js`, update imports:

```js
import {apiFetch} from '../utils.js';
import * as snackbar from '../Snackbar.js';
import * as cookieBanner from '../CookieBanner.js';
import {authGateTemplate, initAuthGate} from '../authGate.js';
import {loadSession, getSessionUser} from '../session.js';
import {setUserData, setRecipientData, isDirty, dashboardEvents, DashboardEvents, resetState} from './state.js';
import * as recipientCard from './components/RecipientCard.js';
import * as wishlistSection from './components/WishlistSection.js';
import * as contactSection from './components/ContactSection.js';
import * as reuseSection from './components/ReuseSection.js';
```

Replace the `loadData` function. `loadSession()` returns full API response data on success, `null` on 401, and throws on other errors. The `try/catch` naturally preserves the existing 500-vs-401 behavior:

```js
async function loadData() {
  const content = document.getElementById('dashboard-content');
  try {
    const data = await loadSession();
    if (!data) {
      showAuthGate();
      return;
    }
    content.innerHTML = dashboardLayout(data.name);
    initDashboard();
    setUserData(data);
    loadRecipient();
  } catch {
    snackbar.showError('Something went wrong. Please try again.');
  }
}
```

`showAuthGate` is unchanged — `initAuthGate` now calls `setSessionUser` (from Task 3), and `loadData` will re-fetch via `loadSession` to confirm the session.

- [ ] **Step 4: Run all tests**

Run: `npx vitest run spec/dashboard/index.spec.js spec/session.spec.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/dashboard/index.js spec/dashboard/index.spec.js
git commit -m "refactor: dashboard uses shared session module"
```
