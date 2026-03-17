import {describe, it, expect, vi, beforeEach} from "vitest";
import {pageRoutesPlugin} from "../src/vitePageRoutes.js";

vi.mock("fs", () => {
    const mock = {
        existsSync: vi.fn(() => true),
        readdirSync: vi.fn(),
        cpSync: vi.fn(),
        rmSync: vi.fn(),
    };
    return {...mock, default: mock};
});

import {existsSync, readdirSync, cpSync, rmSync} from "fs";

describe("pageRoutesPlugin", () => {
    let plugin;

    beforeEach(() => {
        plugin = pageRoutesPlugin();
        vi.clearAllMocks();
    });

    describe("config hook", () => {
        function mockPagesDir() {
            existsSync.mockReturnValue(true);
            readdirSync.mockImplementation((dir) => {
                const d = dir.replace("/project/", "");
                const dirs = {
                    "pages": [
                        {name: "reuse", isDirectory: () => true},
                        {name: "wishlist", isDirectory: () => true},
                    ],
                    "pages/reuse": [{name: "index.html", isDirectory: () => false}],
                    "pages/wishlist": [
                        {name: "edit", isDirectory: () => true},
                        {name: "view", isDirectory: () => true},
                    ],
                    "pages/wishlist/edit": [{name: "index.html", isDirectory: () => false}],
                    "pages/wishlist/view": [{name: "index.html", isDirectory: () => false}],
                };
                return dirs[d] || [];
            });
        }

        it("generates rollup inputs from page directory structure", () => {
            mockPagesDir();

            const result = plugin.config({root: "/project"});

            expect(result.build.rollupOptions.input).toEqual({
                main: "/project/index.html",
                reuse: "/project/pages/reuse/index.html",
                wishlistEdit: "/project/pages/wishlist/edit/index.html",
                wishlistView: "/project/pages/wishlist/view/index.html",
            });
        });
    });

    describe("configureServer hook", () => {
        function createMockServer(url) {
            const req = {url};
            const res = {};
            const next = vi.fn();
            const middlewares = {use: vi.fn()};
            return {req, res, next, middlewares};
        }

        function getMiddleware(server) {
            plugin.config({root: "/project"});
            plugin.configureServer(server);
            return server.middlewares.use.mock.calls[0][0];
        }

        beforeEach(() => {
            existsSync.mockReturnValue(true);
            readdirSync.mockImplementation((dir) => {
                const d = dir.replace("/project/", "");
                const dirs = {
                    "pages": [
                        {name: "reuse", isDirectory: () => true},
                        {name: "wishlist", isDirectory: () => true},
                    ],
                    "pages/reuse": [{name: "index.html", isDirectory: () => false}],
                    "pages/wishlist": [{name: "edit", isDirectory: () => true}],
                    "pages/wishlist/edit": [{name: "index.html", isDirectory: () => false}],
                    "dev": [{name: "emails", isDirectory: () => true}],
                    "dev/emails": [{name: "index.html", isDirectory: () => false}],
                };
                return dirs[d] || [];
            });
        });

        it("rewrites /reuse to /pages/reuse/index.html", () => {
            const {req, res, next, middlewares} = createMockServer("/reuse");
            const middleware = getMiddleware({middlewares});

            middleware(req, res, next);

            expect(req.url).toBe("/pages/reuse/index.html");
            expect(next).toHaveBeenCalled();
        });

        it("rewrites /reuse/ (trailing slash) to /pages/reuse/index.html", () => {
            const {req, res, next, middlewares} = createMockServer("/reuse/");
            const middleware = getMiddleware({middlewares});

            middleware(req, res, next);

            expect(req.url).toBe("/pages/reuse/index.html");
            expect(next).toHaveBeenCalled();
        });

        it("preserves query strings through rewrite", () => {
            const {req, res, next, middlewares} = createMockServer("/wishlist/edit?user=abc-123");
            const middleware = getMiddleware({middlewares});

            middleware(req, res, next);

            expect(req.url).toBe("/pages/wishlist/edit/index.html?user=abc-123");
            expect(next).toHaveBeenCalled();
        });

        it("skips requests with file extensions", () => {
            const {req, res, next, middlewares} = createMockServer("/assets/style.css");
            const middleware = getMiddleware({middlewares});

            middleware(req, res, next);

            expect(req.url).toBe("/assets/style.css");
            expect(next).toHaveBeenCalled();
        });

        it("rewrites dev routes for local dev only", () => {
            const {req, res, next, middlewares} = createMockServer("/dev/emails");
            const middleware = getMiddleware({middlewares});

            middleware(req, res, next);

            expect(req.url).toBe("/dev/emails/index.html");
            expect(next).toHaveBeenCalled();
        });

        it("does not rewrite unmatched paths", () => {
            const {req, res, next, middlewares} = createMockServer("/unknown");
            const middleware = getMiddleware({middlewares});

            middleware(req, res, next);

            expect(req.url).toBe("/unknown");
            expect(next).toHaveBeenCalled();
        });
    });

    describe("closeBundle hook", () => {
        beforeEach(() => {
            existsSync.mockReturnValue(true);
            readdirSync.mockImplementation((dir) => {
                const d = dir.replace("/project/", "");
                const dirs = {
                    "pages": [{name: "reuse", isDirectory: () => true}],
                    "pages/reuse": [{name: "index.html", isDirectory: () => false}],
                };
                return dirs[d] || [];
            });
            plugin.config({root: "/project"});
        });

        it("moves dist/pages/* to dist/ top-level and removes dist/pages/", () => {
            readdirSync.mockReturnValue([
                {name: "reuse", isDirectory: () => true},
                {name: "wishlist", isDirectory: () => true},
            ]);

            plugin.closeBundle();

            expect(cpSync).toHaveBeenCalledWith("/project/dist/pages/reuse", "/project/dist/reuse", {recursive: true});
            expect(cpSync).toHaveBeenCalledWith("/project/dist/pages/wishlist", "/project/dist/wishlist", {recursive: true});
            expect(rmSync).toHaveBeenCalledWith("/project/dist/pages", {recursive: true});
        });

        it("does nothing when dist/pages/ does not exist", () => {
            existsSync.mockReturnValue(false);

            plugin.closeBundle();

            expect(cpSync).not.toHaveBeenCalled();
            expect(rmSync).not.toHaveBeenCalled();
        });
    });
});
