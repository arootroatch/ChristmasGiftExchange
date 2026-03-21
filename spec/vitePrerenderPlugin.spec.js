import {describe, it, expect, beforeEach} from "vitest";
import {prerenderPlugin} from "../src/vitePrerenderPlugin.js";

describe("prerenderPlugin", () => {
  let plugin;

  beforeEach(() => {
    plugin = prerenderPlugin();
  });

  describe("slot injection", () => {
    const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Gift Exchange Generator</title>
    <meta name="description" content="Draw names for a gift exchange.">
</head>
<body>
    <div data-slot="instructions"></div>
    <div data-slot="recipient-search"></div>
    <div data-slot="reuse-link"></div>
</body>
</html>`;

    it("injects introTemplate into instructions slot on index.html", () => {
      const result = plugin.transformIndexHtml(indexHtml, {path: "/index.html"});
      expect(result).toContain('data-slot="instructions"><div id="intro">');
      expect(result).toContain("Drawing names for a gift exchange");
    });

    it("injects recipientSearchTemplate into recipient-search slot", () => {
      const result = plugin.transformIndexHtml(indexHtml, {path: "/index.html"});
      expect(result).toContain('data-slot="recipient-search"><div id="query"');
    });

    it("injects reuseLinkTemplate into reuse-link slot", () => {
      const result = plugin.transformIndexHtml(indexHtml, {path: "/index.html"});
      expect(result).toContain('data-slot="reuse-link"><div class="reuseLink"');
    });

    it("does not inject templates into non-index pages", () => {
      const pageHtml = `<html><head><meta charset="UTF-8"><title>Other</title><meta name="description" content="Other page."></head><body></body></html>`;
      const result = plugin.transformIndexHtml(pageHtml, {path: "/pages/reuse/index.html"});
      expect(result).not.toContain("Drawing names");
      expect(result).not.toContain('id="intro"');
    });
  });

  describe("OG tag generation", () => {
    const pageHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Reuse a Previous Exchange</title>
    <meta name="description" content="Reuse a previous gift exchange to draw new names.">
</head>
<body></body>
</html>`;

    it("generates og:title from the title tag", () => {
      const result = plugin.transformIndexHtml(pageHtml, {path: "/pages/reuse/index.html"});
      expect(result).toContain('og:title" content="Reuse a Previous Exchange"');
    });

    it("generates og:description from meta description", () => {
      const result = plugin.transformIndexHtml(pageHtml, {path: "/pages/reuse/index.html"});
      expect(result).toContain('og:description" content="Reuse a previous gift exchange to draw new names."');
    });

    it("generates og:url from page path", () => {
      const result = plugin.transformIndexHtml(pageHtml, {path: "/pages/reuse/index.html"});
      expect(result).toContain('og:url" content="https://gift-exchange-generator.com/reuse"');
    });

    it("generates og:url as root for index.html", () => {
      const html = `<html><head><meta charset="UTF-8"><title>Gift Exchange Generator</title><meta name="description" content="Draw names."></head><body></body></html>`;
      const result = plugin.transformIndexHtml(html, {path: "/index.html"});
      expect(result).toContain('og:url" content="https://gift-exchange-generator.com/"');
    });

    it("derives /wishlist/edit from pages/wishlist/edit path", () => {
      const html = `<html><head><meta charset="UTF-8"><title>Add Your Wishlist</title><meta name="description" content="Add wishlists."></head><body></body></html>`;
      const result = plugin.transformIndexHtml(html, {path: "/pages/wishlist/edit/index.html"});
      expect(result).toContain('og:url" content="https://gift-exchange-generator.com/wishlist/edit"');
    });

    it("includes og:image and og:type", () => {
      const result = plugin.transformIndexHtml(pageHtml, {path: "/pages/reuse/index.html"});
      expect(result).toContain('og:image" content="https://gift-exchange-generator.com/Gift-Giving-Banner.webp"');
      expect(result).toContain('og:type" content="website"');
    });

    it("injects OG tags before </head>", () => {
      const result = plugin.transformIndexHtml(pageHtml, {path: "/pages/reuse/index.html"});
      const ogIndex = result.indexOf("og:title");
      const headCloseIndex = result.indexOf("</head>");
      expect(ogIndex).toBeLessThan(headCloseIndex);
      expect(ogIndex).toBeGreaterThan(0);
    });
  });

  describe("favicon injection", () => {
    const bareHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Add Your Wishlist</title>
    <meta name="description" content="Add wishlists.">
</head>
<body></body>
</html>`;

    it("injects favicon links into pages that lack them", () => {
      const result = plugin.transformIndexHtml(bareHtml, {path: "/pages/wishlist/edit/index.html"});
      expect(result).toContain('rel="apple-touch-icon"');
      expect(result).toContain('rel="manifest"');
      expect(result).toContain("favicon-32x32.png");
      expect(result).toContain("favicon-16x16.png");
    });

    it("does not duplicate favicons when already present", () => {
      const htmlWithFavicons = `<html><head><meta charset="UTF-8"><link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png"><title>Test</title><meta name="description" content="Test."></head><body></body></html>`;
      const result = plugin.transformIndexHtml(htmlWithFavicons, {path: "/index.html"});
      const count = (result.match(/rel="apple-touch-icon"/g) || []).length;
      expect(count).toBe(1);
    });

    it("injects favicons after meta charset", () => {
      const result = plugin.transformIndexHtml(bareHtml, {path: "/pages/reuse/index.html"});
      const charsetIndex = result.indexOf('charset="UTF-8"');
      const faviconIndex = result.indexOf("apple-touch-icon");
      expect(faviconIndex).toBeGreaterThan(charsetIndex);
    });
  });
});
