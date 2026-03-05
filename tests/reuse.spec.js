import {describe, it, expect, vi, beforeEach, afterEach} from "vitest";
import fs from "fs";
import path from "path";
import {JSDOM} from "jsdom";

const html = fs.readFileSync(
    path.resolve(__dirname, "../pages/reuse/index.html"),
    "utf8"
);

let dom;
let document;
let window;

function setupDOM() {
    dom = new JSDOM(html, {url: "http://localhost/reuse"});
    document = dom.window.document;
    window = dom.window;
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

async function loadModule() {
    await import("../src/reuse.js");
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
        vi.resetModules();
        setupDOM();
        mockSessionStorage();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("search", () => {
        it("fetches exchanges by email when search button clicked", async () => {
            mockFetch({body: sampleExchanges});
            await loadModule();

            document.getElementById("reuse-email").value = "john@test.com";
            document.getElementById("reuse-search-btn").click();

            await vi.waitFor(() => {
                expect(window.fetch).toHaveBeenCalledWith(
                    "/.netlify/functions/api-exchange-search?email=john%40test.com"
                );
            });
        });

        it("fetches exchanges when Enter key pressed in email input", async () => {
            mockFetch({body: sampleExchanges});
            await loadModule();

            document.getElementById("reuse-email").value = "john@test.com";
            const event = new dom.window.KeyboardEvent("keydown", {key: "Enter", bubbles: true});
            document.getElementById("reuse-email").dispatchEvent(event);

            await vi.waitFor(() => {
                expect(window.fetch).toHaveBeenCalledWith(
                    "/.netlify/functions/api-exchange-search?email=john%40test.com"
                );
            });
        });

        it("does not search when email is empty", async () => {
            mockFetch({body: []});
            await loadModule();

            document.getElementById("reuse-email").value = "";
            document.getElementById("reuse-search-btn").click();

            expect(window.fetch).not.toHaveBeenCalled();
        });

        it("shows no results message when search fails", async () => {
            mockFetch({ok: false, status: 404, body: {error: "Not found"}});
            await loadModule();

            document.getElementById("reuse-email").value = "nobody@test.com";
            document.getElementById("reuse-search-btn").click();

            await vi.waitFor(() => {
                const results = document.getElementById("results-section");
                expect(results.innerHTML).toContain("No past exchanges found");
            });
        });
    });

    describe("render results", () => {
        it("displays exchange date and participant names", async () => {
            mockFetch({body: sampleExchanges});
            await loadModule();

            document.getElementById("reuse-email").value = "john@test.com";
            document.getElementById("reuse-search-btn").click();

            await vi.waitFor(() => {
                const results = document.getElementById("results-section");
                expect(results.innerHTML).toContain("John");
                expect(results.innerHTML).toContain("Jane");
                expect(results.innerHTML).toContain("Bob");
            });
        });

        it("displays house info when houses exist", async () => {
            mockFetch({body: sampleExchanges});
            await loadModule();

            document.getElementById("reuse-email").value = "john@test.com";
            document.getElementById("reuse-search-btn").click();

            await vi.waitFor(() => {
                const results = document.getElementById("results-section");
                expect(results.innerHTML).toContain("Smith Family");
            });
        });

        it("renders a Use This Exchange button per result", async () => {
            mockFetch({body: sampleExchanges});
            await loadModule();

            document.getElementById("reuse-email").value = "john@test.com";
            document.getElementById("reuse-search-btn").click();

            await vi.waitFor(() => {
                const buttons = document.querySelectorAll(".use-exchange-btn");
                expect(buttons.length).toBe(2);
            });
        });
    });

    describe("use exchange", () => {
        it("stores exchange data in sessionStorage when Use This Exchange clicked", async () => {
            mockFetch({body: [sampleExchanges[0]]});
            await loadModule();

            document.getElementById("reuse-email").value = "john@test.com";
            document.getElementById("reuse-search-btn").click();

            await vi.waitFor(() => {
                expect(document.querySelector(".use-exchange-btn")).not.toBeNull();
            });

            document.querySelector(".use-exchange-btn").click();

            expect(window.sessionStorage.setItem).toHaveBeenCalledWith(
                "reuseExchange",
                JSON.stringify(sampleExchanges[0])
            );
        });
    });

    describe("UI state", () => {
        it("disables search button and shows 'Searching...' during search", async () => {
            let resolvePromise;
            window.fetch = vi.fn(() => new Promise((resolve) => {
                resolvePromise = resolve;
            }));
            globalThis.fetch = window.fetch;

            await loadModule();

            document.getElementById("reuse-email").value = "john@test.com";
            document.getElementById("reuse-search-btn").click();

            const btn = document.getElementById("reuse-search-btn");
            expect(btn.textContent).toBe("Searching...");
            expect(btn.disabled).toBe(true);

            resolvePromise({
                ok: true,
                status: 200,
                json: () => Promise.resolve(sampleExchanges),
            });

            await vi.waitFor(() => {
                expect(btn.textContent).toBe("Search");
                expect(btn.disabled).toBe(false);
            });
        });
    });
});
