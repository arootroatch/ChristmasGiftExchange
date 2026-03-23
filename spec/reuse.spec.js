import {describe, it, expect, vi, beforeEach, afterEach} from "vitest";
import fs from "fs";
import path from "path";
import {JSDOM} from "jsdom";
import {serverErrorMessage} from "../src/utils";
import {main} from "../src/reuse.js";

const html = fs.readFileSync(
    path.resolve(__dirname, "../pages/reuse/index.html"),
    "utf8"
);

let dom;
let document;
let window;

const flush = () => new Promise(r => setTimeout(r, 0));

function setupDOM() {
    dom = new JSDOM(html, {url: "http://localhost/reuse"});
    document = dom.window.document;

    const loc = dom.window.location;
    const locationMock = {
        pathname: loc.pathname,
        search: loc.search,
        href: loc.href,
    };

    window = new Proxy(dom.window, {
        get(target, prop) {
            if (prop === "location") return locationMock;
            return Reflect.get(target, prop);
        },
    });

    globalThis.document = document;
    globalThis.window = window;
}

function mockFetch(response) {
    window.fetch = vi.fn(() => Promise.resolve({
        ok: response.ok !== undefined ? response.ok : true,
        status: response.status || 200,
        json: () => Promise.resolve(response.body),
    }));
    globalThis.fetch = window.fetch;
}

function mockFetchSequence(responses) {
    let callIndex = 0;
    const fn = vi.fn(() => {
        const response = responses[callIndex++] || responses[responses.length - 1];
        return Promise.resolve({
            ok: response.ok !== undefined ? response.ok : true,
            status: response.status || 200,
            json: () => Promise.resolve(response.body),
        });
    });
    window.fetch = fn;
    globalThis.fetch = fn;
}

function mockSessionStorage() {
    const store = {};
    const mock = {
        getItem: vi.fn((key) => store[key] || null),
        setItem: vi.fn((key, value) => { store[key] = value; }),
        removeItem: vi.fn((key) => { delete store[key]; }),
    };
    Object.defineProperty(window, "sessionStorage", {
        configurable: true,
        value: mock,
    });
    globalThis.sessionStorage = mock;
}

async function completeAuthGate() {
    mockFetchSequence([
        {body: {ok: true}},
        {body: {ok: true}},
    ]);

    document.getElementById("auth-email").value = "test@example.com";
    document.getElementById("auth-send-code").click();
    await flush();

    document.getElementById("auth-code").value = "123456";
    document.getElementById("auth-verify-code").click();
    await flush();
}

const sampleExchanges = [
    {
        exchangeId: "ex-1",
        createdAt: "2025-12-25T00:00:00.000Z",
        isSecretSanta: true,
        participantNames: ["John", "Jane", "Bob"],
        houses: [{name: "Smith Family", members: ["John", "Jane"]}],
        participants: [
            {name: "John", email: "john@test.com"},
            {name: "Jane", email: "jane@test.com"},
            {name: "Bob", email: "bob@test.com"},
        ],
        assignments: [
            {giver: "John", recipient: "Bob"},
            {giver: "Jane", recipient: "John"},
            {giver: "Bob", recipient: "Jane"},
        ],
    },
    {
        exchangeId: "ex-2",
        createdAt: "2024-12-25T00:00:00.000Z",
        isSecretSanta: false,
        participantNames: ["Alice", "Bob"],
        houses: [],
        participants: [
            {name: "Alice", email: "alice@test.com"},
            {name: "Bob", email: "bob@test.com"},
        ],
        assignments: [
            {giver: "Alice", recipient: "Bob"},
            {giver: "Bob", recipient: "Alice"},
        ],
    },
];

describe("Reuse Exchange Page", () => {
    beforeEach(() => {
        setupDOM();
        mockSessionStorage();
        main();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("auth gate", () => {
        it("renders auth gate with email input", () => {
            expect(document.getElementById("auth-gate")).not.toBeNull();
            expect(document.getElementById("auth-email")).not.toBeNull();
        });

        it("search section is hidden before auth", () => {
            expect(document.getElementById("search-section").style.display).toBe("none");
        });

        it("sends verification code when Send button clicked", async () => {
            mockFetch({body: {ok: true}});

            document.getElementById("auth-email").value = "test@example.com";
            document.getElementById("auth-send-code").click();

            await flush();
            expect(window.fetch).toHaveBeenCalledWith(
                "/.netlify/functions/api-auth-code-post",
                expect.objectContaining({method: "POST"}),
            );
        });

        it("shows code step after sending code", async () => {
            mockFetch({body: {ok: true}});

            document.getElementById("auth-email").value = "test@example.com";
            document.getElementById("auth-send-code").click();

            await flush();
            expect(document.getElementById("auth-email-step").style.display).toBe("none");
            expect(document.getElementById("auth-code-step").style.display).toBe("");
        });

        it("shows search section after successful verification", async () => {
            await completeAuthGate();

            expect(document.getElementById("auth-gate").style.display).toBe("none");
            expect(document.getElementById("search-section").style.display).toBe("");
        });

        it("shows snackbar on auth error", async () => {
            mockFetch({ok: false, status: 400, body: {error: "Invalid email"}});

            document.getElementById("auth-email").value = "bad@example.com";
            document.getElementById("auth-send-code").click();

            await flush();
            const snackbar = document.getElementById("snackbar");
            expect(snackbar.textContent).toBe("Invalid email");
            expect(snackbar.classList.contains("show")).toBe(true);
        });
    });

    describe("search", () => {
        it("GETs from api-my-exchanges-get with cookie auth when search button clicked", async () => {
            await completeAuthGate();
            mockFetch({body: sampleExchanges});

            document.getElementById("reuse-search-btn").click();

            await flush();
            expect(window.fetch).toHaveBeenCalledWith(
                "/.netlify/functions/api-my-exchanges-get",
                expect.objectContaining({
                    method: "GET",
                })
            );
        });

        it("shows snackbar error when no exchanges found", async () => {
            await completeAuthGate();
            mockFetch({body: []});

            document.getElementById("reuse-search-btn").click();

            await flush();
            const snackbar = document.getElementById("snackbar");
            expect(snackbar.textContent).toBe("No past exchanges found");
            expect(snackbar.classList.contains("show")).toBe(true);
            expect(snackbar.style.color).toBe("rgb(255, 255, 255)");
        });

        it("shows snackbar error when fetch fails", async () => {
            await completeAuthGate();
            mockFetch({ok: false, status: 500, body: {error: "Server error"}});

            document.getElementById("reuse-search-btn").click();

            await flush();
            const snackbar = document.getElementById("snackbar");
            expect(snackbar.textContent).toBe(serverErrorMessage);
            expect(snackbar.classList.contains("show")).toBe(true);
            expect(snackbar.style.color).toBe("rgb(255, 255, 255)");
        });

        it("shows generic error when non-ok response has no error field", async () => {
            await completeAuthGate();
            mockFetch({ok: false, status: 400, body: {}});

            document.getElementById("reuse-search-btn").click();

            await flush();
            const snackbar = document.getElementById("snackbar");
            expect(snackbar.textContent).toBe("Failed to search exchanges. Please try again.");
        });

        it("shows generic error on network failure", async () => {
            await completeAuthGate();
            window.fetch = vi.fn(() => Promise.reject(new Error("Network error")));
            globalThis.fetch = window.fetch;

            document.getElementById("reuse-search-btn").click();

            await flush();
            const snackbar = document.getElementById("snackbar");
            expect(snackbar.textContent).toBe(serverErrorMessage);
        });
    });

    describe("render results", () => {
        it("displays exchange date and participant names", async () => {
            await completeAuthGate();
            mockFetch({body: sampleExchanges});

            document.getElementById("reuse-search-btn").click();

            await flush();
            const results = document.getElementById("results-section");
            expect(results.innerHTML).toContain("John");
            expect(results.innerHTML).toContain("Jane");
            expect(results.innerHTML).toContain("Bob");
        });

        it("displays house info when houses exist", async () => {
            await completeAuthGate();
            mockFetch({body: sampleExchanges});

            document.getElementById("reuse-search-btn").click();

            await flush();
            const results = document.getElementById("results-section");
            expect(results.innerHTML).toContain("Smith Family");
        });

        it("renders a Use This Exchange button per result", async () => {
            await completeAuthGate();
            mockFetch({body: sampleExchanges});

            document.getElementById("reuse-search-btn").click();

            await flush();
            const buttons = document.querySelectorAll(".use-exchange-btn");
            expect(buttons.length).toBe(2);
        });
    });

    describe("use exchange", () => {
        it("stores exchange data in sessionStorage when Use This Exchange clicked", async () => {
            await completeAuthGate();
            mockFetch({body: [sampleExchanges[0]]});

            document.getElementById("reuse-search-btn").click();

            await flush();
            expect(document.querySelector(".use-exchange-btn")).not.toBeNull();

            document.querySelector(".use-exchange-btn").click();

            expect(window.sessionStorage.setItem).toHaveBeenCalledWith(
                "reuseExchange",
                JSON.stringify(sampleExchanges[0])
            );
        });
    });

    describe("UI state", () => {
        it("disables search button and shows 'Searching...' during search", async () => {
            await completeAuthGate();

            let resolvePromise;
            window.fetch = vi.fn(() => new Promise((resolve) => {
                resolvePromise = resolve;
            }));
            globalThis.fetch = window.fetch;

            document.getElementById("reuse-search-btn").click();

            const btn = document.getElementById("reuse-search-btn");
            expect(btn.textContent).toBe("Searching...");
            expect(btn.disabled).toBe(true);

            resolvePromise({
                ok: true,
                status: 200,
                json: () => Promise.resolve(sampleExchanges),
            });

            await flush();
            expect(btn.textContent).toBe("Search");
            expect(btn.disabled).toBe(false);
        });
    });
});
