# Unique Email Validation & Send Me the Results — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent duplicate email addresses in exchange submissions and provide a "Send Me the Results" alternative for users who don't have everyone's emails.

**Architecture:** Two independent features. Feature 1 adds client-side + server-side duplicate email validation to the existing EmailTable submit flow and api-exchange-post endpoint. Feature 2 adds a new SendResults component (sibling to EmailTable in DOM), a new api-results-email-post endpoint, and a results-summary email template.

**Tech Stack:** Vanilla JS, Vitest + jsdom, Netlify serverless functions, MongoDB, Zod 4, Handlebars email templates.

**Spec:** `docs/superpowers/specs/2026-03-11-unique-emails-and-send-results-design.md`

---

## Chunk 1: Backend Unique Email Validation

### Task 1: Backend — Reject duplicate emails in api-exchange-post

**Files:**
- Modify: `netlify/functions/api-exchange-post.mjs:23-47` (add `.check()` refinement)
- Test: `spec/netlify-functions/api-exchange-post.spec.js`

- [ ] **Step 1: Write failing test — duplicate emails rejected**

In `spec/netlify-functions/api-exchange-post.spec.js`, add after the existing `returns 400 for missing required fields` test (line 175):

```js
it('returns 400 when participants have duplicate emails', async () => {
    const event = buildEvent({
        ...exchangePayload,
        participants: [
            {name: 'Alex', email: 'same@test.com'},
            {name: 'Whitney', email: 'same@test.com'},
            {name: 'Hunter', email: 'hunter@test.com'},
        ],
    });
    const response = await handler(event);
    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error).toContain('unique');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run spec/netlify-functions/api-exchange-post.spec.js`
Expected: FAIL — currently accepts duplicate emails and returns 200.

- [ ] **Step 3: Write failing test — case-insensitive duplicate detection**

```js
it('returns 400 when participant emails differ only by case', async () => {
    const event = buildEvent({
        ...exchangePayload,
        participants: [
            {name: 'Alex', email: 'Same@Test.com'},
            {name: 'Whitney', email: 'same@test.com'},
            {name: 'Hunter', email: 'hunter@test.com'},
        ],
    });
    const response = await handler(event);
    expect(response.statusCode).toBe(400);
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npx vitest run spec/netlify-functions/api-exchange-post.spec.js`
Expected: FAIL

- [ ] **Step 5: Implement — add `.check()` to schema**

In `netlify/functions/api-exchange-post.mjs`, chain a second `.check()` after the existing one on `exchangePostRequestSchema` (after line 47):

```js
.check(ctx => {
    const emails = ctx.value.participants.map(p => p.email.toLowerCase());
    const seen = new Set();
    for (const email of emails) {
        if (seen.has(email)) {
            ctx.issues.push({
                code: "custom",
                message: "All participant emails must be unique",
                path: ["participants"],
            });
            return;
        }
        seen.add(email);
    }
})
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run spec/netlify-functions/api-exchange-post.spec.js`
Expected: ALL PASS

- [ ] **Step 7: Commit**

```bash
git add netlify/functions/api-exchange-post.mjs spec/netlify-functions/api-exchange-post.spec.js
git commit -m "feat: reject duplicate participant emails in api-exchange-post"
```

### Task 2: Contract test — duplicate emails rejected

**Files:**
- Test: `spec/integration/api-exchange-post.contract.spec.js`

- [ ] **Step 1: Write contract test**

In `spec/integration/api-exchange-post.contract.spec.js`, add inside the `request contract (FE → BE)` describe block (after line 76):

```js
it('rejects payload with duplicate participant emails', async () => {
    const event = buildEvent('POST', {
        body: {
            ...fePayload,
            participants: [
                {name: 'Alice', email: 'same@test.com'},
                {name: 'Bob', email: 'same@test.com'},
                {name: 'Carol', email: 'carol@test.com'},
            ],
        },
    });
    const response = await handler(event);
    expect(response.statusCode).toBe(400);
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npx vitest run spec/integration/api-exchange-post.contract.spec.js`
Expected: PASS (implementation already exists from Task 1)

- [ ] **Step 3: Commit**

```bash
git add spec/integration/api-exchange-post.contract.spec.js
git commit -m "test: add contract test for duplicate email rejection"
```

---

## Chunk 2: Frontend Unique Email Validation

### Task 3: Frontend — duplicate email validation in EmailTable

**Files:**
- Modify: `src/exchange/components/EmailTable/EmailTable.js`
- Modify: `public/css/components/email-dialog.css`
- Test: `spec/exchange/components/EmailTable/EmailTable.spec.js`

- [ ] **Step 1: Write failing test — prevents submit with duplicate emails**

In `spec/exchange/components/EmailTable/EmailTable.spec.js`, add a new describe block after the `submitEmails error handling` block (after line 236):

```js
describe("duplicate email validation", () => {
    beforeEach(() => {
        triggerEmailTableRender();
        const body = document.querySelector("#emailTableBody");
        body.querySelectorAll(".emailDiv").forEach(el => el.remove());
        getState().participants = [];
        installParticipantNames("Alex", "Whitney", "Hunter");
        renderEmailTableInputs([
            {name: "Alex", email: "same@test.com"},
            {name: "Whitney", email: "same@test.com"},
            {name: "Hunter", email: "hunter@test.com"},
        ]);
    });

    it("prevents submission when emails are duplicated", () => {
        submitEmailForm();

        expect(global.fetch).not.toHaveBeenCalled();
    });

    it("shows error snackbar for duplicate emails", () => {
        submitEmailForm();

        shouldDisplayErrorSnackbar("Each participant must have a unique email address");
    });
});
```

Note: add `shouldDisplayErrorSnackbar` to the existing imports from `specHelper` at the top of the file (it's already imported — check line 9).

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run spec/exchange/components/EmailTable/EmailTable.spec.js`
Expected: FAIL — `fetch` is called, no error snackbar shown.

- [ ] **Step 3: Implement — add `findDuplicateEmails` and validation in `submitEmails`**

In `src/exchange/components/EmailTable/EmailTable.js`:

Add a new function before `submitEmails`:

```js
function findDuplicateEmails() {
  const inputs = Array.from(document.getElementsByClassName("emailInput"));
  const emailCounts = {};
  inputs.forEach(input => {
    const email = input.value.trim().toLowerCase();
    emailCounts[email] = (emailCounts[email] || 0) + 1;
  });
  const duplicates = new Set(
    Object.keys(emailCounts).filter(email => emailCounts[email] > 1)
  );
  return {inputs, duplicates};
}
```

At the top of `submitEmails` (after `event.preventDefault()`, before `setLoadingState`), add:

```js
const {inputs, duplicates} = findDuplicateEmails();
if (duplicates.size > 0) {
    inputs.forEach(input => {
        if (duplicates.has(input.value.trim().toLowerCase())) {
            input.classList.add("duplicate-email");
        }
    });
    showError("Each participant must have a unique email address");
    return;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run spec/exchange/components/EmailTable/EmailTable.spec.js`
Expected: ALL PASS

- [ ] **Step 5: Write failing test — duplicate CSS class added to matching inputs**

Add to the `duplicate email validation` describe block:

```js
it("adds duplicate-email class to inputs with duplicate emails", () => {
    submitEmailForm();

    const inputs = document.querySelectorAll(".emailInput");
    expect(inputs[0].classList).toContain("duplicate-email");
    expect(inputs[1].classList).toContain("duplicate-email");
    expect(inputs[2].classList).not.toContain("duplicate-email");
});
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run spec/exchange/components/EmailTable/EmailTable.spec.js`
Expected: PASS (implementation already handles this from Step 3)

- [ ] **Step 7: Write failing test — input event clears duplicate class**

Add to the `duplicate email validation` describe block:

```js
it("removes duplicate-email class on input event", () => {
    submitEmailForm();
    const input = document.querySelectorAll(".emailInput")[0];
    expect(input.classList).toContain("duplicate-email");

    input.value = "different@test.com";
    input.dispatchEvent(new Event("input", {bubbles: true}));

    expect(input.classList).not.toContain("duplicate-email");
});
```

- [ ] **Step 8: Run test to verify it fails**

Run: `npx vitest run spec/exchange/components/EmailTable/EmailTable.spec.js`
Expected: FAIL — no input listener clears the class yet.

- [ ] **Step 9: Implement — add input listeners to clear duplicate class**

In `src/exchange/components/EmailTable/EmailTable.js`, in the `render` function (after the existing `addEventListener` calls), add:

```js
document.querySelectorAll(".emailInput").forEach(input => {
    input.addEventListener("input", () => input.classList.remove("duplicate-email"));
});
```

- [ ] **Step 10: Run tests to verify they pass**

Run: `npx vitest run spec/exchange/components/EmailTable/EmailTable.spec.js`
Expected: ALL PASS

- [ ] **Step 11: Add CSS for duplicate-email class**

In `public/css/components/email-dialog.css`, add inside the `#emailTable` block, after the `.emailDiv` rules (after line 51):

```css
.emailInput.duplicate-email {
    border-color: red;
}
```

- [ ] **Step 12: Commit**

```bash
git add src/exchange/components/EmailTable/EmailTable.js public/css/components/email-dialog.css spec/exchange/components/EmailTable/EmailTable.spec.js
git commit -m "feat: validate unique emails in EmailTable before submission"
```

---

## Chunk 3: Backend — Results Email Endpoint & Template

### Task 4: Create results-summary email template

**Files:**
- Create: `emails/results-summary/index.html`

- [ ] **Step 1: Create email template**

Create `emails/results-summary/index.html` modeled after the existing `emails/secret-santa/index.html` template. Uses Handlebars syntax with inline styles for email compatibility:

```html
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta charset="UTF-8"/>
    <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
    <title></title>
</head>
<body
        style="
      margin: 0;
      padding: 0;
      font-family: Arial, Helvetica, sans-serif;
      color: #000;
      background-color: #fff;
    "
>
<table
        role="presentation"
        style="
        width: 100%;
        border-collapse: collapse;
        border: 0;
        border-spacing: 0;
        padding: 20px;
      "
>
    <tr>
        <td
                align="center"
                style="padding-top: 50px; padding-bottom: 30px; font-size: 36px"
        >
            Hi {{name}}, here are your gift exchange results:
        </td>
    </tr>
    <tr>
        <td align="center" style="padding: 0 50px 30px">
            <table
                    role="presentation"
                    style="
                    border-collapse: collapse;
                    border: 1px solid #ccc;
                    width: 100%;
                    max-width: 500px;
                "
            >
                <tr style="background-color: #f5f5f5;">
                    <th style="padding: 12px 16px; text-align: left; border-bottom: 2px solid #ccc; font-size: 18px;">Giver</th>
                    <th style="padding: 12px 8px; text-align: center; border-bottom: 2px solid #ccc; font-size: 18px;"></th>
                    <th style="padding: 12px 16px; text-align: left; border-bottom: 2px solid #ccc; font-size: 18px;">Recipient</th>
                </tr>
                {{#each assignments}}
                <tr>
                    <td style="padding: 10px 16px; border-bottom: 1px solid #eee; font-size: 16px;">{{this.giver}}</td>
                    <td style="padding: 10px 8px; text-align: center; border-bottom: 1px solid #eee; font-size: 16px;">&#8594;</td>
                    <td style="padding: 10px 16px; border-bottom: 1px solid #eee; font-size: 16px;">{{this.recipient}}</td>
                </tr>
                {{/each}}
            </table>
        </td>
    </tr>
    <tr>
        <td align="center" style="padding: 30px 50px; font-size: 16px">
            This is the only copy of your results. Please save this email or take a screenshot!
        </td>
    </tr>
    <tr>
        <td align="center" style="padding: 0px 50px; font-size: 16px">
            This site is developed in my spare time and thrives on user feedback
            to be the best it can be. If you have thoughts on how the site could
            be improved, it would mean the world to me if you responded to this
            email with your feedback.
        </td>
    </tr>
    <tr>
        <td align="center" style="padding: 10px 50px; font-size: 16px">
            The site does cost money to operate. If you enjoyed using the Gift Exchange Generator, please consider
            donating to keep it going! I accept <a href="https://venmo.com/u/Alex-Root-Roatch">Venmo</a> and <a
                href="https://paypal.me/arootroatch?country.x=US&locale.x=en_US">PayPal</a>.
        </td>
    </tr>
    <tr>
        <td align="left" style="padding: 50px; font-size: 20px">
            Happy gift giving!
        </td>
    </tr>
    <tr>
        <td
                align="left"
                style="padding-left: 50px; padding-top: 0; font-size: 20px"
        >
            Alex at the Gift Exchange Generator
        </td>
    </tr>
</table>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add emails/results-summary/index.html
git commit -m "feat: add results-summary email template"
```

### Task 5: Create api-results-email-post endpoint

**Files:**
- Create: `netlify/functions/api-results-email-post.mjs`
- Test: `spec/netlify-functions/api-results-email-post.spec.js`

- [ ] **Step 1: Write failing test — returns 405 for non-POST**

Create `spec/netlify-functions/api-results-email-post.spec.js`:

```js
import {afterAll, afterEach, beforeAll, describe, expect, it, vi} from 'vitest';

describe('api-results-email-post', () => {
    let handler;

    beforeAll(async () => {
        const module = await import('../../netlify/functions/api-results-email-post.mjs');
        handler = module.handler;
    });

    function buildEvent(body) {
        return {
            httpMethod: 'POST',
            body: JSON.stringify(body),
        };
    }

    const validPayload = {
        name: 'Alex',
        email: 'alex@test.com',
        assignments: [
            {giver: 'Alex', recipient: 'Whitney'},
            {giver: 'Whitney', recipient: 'Alex'},
        ],
    };

    it('returns 405 for non-POST requests', async () => {
        const event = {httpMethod: 'GET', body: '{}'};
        const response = await handler(event);
        expect(response.statusCode).toBe(405);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run spec/netlify-functions/api-results-email-post.spec.js`
Expected: FAIL — module does not exist yet.

- [ ] **Step 3: Create minimal endpoint**

Create `netlify/functions/api-results-email-post.mjs`:

```js
import {apiHandler} from "../shared/middleware.mjs";

export const handler = apiHandler("POST", async (event) => {
    return {statusCode: 200, body: JSON.stringify({success: true})};
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run spec/netlify-functions/api-results-email-post.spec.js`
Expected: PASS

- [ ] **Step 5: Write failing test — returns 400 for invalid body**

Add to the describe block:

```js
it('returns 400 for missing required fields', async () => {
    const event = buildEvent({name: 'Alex'});
    const response = await handler(event);
    expect(response.statusCode).toBe(400);
});

it('returns 400 for invalid email', async () => {
    const event = buildEvent({...validPayload, email: 'not-an-email'});
    const response = await handler(event);
    expect(response.statusCode).toBe(400);
});

it('returns 400 for empty assignments', async () => {
    const event = buildEvent({...validPayload, assignments: []});
    const response = await handler(event);
    expect(response.statusCode).toBe(400);
});
```

- [ ] **Step 6: Run tests to verify they fail**

Run: `npx vitest run spec/netlify-functions/api-results-email-post.spec.js`
Expected: FAIL — no validation yet.

- [ ] **Step 7: Implement — add schema validation**

Update `netlify/functions/api-results-email-post.mjs`:

```js
import {z} from "zod";
import {apiHandler, validateBody} from "../shared/middleware.mjs";
import {badRequest, ok} from "../shared/responses.mjs";
import {sendNotificationEmail} from "../shared/giverNotification.mjs";

const resultsEmailRequestSchema = z.object({
    name: z.string(),
    email: z.email(),
    assignments: z.array(z.object({
        giver: z.string(),
        recipient: z.string(),
    })).min(1),
});

export const handler = apiHandler("POST", async (event) => {
    const {data, error} = validateBody(resultsEmailRequestSchema, event);
    if (error) return badRequest(error);

    await sendNotificationEmail(
        "results-summary",
        data.email,
        "Your Gift Exchange Results",
        {name: data.name, assignments: data.assignments}
    );

    return ok({success: true});
});
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `npx vitest run spec/netlify-functions/api-results-email-post.spec.js`
Expected: ALL PASS

- [ ] **Step 9: Write failing test — calls sendNotificationEmail correctly**

Add to the describe block. This test stubs `fetch` (which `sendNotificationEmail` uses in production) and verifies the handler calls it. In dev mode, `sendNotificationEmail` just logs, so we spy on `console.log`:

```js
it('sends email with correct template and parameters', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const event = buildEvent(validPayload);
    const response = await handler(event);

    expect(response.statusCode).toBe(200);
    expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('results-summary')
    );
    expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('alex@test.com')
    );
    consoleSpy.mockRestore();
});
```

- [ ] **Step 10: Run test to verify it passes**

Run: `npx vitest run spec/netlify-functions/api-results-email-post.spec.js`
Expected: PASS

- [ ] **Step 11: Commit**

```bash
git add netlify/functions/api-results-email-post.mjs spec/netlify-functions/api-results-email-post.spec.js
git commit -m "feat: add api-results-email-post endpoint"
```

---

## Chunk 4: SendResults Component — Collapsed & Confirmation States

### Task 6: SendResults component — collapsed state rendering

**Files:**
- Create: `src/exchange/components/EmailTable/SendResults.js`
- Modify: `src/exchange/index.js`
- Create: `spec/exchange/components/EmailTable/SendResults.spec.js`

- [ ] **Step 1: Write failing test — renders on RECIPIENTS_ASSIGNED in secret santa mode**

Create `spec/exchange/components/EmailTable/SendResults.spec.js`:

```js
import {beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import {installGivers, resetState} from "../../../specHelper";
import {assignRecipients, getState, nextStep, startExchange} from "../../../../src/exchange/state";
import {init} from "../../../../src/exchange/components/EmailTable/SendResults";
import {init as initSnackbar} from "../../../../src/Snackbar";
import {alex, whitney, hunter} from "../../../testData";

describe("SendResults", () => {
    vi.useFakeTimers();

    beforeAll(() => {
        initSnackbar();
        init();
    });

    beforeEach(() => {
        resetState();
        const existing = document.querySelector("#sendResults");
        if (existing) existing.remove();
    });

    function triggerSecretSantaAssign() {
        getState().isSecretSanta = true;
        installGivers([{...alex}, {...whitney}, {...hunter}]);
        assignRecipients([whitney.name, hunter.name, alex.name]);
    }

    describe("reactive rendering", () => {
        it("renders on RECIPIENTS_ASSIGNED when isSecretSanta", () => {
            triggerSecretSantaAssign();

            const el = document.querySelector("#sendResults");
            expect(el).not.toBeNull();
            expect(el.textContent).toContain("Don't want to send out emails to everyone?");
        });

        it("does not render on RECIPIENTS_ASSIGNED when not isSecretSanta", () => {
            getState().isSecretSanta = false;
            installGivers([{...alex}, {...whitney}]);
            assignRecipients([whitney.name, alex.name]);

            expect(document.querySelector("#sendResults")).toBeNull();
        });
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run spec/exchange/components/EmailTable/SendResults.spec.js`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Create SendResults component with collapsed state**

Create `src/exchange/components/EmailTable/SendResults.js`:

```js
import {ExchangeEvents as Events, exchangeEvents as stateEvents} from "../../state.js";
import {pushHTML, selectElement, addEventListener, setLoadingState, apiFetch} from "../../../utils.js";
import {showError, showSuccess} from "../../../Snackbar.js";

const sendResultsId = "sendResults";
const sendResultsBtnId = "sendResultsBtn";

let cachedParticipants;
let cachedAssignments;
let cachedIsSecretSanta;

function collapsedTemplate() {
    return `
    <div id="${sendResultsId}" class="sendEmails show">
        <p>Don't want to send out emails to everyone?</p>
        <button class="button" id="${sendResultsBtnId}">Send Me the Results</button>
    </div>`;
}

function render() {
    remove();
    pushHTML("body", collapsedTemplate());
    addEventListener(`#${sendResultsBtnId}`, "click", showConfirmation);
}

function remove() {
    selectElement(`#${sendResultsId}`)?.remove();
}

function hideAndRemove() {
    const el = selectElement(`#${sendResultsId}`);
    if (!el) return;
    el.classList.replace("show", "hide");
    setTimeout(() => el.remove(), 500);
}

function showConfirmation() {}

export function init() {
    stateEvents.on(Events.RECIPIENTS_ASSIGNED, ({participants, assignments, isSecretSanta}) => {
        cachedParticipants = participants;
        cachedAssignments = assignments;
        cachedIsSecretSanta = isSecretSanta;
        if (isSecretSanta) render();
    });
    stateEvents.on(Events.NEXT_STEP, ({step, participants, assignments, isSecretSanta}) => {
        cachedParticipants = participants;
        cachedAssignments = assignments;
        cachedIsSecretSanta = isSecretSanta;
        if (step === 4) render();
    });
    stateEvents.on(Events.EXCHANGE_STARTED, hideAndRemove);
    stateEvents.on(Events.EMAILS_ADDED, hideAndRemove);
}
```

- [ ] **Step 4: Register in index.js**

In `src/exchange/index.js`, add import after the `sendEmails` import (line 15):

```js
import * as sendResults from "./components/EmailTable/SendResults.js";
```

Add `sendResults.init();` after `sendEmails.init();` (after line 41).

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run spec/exchange/components/EmailTable/SendResults.spec.js`
Expected: PASS

- [ ] **Step 6: Write failing test — renders on NEXT_STEP at step 4**

Add to the `reactive rendering` describe block:

```js
it("renders on NEXT_STEP when step is 4", () => {
    installGivers([{...alex}, {...whitney}]);
    getState().step = 3;

    nextStep();

    const el = document.querySelector("#sendResults");
    expect(el).not.toBeNull();
});

it("does not render on NEXT_STEP when step is not 4", () => {
    installGivers([{...alex}, {...whitney}]);
    getState().step = 1;

    nextStep();

    expect(document.querySelector("#sendResults")).toBeNull();
});
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `npx vitest run spec/exchange/components/EmailTable/SendResults.spec.js`
Expected: PASS (implementation already handles step 4 check)

- [ ] **Step 8: Write failing test — animated hide on EXCHANGE_STARTED**

Add to the `reactive rendering` describe block:

```js
it("hides with animation on EXCHANGE_STARTED", () => {
    triggerSecretSantaAssign();
    const el = document.querySelector("#sendResults");
    expect(el).not.toBeNull();

    startExchange();

    expect(el.classList).toContain("hide");
    expect(el.classList).not.toContain("show");

    vi.advanceTimersByTime(500);

    expect(document.querySelector("#sendResults")).toBeNull();
});
```

- [ ] **Step 9: Run test to verify it passes**

Run: `npx vitest run spec/exchange/components/EmailTable/SendResults.spec.js`
Expected: PASS

- [ ] **Step 10: Write failing test — animated hide on EMAILS_ADDED**

Add import at top of test file:

```js
import {addEmailsToParticipants} from "../../../../src/exchange/state";
```

Add test:

```js
it("hides with animation on EMAILS_ADDED", () => {
    triggerSecretSantaAssign();
    const el = document.querySelector("#sendResults");
    expect(el).not.toBeNull();

    addEmailsToParticipants([
        {name: alex.name, email: alex.email, index: 0},
        {name: whitney.name, email: whitney.email, index: 1},
        {name: hunter.name, email: hunter.email, index: 2},
    ]);

    expect(el.classList).toContain("hide");

    vi.advanceTimersByTime(500);

    expect(document.querySelector("#sendResults")).toBeNull();
});
```

- [ ] **Step 11: Run test to verify it passes**

Run: `npx vitest run spec/exchange/components/EmailTable/SendResults.spec.js`
Expected: PASS

- [ ] **Step 12: Commit**

```bash
git add src/exchange/components/EmailTable/SendResults.js src/exchange/index.js spec/exchange/components/EmailTable/SendResults.spec.js
git commit -m "feat: add SendResults component with collapsed state and lifecycle"
```

### Task 7: SendResults — confirmation state

**Files:**
- Modify: `src/exchange/components/EmailTable/SendResults.js`
- Test: `spec/exchange/components/EmailTable/SendResults.spec.js`

- [ ] **Step 1: Write failing test — clicking button shows confirmation**

Add a new describe block in the test file:

```js
describe("confirmation state", () => {
    beforeEach(() => {
        triggerSecretSantaAssign();
    });

    it("shows confirmation warnings when Send Me the Results is clicked", () => {
        const btn = document.querySelector("#sendResultsBtn");
        btn.click();

        const el = document.querySelector("#sendResults");
        expect(el.textContent).toContain("Your exchange will not be saved");
        expect(el.textContent).toContain("save your results email or take a screenshot");
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run spec/exchange/components/EmailTable/SendResults.spec.js`
Expected: FAIL — `showConfirmation` is empty.

- [ ] **Step 3: Implement confirmation template and showConfirmation**

In `src/exchange/components/EmailTable/SendResults.js`, add:

```js
const confirmBtnId = "sendResultsConfirmBtn";
const cancelBtnId = "sendResultsCancelBtn";

function confirmationTemplate() {
    let html = `
    <div id="${sendResultsId}" class="sendEmails show">
        <p>Your exchange will not be saved. Recipients will not be able to look up wishlists or contact info. Be sure to save your results email or take a screenshot!</p>`;
    if (cachedIsSecretSanta) {
        html += `<p>This will reveal all gift exchange assignments on your screen.</p>`;
    }
    html += `
        <div>
            <button class="button" id="${confirmBtnId}">Continue</button>
            <button class="button" id="${cancelBtnId}">Cancel</button>
        </div>
    </div>`;
    return html;
}
```

Update `showConfirmation`:

```js
function showConfirmation() {
    remove();
    pushHTML("body", confirmationTemplate());
    addEventListener(`#${confirmBtnId}`, "click", showForm);
    addEventListener(`#${cancelBtnId}`, "click", () => {
        remove();
        render();
    });
}

function showForm() {}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run spec/exchange/components/EmailTable/SendResults.spec.js`
Expected: PASS

- [ ] **Step 5: Write failing test — secret santa mode shows reveal warning**

Add to the `confirmation state` describe block:

```js
it("shows reveal warning in secret santa mode", () => {
    document.querySelector("#sendResultsBtn").click();

    const el = document.querySelector("#sendResults");
    expect(el.textContent).toContain("reveal all gift exchange assignments");
});
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run spec/exchange/components/EmailTable/SendResults.spec.js`
Expected: PASS (implementation already includes this)

- [ ] **Step 7: Write failing test — non-secret-santa does NOT show reveal warning**

Add test. This requires a helper to trigger non-secret-santa rendering at step 4:

```js
it("does not show reveal warning in non-secret-santa mode", () => {
    // Remove existing and re-render as non-secret-santa
    remove();
    getState().isSecretSanta = false;
    installGivers([{...alex}, {...whitney}]);
    getState().step = 3;
    nextStep();

    document.querySelector("#sendResultsBtn").click();

    const el = document.querySelector("#sendResults");
    expect(el.textContent).not.toContain("reveal all gift exchange assignments");
});
```

Add a helper function near the top of the test file, and also import `remove` from the source (or use DOM query). Actually, since `remove` is not exported, just use DOM cleanup:

```js
function removeExisting() {
    const existing = document.querySelector("#sendResults");
    if (existing) existing.remove();
}
```

Update the test to call `removeExisting()` before setting up non-secret-santa state.

- [ ] **Step 8: Run test to verify it passes**

Run: `npx vitest run spec/exchange/components/EmailTable/SendResults.spec.js`
Expected: PASS

- [ ] **Step 9: Write failing test — Cancel returns to collapsed state**

Add to the `confirmation state` describe block:

```js
it("Cancel returns to collapsed state", () => {
    document.querySelector("#sendResultsBtn").click();
    expect(document.querySelector("#sendResults").textContent).toContain("will not be saved");

    document.querySelector("#sendResultsCancelBtn").click();

    const el = document.querySelector("#sendResults");
    expect(el.textContent).toContain("Don't want to send out emails to everyone?");
    expect(el.textContent).not.toContain("will not be saved");
});
```

- [ ] **Step 10: Run test to verify it passes**

Run: `npx vitest run spec/exchange/components/EmailTable/SendResults.spec.js`
Expected: PASS

- [ ] **Step 11: Commit**

```bash
git add src/exchange/components/EmailTable/SendResults.js spec/exchange/components/EmailTable/SendResults.spec.js
git commit -m "feat: add confirmation state to SendResults component"
```

---

## Chunk 5: SendResults — Expanded Form & Send

### Task 8: SendResults — expanded form with results table and send

**Files:**
- Modify: `src/exchange/components/EmailTable/SendResults.js`
- Test: `spec/exchange/components/EmailTable/SendResults.spec.js`

- [ ] **Step 1: Write failing test — Continue shows form with select and email input**

Add a new describe block:

```js
describe("expanded form", () => {
    beforeEach(() => {
        triggerSecretSantaAssign();
        document.querySelector("#sendResultsBtn").click();
        document.querySelector("#sendResultsConfirmBtn").click();
    });

    it("shows form with participant select and email input", () => {
        const select = document.querySelector("#sendResultsName");
        const emailInput = document.querySelector("#sendResultsEmail");

        expect(select).not.toBeNull();
        expect(emailInput).not.toBeNull();
        expect(select.options.length).toBe(4); // placeholder + 3 participants
        expect(select.options[1].textContent).toBe("Alex");
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run spec/exchange/components/EmailTable/SendResults.spec.js`
Expected: FAIL — `showForm` is empty.

- [ ] **Step 3: Implement expanded form template and showForm**

In `src/exchange/components/EmailTable/SendResults.js`, add:

```js
const sendResultsNameId = "sendResultsName";
const sendResultsEmailId = "sendResultsEmail";
const sendResultsSubmitId = "sendResultsSubmit";

function resultsTableHtml() {
    let html = '<div class="results-card"><h2>Results</h2><div class="results-header"><span>Giver</span><span></span><span>Recipient</span></div><div>';
    for (const a of cachedAssignments) {
        html += `<div class="result-row"><span>${a.giver}</span><span class="result-arrow">&#8594;</span><span>${a.recipient}</span></div>`;
    }
    html += '</div></div>';
    return html;
}

function formTemplate() {
    let html = `<div id="${sendResultsId}" class="sendEmails show">`;
    if (cachedIsSecretSanta) {
        html += resultsTableHtml();
    }
    html += `
        <label for="${sendResultsNameId}">Your name:</label>
        <select id="${sendResultsNameId}" required>
            <option disabled selected value="">-- Select your name --</option>
            ${cachedParticipants.map(p => `<option value="${p.name}">${p.name}</option>`).join("")}
        </select>
        <label for="${sendResultsEmailId}">Your email:</label>
        <input type="email" id="${sendResultsEmailId}" placeholder="your@email.com" required/>
        <button class="button" id="${sendResultsSubmitId}">Send</button>
    </div>`;
    return html;
}
```

Update `showForm`:

```js
function showForm() {
    remove();
    pushHTML("body", formTemplate());
    addEventListener(`#${sendResultsSubmitId}`, "click", submitResults);
}

async function submitResults() {}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run spec/exchange/components/EmailTable/SendResults.spec.js`
Expected: PASS

- [ ] **Step 5: Write failing test — shows results table in secret santa mode**

Add to the `expanded form` describe block:

```js
it("shows results table in secret santa mode", () => {
    const resultsCard = document.querySelector("#sendResults .results-card");
    expect(resultsCard).not.toBeNull();
    expect(resultsCard.textContent).toContain("Alex");
    expect(resultsCard.textContent).toContain("Whitney");
});
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run spec/exchange/components/EmailTable/SendResults.spec.js`
Expected: PASS

- [ ] **Step 7: Write failing test — does not show results table in non-secret-santa mode**

Add a describe block for non-secret-santa expanded form:

```js
describe("expanded form non-secret-santa", () => {
    beforeEach(() => {
        const existing = document.querySelector("#sendResults");
        if (existing) existing.remove();
        getState().isSecretSanta = false;
        installGivers([{...alex}, {...whitney}]);
        getState().step = 3;
        nextStep();
        document.querySelector("#sendResultsBtn").click();
        document.querySelector("#sendResultsConfirmBtn").click();
    });

    it("does not show results table", () => {
        expect(document.querySelector("#sendResults .results-card")).toBeNull();
    });

    it("shows form with select and email input", () => {
        expect(document.querySelector("#sendResultsName")).not.toBeNull();
        expect(document.querySelector("#sendResultsEmail")).not.toBeNull();
    });
});
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `npx vitest run spec/exchange/components/EmailTable/SendResults.spec.js`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add src/exchange/components/EmailTable/SendResults.js spec/exchange/components/EmailTable/SendResults.spec.js
git commit -m "feat: add expanded form with results table to SendResults"
```

### Task 9: SendResults — submit and API call

**Files:**
- Modify: `src/exchange/components/EmailTable/SendResults.js`
- Test: `spec/exchange/components/EmailTable/SendResults.spec.js`

- [ ] **Step 1: Write failing test — sends API request on submit**

Add a new describe block:

```js
describe("submit", () => {
    beforeEach(() => {
        global.fetch = vi.fn(() => Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({success: true})
        }));
        triggerSecretSantaAssign();
        document.querySelector("#sendResultsBtn").click();
        document.querySelector("#sendResultsConfirmBtn").click();
        // Fill form
        const select = document.querySelector("#sendResultsName");
        select.value = "Alex";
        document.querySelector("#sendResultsEmail").value = "alex@test.com";
    });

    it("sends request to api-results-email-post", () => {
        document.querySelector("#sendResultsSubmit").click();

        expect(global.fetch).toHaveBeenCalledWith(
            "/.netlify/functions/api-results-email-post",
            expect.objectContaining({method: "POST"})
        );
        const body = JSON.parse(global.fetch.mock.calls[0][1].body);
        expect(body.name).toBe("Alex");
        expect(body.email).toBe("alex@test.com");
        expect(body.assignments).toHaveLength(3);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run spec/exchange/components/EmailTable/SendResults.spec.js`
Expected: FAIL — `submitResults` is empty.

- [ ] **Step 3: Implement submitResults**

Update `submitResults` in `SendResults.js`:

```js
async function submitResults() {
    const nameSelect = selectElement(`#${sendResultsNameId}`);
    const emailInput = selectElement(`#${sendResultsEmailId}`);
    const name = nameSelect.value;
    const email = emailInput.value.trim();

    if (!name || name === "") {
        showError("Please select your name");
        return;
    }
    if (!email) {
        showError("Please enter your email");
        return;
    }

    setLoadingState(`#${sendResultsSubmitId}`);

    await apiFetch("/.netlify/functions/api-results-email-post", {
        method: "POST",
        body: {name, email, assignments: cachedAssignments},
        onSuccess: () => {
            showSuccess("Results sent!");
            hideAndRemove();
        },
        onError: (msg) => {
            showError(msg);
            const btn = selectElement(`#${sendResultsSubmitId}`);
            btn.textContent = "Send";
            btn.style.color = "";
        },
        fallbackMessage: "Failed to send results. Please try again.",
    });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run spec/exchange/components/EmailTable/SendResults.spec.js`
Expected: PASS

- [ ] **Step 5: Write failing test — shows loading state on submit**

Add to the `submit` describe block:

```js
it("shows loading state on submit button", () => {
    document.querySelector("#sendResultsSubmit").click();

    const btn = document.querySelector("#sendResultsSubmit");
    expect(btn.textContent).toBe("Loading...");
});
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run spec/exchange/components/EmailTable/SendResults.spec.js`
Expected: PASS (implementation already calls `setLoadingState`)

- [ ] **Step 7: Write failing test — shows success snackbar and removes component**

Add import for `shouldDisplaySuccessSnackbar` from specHelper at the top of the test file. Add to `submit` describe:

```js
it("shows success snackbar and hides component on success", async () => {
    document.querySelector("#sendResultsSubmit").click();

    await vi.waitFor(() => {
        shouldDisplaySuccessSnackbar("Results sent!");
    });
    const el = document.querySelector("#sendResults");
    expect(el.classList).toContain("hide");

    vi.advanceTimersByTime(500);
    expect(document.querySelector("#sendResults")).toBeNull();
});
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx vitest run spec/exchange/components/EmailTable/SendResults.spec.js`
Expected: PASS

- [ ] **Step 9: Write failing test — shows error snackbar on failure**

Add import for `shouldDisplayErrorSnackbar` from specHelper. Add to `submit` describe:

```js
it("shows error snackbar on API failure", async () => {
    global.fetch = vi.fn(() => Promise.resolve({
        ok: false,
        status: 500,
        json: () => Promise.resolve({error: "Server error"})
    }));
    document.querySelector("#sendResultsSubmit").click();

    const {serverErrorMessage} = await import("../../../../src/utils");
    await vi.waitFor(() => {
        shouldDisplayErrorSnackbar(serverErrorMessage);
    });
});
```

- [ ] **Step 10: Run test to verify it passes**

Run: `npx vitest run spec/exchange/components/EmailTable/SendResults.spec.js`
Expected: PASS

- [ ] **Step 11: Write failing test — re-enables button on failure**

Add to `submit` describe:

```js
it("re-enables send button on API failure", async () => {
    global.fetch = vi.fn(() => Promise.resolve({
        ok: false,
        status: 400,
        json: () => Promise.resolve({error: "Bad request"})
    }));
    document.querySelector("#sendResultsSubmit").click();

    await vi.waitFor(() => {
        const btn = document.querySelector("#sendResultsSubmit");
        expect(btn.textContent).toBe("Send");
    });
});
```

- [ ] **Step 12: Run test to verify it passes**

Run: `npx vitest run spec/exchange/components/EmailTable/SendResults.spec.js`
Expected: PASS

- [ ] **Step 13: Write failing test — validates name selection**

Add to `submit` describe:

```js
it("shows error when no name selected", () => {
    document.querySelector("#sendResultsName").value = "";
    document.querySelector("#sendResultsSubmit").click();

    shouldDisplayErrorSnackbar("Please select your name");
    expect(global.fetch).not.toHaveBeenCalled();
});
```

- [ ] **Step 14: Run test to verify it passes**

Run: `npx vitest run spec/exchange/components/EmailTable/SendResults.spec.js`
Expected: PASS

- [ ] **Step 15: Write failing test — validates email entry**

Add to `submit` describe:

```js
it("shows error when no email entered", () => {
    document.querySelector("#sendResultsEmail").value = "";
    document.querySelector("#sendResultsSubmit").click();

    shouldDisplayErrorSnackbar("Please enter your email");
    expect(global.fetch).not.toHaveBeenCalled();
});
```

- [ ] **Step 16: Run test to verify it passes**

Run: `npx vitest run spec/exchange/components/EmailTable/SendResults.spec.js`
Expected: PASS

- [ ] **Step 17: Commit**

```bash
git add src/exchange/components/EmailTable/SendResults.js spec/exchange/components/EmailTable/SendResults.spec.js
git commit -m "feat: add form submission and API call to SendResults"
```

---

## Chunk 6: Full Test Suite Run & Final Verification

### Task 10: Run full test suite and verify

**Files:** None (verification only)

- [ ] **Step 1: Run all frontend tests**

Run: `npx vitest run`
Expected: ALL PASS — no regressions in existing tests.

- [ ] **Step 2: Fix any failures**

If any tests fail, investigate and fix. Common issues:
- DOM pollution between tests (SendResults rendering in other test suites)
- Import order issues in index.js

- [ ] **Step 3: Final commit if fixes were needed**

```bash
git add -A
git commit -m "fix: resolve test suite regressions"
```
