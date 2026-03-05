import {beforeAll, describe, expect, it, vi} from "vitest";
import {multiPagePlugin} from "../src/viteMultiPagePlugin.js";

describe("multiPagePlugin", () => {
    let middleware;

    function applyMiddleware(url) {
        const req = {url};
        const res = {};
        const next = vi.fn();
        middleware(req, res, next);
        return {req, next};
    }

    function setupMiddleware() {
        const plugin = multiPagePlugin();
        const server = {middlewares: {use: vi.fn()}};
        plugin.configureServer(server);
        return server.middlewares.use.mock.calls[0][0];
    }

    beforeAll(() => {
        middleware = setupMiddleware();
    });

    it("rewrites /reuse to pages/reuse/index.html", () => {
        const {req, next} = applyMiddleware("/reuse");
        expect(req.url).toBe("/pages/reuse/index.html");
        expect(next).toHaveBeenCalled();
    });

    it("rewrites /reuse/ to pages/reuse/index.html", () => {
        const {req, next} = applyMiddleware("/reuse/");
        expect(req.url).toBe("/pages/reuse/index.html");
        expect(next).toHaveBeenCalled();
    });

    it("rewrites /wishlist/edit to pages/wishlist/edit/index.html", () => {
        const {req} = applyMiddleware("/wishlist/edit");
        expect(req.url).toBe("/pages/wishlist/edit/index.html");
    });

    it("rewrites /wishlist/edit/ to pages/wishlist/edit/index.html", () => {
        const {req} = applyMiddleware("/wishlist/edit/");
        expect(req.url).toBe("/pages/wishlist/edit/index.html");
    });

    it("rewrites /wishlist/edit/some-token to pages/wishlist/edit/index.html", () => {
        const {req} = applyMiddleware("/wishlist/edit/abc-123");
        expect(req.url).toBe("/pages/wishlist/edit/index.html");
    });

    it("rewrites /wishlist/view to pages/wishlist/view/index.html", () => {
        const {req} = applyMiddleware("/wishlist/view");
        expect(req.url).toBe("/pages/wishlist/view/index.html");
    });

    it("rewrites /wishlist/view/some-token to pages/wishlist/view/index.html", () => {
        const {req} = applyMiddleware("/wishlist/view/token-xyz");
        expect(req.url).toBe("/pages/wishlist/view/index.html");
    });

    it("preserves query params during rewrite", () => {
        const {req} = applyMiddleware("/wishlist/view/token?exchange=ex123");
        expect(req.url).toBe("/pages/wishlist/view/index.html");
    });

    it("does not rewrite the root path", () => {
        const {req} = applyMiddleware("/");
        expect(req.url).toBe("/");
    });

    it("does not rewrite unknown paths", () => {
        const {req} = applyMiddleware("/some-other-page");
        expect(req.url).toBe("/some-other-page");
    });

    it("does not rewrite paths with file extensions", () => {
        const {req} = applyMiddleware("/reuse/style.css");
        expect(req.url).toBe("/reuse/style.css");
    });

    it("does not rewrite JS asset requests", () => {
        const {req} = applyMiddleware("/src/reuse.js");
        expect(req.url).toBe("/src/reuse.js");
    });

    it("always calls next", () => {
        const {next: next1} = applyMiddleware("/reuse");
        const {next: next2} = applyMiddleware("/unknown");
        const {next: next3} = applyMiddleware("/src/main.js");
        expect(next1).toHaveBeenCalled();
        expect(next2).toHaveBeenCalled();
        expect(next3).toHaveBeenCalled();
    });
});
