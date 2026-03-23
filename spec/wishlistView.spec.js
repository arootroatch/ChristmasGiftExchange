import {describe, it, expect, vi, beforeEach, afterEach} from "vitest";
import fs from "fs";
import path from "path";
import {JSDOM} from "jsdom";
import {main} from "../src/wishlistView.js";

const html = fs.readFileSync(
    path.resolve(__dirname, "../pages/wishlist/view/index.html"),
    "utf8"
);

let dom;
let document;
let window;

const flush = () => new Promise(r => setTimeout(r, 0));

function setupDOM(urlPath = "/wishlist/view", query = "?exchange=exchange-id-456") {
    dom = new JSDOM(html, {url: `http://localhost${urlPath}${query}`});
    document = dom.window.document;

    const loc = dom.window.location;
    const locationMock = {
        pathname: loc.pathname,
        search: loc.search,
        href: loc.href,
    };

    const historyMock = {replaceState: vi.fn()};

    window = new Proxy(dom.window, {
        get(target, prop) {
            if (prop === "location") return locationMock;
            if (prop === "history") return historyMock;
            return Reflect.get(target, prop);
        },
    });

    globalThis.document = document;
    globalThis.window = window;
    globalThis.history = historyMock;
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
        const response = responses[callIndex] || responses[responses.length - 1];
        callIndex++;
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

describe("Wishlist View Page", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("loadWishlist", () => {
        it("sends GET with exchangeId as query param", async () => {
            setupDOM();
            mockFetch({
                body: {
                    recipientName: "Jane",
                    wishlists: [],
                    wishItems: [],
                },
            });
            mockSessionStorage();
            main();

            await flush();
            expect(window.fetch).toHaveBeenCalledWith(
                "/.netlify/functions/api-user-wishlist-get?exchangeId=exchange-id-456",
                expect.objectContaining({
                    method: "GET",
                })
            );
        });

        it("displays recipient name as heading", async () => {
            setupDOM();
            mockFetch({
                body: {
                    recipientName: "Jane",
                    wishlists: [{url: "https://amazon.com/list/1", title: "Jane's List"}],
                    wishItems: [],
                },
            });
            mockSessionStorage();
            main();

            await flush();
            expect(document.getElementById("heading").textContent).toBe("Jane's Wishlist");
        });

        it("renders wishlists as clickable links", async () => {
            setupDOM();
            mockFetch({
                body: {
                    recipientName: "Jane",
                    wishlists: [
                        {url: "https://amazon.com/list/1", title: "Amazon List"},
                        {url: "https://target.com/list/2", title: "Target List"},
                    ],
                    wishItems: [],
                },
            });
            mockSessionStorage();
            main();

            await flush();
            const content = document.getElementById("wishlist-content");
            expect(content.innerHTML).toContain("Amazon List");
            expect(content.innerHTML).toContain("Target List");
            const links = content.querySelectorAll("a");
            expect(links.length).toBe(2);
            expect(links[0].getAttribute("target")).toBe("_blank");
        });

        it("renders wish items as clickable links", async () => {
            setupDOM();
            mockFetch({
                body: {
                    recipientName: "Jane",
                    wishlists: [],
                    wishItems: [
                        {url: "https://example.com/product1", title: "Product 1", price: "$10"},
                        {url: "https://example.com/product2", title: "Product 2", price: "$20"},
                    ],
                },
            });
            mockSessionStorage();
            main();

            await flush();
            const content = document.getElementById("wishlist-content");
            expect(content.innerHTML).toContain("Product 1");
            expect(content.innerHTML).toContain("Product 2");
            expect(content.innerHTML).toContain("Individual Items");
        });

        it("shows styled empty state when no wishlist submitted", async () => {
            setupDOM();
            mockFetch({
                body: {
                    recipientName: "Jane",
                    wishlists: [],
                    wishItems: [],
                },
            });
            mockSessionStorage();
            main();

            await flush();
            const content = document.getElementById("wishlist-content");
            expect(content.innerHTML).toContain("Jane hasn't added any wishlists yet");
            expect(content.innerHTML).toContain("Check back later");
            expect(content.innerHTML).toContain("send you an email");
            expect(content.querySelector("section")).not.toBeNull();
        });
    });

    describe("auth gate", () => {
        it("shows auth gate on 401 response", async () => {
            setupDOM();
            mockFetch({ok: false, status: 401, body: {error: "Unauthorized"}});
            mockSessionStorage();
            main();

            await flush();
            expect(document.getElementById("auth-gate")).not.toBeNull();
            expect(document.getElementById("auth-send-code")).not.toBeNull();
        });

        it("shows auth gate on any non-server error response", async () => {
            setupDOM();
            mockFetch({ok: false, status: 403, body: {error: "Access denied"}});
            mockSessionStorage();
            main();

            await flush();
            expect(document.getElementById("auth-gate")).not.toBeNull();
        });

        it("retries GET after successful auth", async () => {
            setupDOM();
            mockFetchSequence([
                {ok: false, status: 401, body: {error: "Unauthorized"}},
                {ok: true, status: 200, body: {}},
                {ok: true, status: 200, body: {}},
                {ok: true, status: 200, body: {recipientName: "Jane", wishlists: [], wishItems: []}},
            ]);
            mockSessionStorage();
            main();

            await flush();
            expect(document.getElementById("auth-gate")).not.toBeNull();

            const emailInput = document.getElementById("auth-email");
            emailInput.value = "test@example.com";
            document.getElementById("auth-send-code").click();

            await flush();
            const codeInput = document.getElementById("auth-code");
            codeInput.value = "123456";
            document.getElementById("auth-verify-code").click();

            await flush();
            const lastCall = window.fetch.mock.calls[window.fetch.mock.calls.length - 1];
            expect(lastCall[0]).toBe("/.netlify/functions/api-user-wishlist-get?exchangeId=exchange-id-456");
        });

        it("removes spinner when showing auth gate", async () => {
            setupDOM();
            mockFetch({ok: false, status: 401, body: {error: "Unauthorized"}});
            mockSessionStorage();
            main();

            await flush();
            expect(document.getElementById("loading-spinner")).toBeNull();
        });
    });

    describe("legacy link fallback", () => {
        it("shows expired message and auth gate when URL has user param", async () => {
            setupDOM("/wishlist/view", "?exchange=exchange-id-456&user=some-token");
            mockFetch({body: {}});
            mockSessionStorage();
            main();

            await flush();
            expect(document.getElementById("auth-gate")).not.toBeNull();
            const container = document.getElementById("container");
            expect(container.innerHTML).toContain("This link has expired");
            expect(window.fetch).not.toHaveBeenCalled();
        });

        it("does not call API when legacy user param is present", async () => {
            setupDOM("/wishlist/view", "?exchange=exchange-id-456&user=some-token");
            mockFetch({body: {}});
            mockSessionStorage();
            main();

            await flush();
            expect(window.fetch).not.toHaveBeenCalled();
        });
    });

    describe("exchange param preserved", () => {
        it("preserves exchange param through auth gate flow", async () => {
            setupDOM("/wishlist/view", "?exchange=my-exchange-id");
            mockFetchSequence([
                {ok: false, status: 401, body: {error: "Unauthorized"}},
                {ok: true, status: 200, body: {}},
                {ok: true, status: 200, body: {}},
                {ok: true, status: 200, body: {recipientName: "Jane", wishlists: [], wishItems: []}},
            ]);
            mockSessionStorage();
            main();

            await flush();
            expect(document.getElementById("auth-gate")).not.toBeNull();

            const emailInput = document.getElementById("auth-email");
            emailInput.value = "test@example.com";
            document.getElementById("auth-send-code").click();

            await flush();
            const codeInput = document.getElementById("auth-code");
            codeInput.value = "123456";
            document.getElementById("auth-verify-code").click();

            await flush();
            const lastCall = window.fetch.mock.calls[window.fetch.mock.calls.length - 1];
            expect(lastCall[0]).toBe("/.netlify/functions/api-user-wishlist-get?exchangeId=my-exchange-id");
        });
    });

    describe("error handling", () => {
        it("stores error in sessionStorage when exchangeId is missing", async () => {
            setupDOM("/wishlist/view", "");
            mockFetch({body: {}});
            mockSessionStorage();
            main();

            await flush();
            expect(window.sessionStorage.setItem).toHaveBeenCalledWith(
                "snackbarError",
                "Invalid link"
            );
        });

        it("shows auth gate on server error", async () => {
            setupDOM();
            mockFetch({ok: false, status: 500, body: {error: "Server error"}});
            mockSessionStorage();
            main();

            await flush();
            expect(document.getElementById("auth-gate")).not.toBeNull();
        });

        it("shows auth gate on network failure", async () => {
            setupDOM();
            mockSessionStorage();
            window.fetch = vi.fn(() => Promise.reject(new Error("Network error")));
            globalThis.fetch = window.fetch;
            main();

            await flush();
            expect(document.getElementById("auth-gate")).not.toBeNull();
        });

        it("does not fetch when exchangeId is empty", async () => {
            setupDOM("/wishlist/view", "?exchange=");
            mockFetch({body: {}});
            mockSessionStorage();
            main();

            await flush();
            expect(window.sessionStorage.setItem).toHaveBeenCalledWith(
                "snackbarError",
                "Invalid link"
            );
            expect(window.fetch).not.toHaveBeenCalled();
        });
    });

    describe("XSS prevention", () => {
        it("escapes HTML in wishlist titles", async () => {
            setupDOM();
            mockFetch({
                body: {
                    recipientName: "Jane",
                    wishlists: [{url: "https://example.com", title: "<img src=x onerror=alert(1)>"}],
                    wishItems: [],
                },
            });
            mockSessionStorage();
            main();

            await flush();
            const content = document.getElementById("wishlist-content");
            expect(content.innerHTML).not.toContain("<img");
            expect(content.innerHTML).toContain("&lt;img");
        });
    });
});
