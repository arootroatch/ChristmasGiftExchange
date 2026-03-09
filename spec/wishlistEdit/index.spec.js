import {describe, it, expect, vi, beforeEach, afterEach} from "vitest";
import fs from "fs";
import path from "path";
import {JSDOM} from "jsdom";
import {serverErrorMessage} from "../../src/utils";

const html = fs.readFileSync(
    path.resolve(__dirname, "../../pages/wishlist/edit/index.html"),
    "utf8"
);

let dom;
let document;
let window;
let module;

function proxyWindow(domWindow) {
    const loc = domWindow.location;
    const locationMock = {
        pathname: loc.pathname,
        search: loc.search,
        href: loc.href,
    };
    return new Proxy(domWindow, {
        get(target, prop) {
            if (prop === "location") return locationMock;
            return Reflect.get(target, prop);
        },
    });
}

function setupDOM() {
    dom = new JSDOM(html, {url: "http://localhost/wishlist/edit/abc-123-token"});
    document = dom.window.document;
    window = proxyWindow(dom.window);
    globalThis.document = document;
    globalThis.window = window;
    globalThis.sessionStorage = window.sessionStorage;
}

function mockFetch(response) {
    window.fetch = vi.fn(() => Promise.resolve({
        ok: response.ok !== undefined ? response.ok : true,
        status: response.status || 200,
        json: () => Promise.resolve(response.body),
    }));
    globalThis.fetch = window.fetch;
}

async function loadModule() {
    const {main} = await import("../../src/wishlistEdit/index.js");
    main();
}

describe("Wishlist Edit Page", () => {
    beforeEach(() => {
        vi.resetModules();
        setupDOM();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("loadUser", () => {
        it("displays greeting with user name on successful load", async () => {
            mockFetch({
                body: {name: "John", wishlists: [], wishItems: []},
            });
            await loadModule();
            await vi.waitFor(() => {
                expect(document.getElementById("greeting").textContent).toBe(
                    "Hi John, add your wishlist!"
                );
            });
        });

        it("fetches user data using token from URL path", async () => {
            mockFetch({
                body: {name: "John", wishlists: [], wishItems: []},
            });
            await loadModule();
            await vi.waitFor(() => {
                expect(window.fetch).toHaveBeenCalledWith(
                    "/.netlify/functions/api-user-get/abc-123-token"
                );
            });
        });

        it("sets snackbar error and redirects when user not found", async () => {
            window.sessionStorage.clear();
            mockFetch({ok: false, status: 404, body: {error: "User not found"}});
            await loadModule();
            await vi.waitFor(() => {
                expect(window.sessionStorage.getItem("snackbarError")).toBe(
                    "Invalid wishlist link"
                );
            });
        });

        it("renders existing wishlists on load", async () => {
            mockFetch({
                body: {
                    name: "John",
                    wishlists: [{url: "https://amazon.com/list/1", title: "My Amazon List"}],
                    wishItems: [],
                },
            });
            await loadModule();
            await vi.waitFor(() => {
                const list = document.getElementById("wishlists-list");
                expect(list.innerHTML).toContain("My Amazon List");
                expect(list.innerHTML).toContain("https://amazon.com/list/1");
            });
        });

        it("renders existing wish items on load", async () => {
            mockFetch({
                body: {
                    name: "John",
                    wishlists: [],
                    wishItems: [{url: "https://example.com/product", title: "Cool Thing"}],
                },
            });
            await loadModule();
            await vi.waitFor(() => {
                const list = document.getElementById("items-list");
                expect(list.innerHTML).toContain("Cool Thing");
                expect(list.innerHTML).toContain("https://example.com/product");
            });
        });
    });

    describe("add wishlist", () => {
        it("adds a wishlist entry to the list", async () => {
            mockFetch({
                body: {name: "John", wishlists: [], wishItems: []},
            });
            await loadModule();
            await vi.waitFor(() => {
                expect(document.getElementById("greeting").textContent).toContain("John");
            });

            document.getElementById("wishlist-url").value = "https://amazon.com/list/2";
            document.getElementById("wishlist-title").value = "Birthday List";
            document.getElementById("add-wishlist-btn").click();

            const list = document.getElementById("wishlists-list");
            expect(list.innerHTML).toContain("Birthday List");
            expect(list.innerHTML).toContain("https://amazon.com/list/2");
        });

        it("clears inputs after adding", async () => {
            mockFetch({
                body: {name: "John", wishlists: [], wishItems: []},
            });
            await loadModule();
            await vi.waitFor(() => {
                expect(document.getElementById("greeting").textContent).toContain("John");
            });

            document.getElementById("wishlist-url").value = "https://amazon.com/list/2";
            document.getElementById("wishlist-title").value = "Birthday List";
            document.getElementById("add-wishlist-btn").click();

            expect(document.getElementById("wishlist-url").value).toBe("");
            expect(document.getElementById("wishlist-title").value).toBe("");
        });

        it("does not add when URL is empty", async () => {
            mockFetch({
                body: {name: "John", wishlists: [], wishItems: []},
            });
            await loadModule();
            await vi.waitFor(() => {
                expect(document.getElementById("greeting").textContent).toContain("John");
            });

            document.getElementById("wishlist-url").value = "";
            document.getElementById("add-wishlist-btn").click();

            const list = document.getElementById("wishlists-list");
            expect(list.innerHTML).toBe("");
        });

        it("uses URL as title when title is empty", async () => {
            mockFetch({
                body: {name: "John", wishlists: [], wishItems: []},
            });
            await loadModule();
            await vi.waitFor(() => {
                expect(document.getElementById("greeting").textContent).toContain("John");
            });

            document.getElementById("wishlist-url").value = "https://amazon.com/list/3";
            document.getElementById("wishlist-title").value = "";
            document.getElementById("add-wishlist-btn").click();

            const list = document.getElementById("wishlists-list");
            const link = list.querySelector("a");
            expect(link.textContent).toBe("https://amazon.com/list/3");
        });
    });

    describe("add item", () => {
        it("adds an item entry to the list", async () => {
            mockFetch({
                body: {name: "John", wishlists: [], wishItems: []},
            });
            await loadModule();
            await vi.waitFor(() => {
                expect(document.getElementById("greeting").textContent).toContain("John");
            });

            document.getElementById("item-url").value = "https://example.com/gadget";
            document.getElementById("item-title").value = "Cool Gadget";
            document.getElementById("add-item-btn").click();

            const list = document.getElementById("items-list");
            expect(list.innerHTML).toContain("Cool Gadget");
            expect(list.innerHTML).toContain("https://example.com/gadget");
        });

        it("clears inputs after adding", async () => {
            mockFetch({
                body: {name: "John", wishlists: [], wishItems: []},
            });
            await loadModule();
            await vi.waitFor(() => {
                expect(document.getElementById("greeting").textContent).toContain("John");
            });

            document.getElementById("item-url").value = "https://example.com/gadget";
            document.getElementById("item-title").value = "Cool Gadget";
            document.getElementById("add-item-btn").click();

            expect(document.getElementById("item-url").value).toBe("");
            expect(document.getElementById("item-title").value).toBe("");
        });

        it("does not add when URL is empty", async () => {
            mockFetch({
                body: {name: "John", wishlists: [], wishItems: []},
            });
            await loadModule();
            await vi.waitFor(() => {
                expect(document.getElementById("greeting").textContent).toContain("John");
            });

            document.getElementById("item-url").value = "";
            document.getElementById("add-item-btn").click();

            const list = document.getElementById("items-list");
            expect(list.innerHTML).toBe("");
        });
    });

    describe("delete entry", () => {
        it("removes a wishlist entry when delete button clicked", async () => {
            mockFetch({
                body: {
                    name: "John",
                    wishlists: [
                        {url: "https://amazon.com/list/1", title: "List 1"},
                        {url: "https://amazon.com/list/2", title: "List 2"},
                    ],
                    wishItems: [],
                },
            });
            await loadModule();
            await vi.waitFor(() => {
                expect(document.getElementById("wishlists-list").innerHTML).toContain("List 1");
            });

            const deleteBtn = document.querySelector(
                '#wishlists-list .delete-btn[data-index="0"]'
            );
            deleteBtn.click();

            const list = document.getElementById("wishlists-list");
            expect(list.innerHTML).not.toContain("List 1");
            expect(list.innerHTML).toContain("List 2");
        });

        it("removes an item entry when delete button clicked", async () => {
            mockFetch({
                body: {
                    name: "John",
                    wishlists: [],
                    wishItems: [
                        {url: "https://example.com/a", title: "Item A"},
                        {url: "https://example.com/b", title: "Item B"},
                    ],
                },
            });
            await loadModule();
            await vi.waitFor(() => {
                expect(document.getElementById("items-list").innerHTML).toContain("Item A");
            });

            const deleteBtn = document.querySelector(
                '#items-list .delete-btn[data-index="0"]'
            );
            deleteBtn.click();

            const list = document.getElementById("items-list");
            expect(list.innerHTML).not.toContain("Item A");
            expect(list.innerHTML).toContain("Item B");
        });
    });

    describe("save wishlist", () => {
        it("sends PUT request with wishlists and items", async () => {
            mockFetch({
                body: {name: "John", wishlists: [], wishItems: []},
            });
            await loadModule();
            await vi.waitFor(() => {
                expect(document.getElementById("greeting").textContent).toContain("John");
            });

            document.getElementById("wishlist-url").value = "https://amazon.com/list/1";
            document.getElementById("wishlist-title").value = "My List";
            document.getElementById("add-wishlist-btn").click();

            // Reset fetch mock for save call
            mockFetch({body: {success: true, notifiedGivers: false}});
            document.getElementById("save-wishlist-btn").click();

            await vi.waitFor(() => {
                expect(window.fetch).toHaveBeenCalledWith(
                    "/.netlify/functions/api-user-wishlist-put/abc-123-token",
                    expect.objectContaining({
                        method: "PUT",
                        body: JSON.stringify({
                            wishlists: [{url: "https://amazon.com/list/1", title: "My List"}],
                            wishItems: [],
                        }),
                    })
                );
            });
        });

        it("shows success snackbar on successful save", async () => {
            mockFetch({
                body: {name: "John", wishlists: [], wishItems: []},
            });
            await loadModule();
            await vi.waitFor(() => {
                expect(document.getElementById("greeting").textContent).toContain("John");
            });

            mockFetch({body: {success: true, notifiedGivers: false}});
            document.getElementById("save-wishlist-btn").click();

            await vi.waitFor(() => {
                const snackbar = document.getElementById("snackbar");
                expect(snackbar.textContent).toBe("Wishlist saved!");
                expect(snackbar.classList.contains("show")).toBe(true);
                expect(snackbar.style.color).toBe("rgb(25, 140, 10)");
            });
        });

        it("shows error snackbar on failed save", async () => {
            mockFetch({
                body: {name: "John", wishlists: [], wishItems: []},
            });
            await loadModule();
            await vi.waitFor(() => {
                expect(document.getElementById("greeting").textContent).toContain("John");
            });

            mockFetch({ok: false, status: 500, body: {error: "Server error"}});
            document.getElementById("save-wishlist-btn").click();

            await vi.waitFor(() => {
                const snackbar = document.getElementById("snackbar");
                expect(snackbar.textContent).toBe(serverErrorMessage);
                expect(snackbar.classList.contains("show")).toBe(true);
                expect(snackbar.style.color).toBe("rgb(179, 30, 32)");
            });
        });

        it("shows API error message on failed save", async () => {
            mockFetch({
                body: {name: "John", wishlists: [], wishItems: []},
            });
            await loadModule();
            await vi.waitFor(() => {
                expect(document.getElementById("greeting").textContent).toContain("John");
            });

            mockFetch({ok: false, status: 400, body: {error: "Database unavailable"}});
            document.getElementById("save-wishlist-btn").click();

            await vi.waitFor(() => {
                const snackbar = document.getElementById("snackbar");
                expect(snackbar.textContent).toBe("Database unavailable");
            });
        });

        it("shows generic error on network failure during save", async () => {
            mockFetch({
                body: {name: "John", wishlists: [], wishItems: []},
            });
            await loadModule();
            await vi.waitFor(() => {
                expect(document.getElementById("greeting").textContent).toContain("John");
            });

            window.fetch = vi.fn(() => Promise.reject(new Error("Network error")));
            globalThis.fetch = window.fetch;
            document.getElementById("save-wishlist-btn").click();

            await vi.waitFor(() => {
                const snackbar = document.getElementById("snackbar");
                expect(snackbar.textContent).toBe(serverErrorMessage);
            });
        });

        it("re-enables save button after error", async () => {
            mockFetch({
                body: {name: "John", wishlists: [], wishItems: []},
            });
            await loadModule();
            await vi.waitFor(() => {
                expect(document.getElementById("greeting").textContent).toContain("John");
            });

            mockFetch({ok: false, status: 500, body: {error: "Error"}});
            document.getElementById("save-wishlist-btn").click();

            await vi.waitFor(() => {
                const btn = document.getElementById("save-wishlist-btn");
                expect(btn.disabled).toBe(false);
                expect(btn.textContent).toBe("Save Wishlist");
            });
        });
    });

    describe("send contact info", () => {
        it("sends POST request with contact info", async () => {
            mockFetch({
                body: {name: "John", wishlists: [], wishItems: []},
            });
            await loadModule();
            await vi.waitFor(() => {
                expect(document.getElementById("greeting").textContent).toContain("John");
            });

            document.getElementById("contact-address").value = "123 Main St";
            document.getElementById("contact-phone").value = "555-1234";
            document.getElementById("contact-notes").value = "Ring the doorbell";

            mockFetch({body: {success: true}});
            document.getElementById("send-contact-btn").click();

            await vi.waitFor(() => {
                expect(window.fetch).toHaveBeenCalledWith(
                    "/.netlify/functions/api-user-contact-post/abc-123-token",
                    expect.objectContaining({
                        method: "POST",
                        body: JSON.stringify({
                            address: "123 Main St",
                            phone: "555-1234",
                            notes: "Ring the doorbell",
                        }),
                    })
                );
            });
        });

        it("shows success snackbar and clears form on success", async () => {
            mockFetch({
                body: {name: "John", wishlists: [], wishItems: []},
            });
            await loadModule();
            await vi.waitFor(() => {
                expect(document.getElementById("greeting").textContent).toContain("John");
            });

            document.getElementById("contact-address").value = "123 Main St";
            document.getElementById("contact-phone").value = "555-1234";
            document.getElementById("contact-notes").value = "Notes";

            mockFetch({body: {success: true}});
            document.getElementById("send-contact-btn").click();

            await vi.waitFor(() => {
                const snackbar = document.getElementById("snackbar");
                expect(snackbar.textContent).toBe(
                    "Contact info sent to your Secret Santa!"
                );
                expect(document.getElementById("contact-address").value).toBe("");
                expect(document.getElementById("contact-phone").value).toBe("");
                expect(document.getElementById("contact-notes").value).toBe("");
            });
        });

        it("shows API error message on failed send", async () => {
            mockFetch({
                body: {name: "John", wishlists: [], wishItems: []},
            });
            await loadModule();
            await vi.waitFor(() => {
                expect(document.getElementById("greeting").textContent).toContain("John");
            });

            document.getElementById("contact-address").value = "123 Main St";

            mockFetch({ok: false, status: 400, body: {error: "Email service down"}});
            document.getElementById("send-contact-btn").click();

            await vi.waitFor(() => {
                const snackbar = document.getElementById("snackbar");
                expect(snackbar.textContent).toBe("Email service down");
            });
        });

        it("shows generic error on network failure during send", async () => {
            mockFetch({
                body: {name: "John", wishlists: [], wishItems: []},
            });
            await loadModule();
            await vi.waitFor(() => {
                expect(document.getElementById("greeting").textContent).toContain("John");
            });

            document.getElementById("contact-address").value = "123 Main St";

            window.fetch = vi.fn(() => Promise.reject(new Error("Network error")));
            globalThis.fetch = window.fetch;
            document.getElementById("send-contact-btn").click();

            await vi.waitFor(() => {
                const snackbar = document.getElementById("snackbar");
                expect(snackbar.textContent).toBe(serverErrorMessage);
            });
        });

        it("re-enables send button after error", async () => {
            mockFetch({
                body: {name: "John", wishlists: [], wishItems: []},
            });
            await loadModule();
            await vi.waitFor(() => {
                expect(document.getElementById("greeting").textContent).toContain("John");
            });

            document.getElementById("contact-address").value = "123 Main St";

            mockFetch({ok: false, status: 500, body: {error: "Error"}});
            document.getElementById("send-contact-btn").click();

            await vi.waitFor(() => {
                const btn = document.getElementById("send-contact-btn");
                expect(btn.disabled).toBe(false);
                expect(btn.textContent).toBe("Send to My Secret Santa");
            });
        });

        it("shows error when all fields are empty", async () => {
            mockFetch({
                body: {name: "John", wishlists: [], wishItems: []},
            });
            await loadModule();
            await vi.waitFor(() => {
                expect(document.getElementById("greeting").textContent).toContain("John");
            });

            document.getElementById("contact-address").value = "";
            document.getElementById("contact-phone").value = "";
            document.getElementById("contact-notes").value = "";

            document.getElementById("send-contact-btn").click();

            const snackbar = document.getElementById("snackbar");
            expect(snackbar.textContent).toBe("Please fill in at least one field");
            expect(snackbar.classList.contains("show")).toBe(true);
            expect(snackbar.style.color).toBe("rgb(179, 30, 32)");
        });
    });

    describe("missing token", () => {
        function setupNoTokenDOM(url) {
            vi.resetModules();
            dom = new JSDOM(html, {url});
            document = dom.window.document;
            window = proxyWindow(dom.window);
            globalThis.document = document;
            globalThis.window = window;
            globalThis.sessionStorage = window.sessionStorage;
            window.fetch = vi.fn();
            globalThis.fetch = window.fetch;
            window.sessionStorage.clear();
        }

        it("sets snackbar error and does not fetch when URL is /wishlist/edit/", async () => {
            setupNoTokenDOM("http://localhost/wishlist/edit/");
            const {main} = await import("../../src/wishlistEdit/index.js");
            main();
            expect(window.fetch).not.toHaveBeenCalled();
            expect(window.sessionStorage.getItem("snackbarError")).toBe("Invalid wishlist link");
        });

        it("sets snackbar error and does not fetch when URL is /wishlist/edit", async () => {
            setupNoTokenDOM("http://localhost/wishlist/edit");
            const {main} = await import("../../src/wishlistEdit/index.js");
            main();
            expect(window.fetch).not.toHaveBeenCalled();
            expect(window.sessionStorage.getItem("snackbarError")).toBe("Invalid wishlist link");
        });

        it("sets snackbar error when API returns 404", async () => {
            setupNoTokenDOM("http://localhost/wishlist/edit/bad-token");
            window.fetch = vi.fn(() => Promise.resolve({
                ok: false, status: 404,
                json: () => Promise.resolve({error: "User not found"}),
            }));
            globalThis.fetch = window.fetch;
            const {main} = await import("../../src/wishlistEdit/index.js");
            main();
            await vi.waitFor(() => {
                expect(window.sessionStorage.getItem("snackbarError")).toBe("Invalid wishlist link");
            });
        });
    });

    describe("XSS prevention", () => {
        it("escapes HTML in wishlist titles", async () => {
            mockFetch({
                body: {
                    name: "John",
                    wishlists: [{url: "https://example.com", title: "<script>alert('xss')</script>"}],
                    wishItems: [],
                },
            });
            await loadModule();
            await vi.waitFor(() => {
                const list = document.getElementById("wishlists-list");
                expect(list.innerHTML).not.toContain("<script>");
                expect(list.innerHTML).toContain("&lt;script&gt;");
            });
        });

        it("escapes HTML in wishlist URLs used as href", async () => {
            mockFetch({
                body: {
                    name: "John",
                    wishlists: [{url: 'https://example.com/"><script>alert(1)</script>', title: "Test"}],
                    wishItems: [],
                },
            });
            await loadModule();
            await vi.waitFor(() => {
                const list = document.getElementById("wishlists-list");
                expect(list.innerHTML).not.toContain('href="https://example.com/"><script>');
            });
        });
    });
});
