import {describe, it, expect, vi, beforeEach, afterEach} from "vitest";
import fs from "fs";
import path from "path";
import {JSDOM} from "jsdom";
import {serverErrorMessage} from "../src/utils";
import {main} from "../src/wishlistView.js";

const html = fs.readFileSync(
    path.resolve(__dirname, "../pages/wishlist/view/index.html"),
    "utf8"
);

let dom;
let document;
let window;

const flush = () => new Promise(r => setTimeout(r, 0));

function setupDOM(urlPath = "/wishlist/view", query = "?user=giver-token-123&exchange=exchange-id-456") {
    dom = new JSDOM(html, {url: `http://localhost${urlPath}${query}`});
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
            main();

            await flush();
            expect(window.fetch).toHaveBeenCalledWith(
                "/.netlify/functions/api-user-wishlist-get/exchange-id-456?token=giver-token-123",
                expect.objectContaining({})
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

    describe("error handling", () => {
        it("stores error in sessionStorage on 403", async () => {
            setupDOM();
            mockFetch({ok: false, status: 403, body: {error: "Access denied"}});
            mockSessionStorage();
            main();

            await flush();
            expect(window.sessionStorage.setItem).toHaveBeenCalledWith(
                "snackbarError",
                "Access denied"
            );
        });

        it("stores error in sessionStorage when exchangeId is missing", async () => {
            setupDOM("/wishlist/view", "?user=giver-token-123");
            mockFetch({body: {}});
            mockSessionStorage();
            main();

            await flush();
            expect(window.sessionStorage.setItem).toHaveBeenCalledWith(
                "snackbarError",
                "Invalid link"
            );
        });

        it("stores error in sessionStorage on non-403 error", async () => {
            setupDOM();
            mockFetch({ok: false, status: 500, body: {error: "Server error"}});
            mockSessionStorage();
            main();

            await flush();
            expect(window.sessionStorage.setItem).toHaveBeenCalledWith(
                "snackbarError",
                serverErrorMessage
            );
        });

        it("stores error in sessionStorage on network failure", async () => {
            setupDOM();
            mockSessionStorage();
            window.fetch = vi.fn(() => Promise.reject(new Error("Network error")));
            globalThis.fetch = window.fetch;
            main();

            await flush();
            expect(window.sessionStorage.setItem).toHaveBeenCalledWith(
                "snackbarError",
                serverErrorMessage
            );
        });

        it("shows generic error when non-ok response has no error field", async () => {
            setupDOM();
            mockFetch({ok: false, status: 400, body: {}});
            mockSessionStorage();
            main();

            await flush();
            expect(window.sessionStorage.setItem).toHaveBeenCalledWith(
                "snackbarError",
                "Something went wrong. Please try again."
            );
        });

        it("does not fetch when token is empty", async () => {
            setupDOM("/wishlist/view", "?user=&exchange=exchange-id-456");
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
