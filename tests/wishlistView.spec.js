import {describe, it, expect, vi, beforeEach, afterEach} from "vitest";
import fs from "fs";
import path from "path";
import {JSDOM} from "jsdom";

const html = fs.readFileSync(
    path.resolve(__dirname, "../wishlist/view/index.html"),
    "utf8"
);

let dom;
let document;
let window;

function setupDOM(urlPath = "/wishlist/view/giver-token-123", query = "?exchange=exchange-id-456") {
    dom = new JSDOM(html, {url: `http://localhost${urlPath}${query}`});
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
    await import("../src/wishlistView.js");
}

describe("Wishlist View Page", () => {
    beforeEach(() => {
        vi.resetModules();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("loadWishlist", () => {
        it("fetches exchange data with token and exchangeId", async () => {
            setupDOM();
            mockFetch({
                body: {
                    recipientName: "Jane",
                    wishlists: [],
                    wishItems: [],
                },
            });
            mockSessionStorage();
            await loadModule();

            await vi.waitFor(() => {
                expect(window.fetch).toHaveBeenCalledWith(
                    "/.netlify/functions/api-exchange-get/exchange-id-456?token=giver-token-123"
                );
            });
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
            await loadModule();

            await vi.waitFor(() => {
                expect(document.getElementById("heading").textContent).toBe("Jane's Wishlist");
            });
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
            await loadModule();

            await vi.waitFor(() => {
                const content = document.getElementById("wishlist-content");
                expect(content.innerHTML).toContain("Amazon List");
                expect(content.innerHTML).toContain("Target List");
                const links = content.querySelectorAll("a");
                expect(links.length).toBe(2);
                expect(links[0].getAttribute("target")).toBe("_blank");
            });
        });

        it("renders wish items as clickable links", async () => {
            setupDOM();
            mockFetch({
                body: {
                    recipientName: "Jane",
                    wishlists: [],
                    wishItems: [
                        {url: "https://example.com/product1", title: "Product 1"},
                        {url: "https://example.com/product2", title: "Product 2"},
                    ],
                },
            });
            mockSessionStorage();
            await loadModule();

            await vi.waitFor(() => {
                const content = document.getElementById("wishlist-content");
                expect(content.innerHTML).toContain("Product 1");
                expect(content.innerHTML).toContain("Product 2");
                expect(content.innerHTML).toContain("Individual Items");
            });
        });

        it("shows empty message when no wishlist submitted", async () => {
            setupDOM();
            mockFetch({
                body: {
                    recipientName: "Jane",
                    wishlists: [],
                    wishItems: [],
                },
            });
            mockSessionStorage();
            await loadModule();

            await vi.waitFor(() => {
                const content = document.getElementById("wishlist-content");
                expect(content.innerHTML).toContain("No wishlist submitted yet.");
            });
        });
    });

    describe("error handling", () => {
        it("stores error in sessionStorage on 403", async () => {
            setupDOM();
            mockFetch({ok: false, status: 403, body: {error: "Access denied"}});
            mockSessionStorage();
            await loadModule();

            await vi.waitFor(() => {
                expect(window.sessionStorage.setItem).toHaveBeenCalledWith(
                    "snackbarError",
                    "You don't have access to view that participant's wish list"
                );
            });
        });

        it("stores error in sessionStorage when exchangeId is missing", async () => {
            setupDOM("/wishlist/view/giver-token-123", "");
            mockFetch({body: {}});
            mockSessionStorage();
            await loadModule();

            await vi.waitFor(() => {
                expect(window.sessionStorage.setItem).toHaveBeenCalledWith(
                    "snackbarError",
                    "Invalid link"
                );
            });
        });

        it("stores error in sessionStorage on non-403 error", async () => {
            setupDOM();
            mockFetch({ok: false, status: 500, body: {error: "Server error"}});
            mockSessionStorage();
            await loadModule();

            await vi.waitFor(() => {
                expect(window.sessionStorage.setItem).toHaveBeenCalledWith(
                    "snackbarError",
                    "Something went wrong"
                );
            });
        });

        it("does not fetch when token is empty", async () => {
            setupDOM("/wishlist/view/", "?exchange=exchange-id-456");
            mockFetch({body: {}});
            mockSessionStorage();
            await loadModule();

            await vi.waitFor(() => {
                expect(window.sessionStorage.setItem).toHaveBeenCalledWith(
                    "snackbarError",
                    "Invalid link"
                );
                expect(window.fetch).not.toHaveBeenCalled();
            });
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
            await loadModule();

            await vi.waitFor(() => {
                const content = document.getElementById("wishlist-content");
                expect(content.innerHTML).not.toContain("<img");
                expect(content.innerHTML).toContain("&lt;img");
            });
        });
    });
});
