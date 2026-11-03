import {describe, it, expect} from "vitest";
import {readFileSync} from "node:fs";

const parsePage = (path) => new DOMParser().parseFromString(readFileSync(path, "utf8"), "text/html");

describe("SEO", () => {
  describe("crawling", () => {
    it.each(["pages/draw/index.html", "pages/dashboard/index.html", "pages/admin/index.html"])(
      "keeps %s out of search results",
      (path) => {
        expect(parsePage(path).head.querySelector('meta[name="robots"]').content).toBe("noindex");
      }
    );

    it("lists only pages that exist in the sitemap", () => {
      const sitemap = readFileSync("public/sitemap.xml", "utf8");
      expect(sitemap).toContain("<loc>https://gift-exchange-generator.com/</loc>");
      expect(sitemap).not.toContain("/reuse");
    });

    it("points crawlers to the sitemap without blocking the noindex pages", () => {
      const robots = readFileSync("public/robots.txt", "utf8");
      expect(robots).toContain("Sitemap: https://gift-exchange-generator.com/sitemap.xml");
      expect(robots).not.toContain("Disallow: /");
    });
  });

  it("uses the same description in the web app manifest", () => {
    const manifest = JSON.parse(readFileSync("public/site.webmanifest", "utf8"));
    expect(manifest.description).toBe(parsePage("index.html").querySelector('meta[name="description"]').content);
  });

  describe("home page head", () => {
    const page = parsePage("index.html");

    it("keeps its metadata in the head instead of spilling into the body", () => {
      ['title', 'meta[name="description"]', 'link[rel="stylesheet"]'].forEach((selector) => {
        expect(page.head.querySelector(selector), selector).not.toBeNull();
      });
    });

    it("targets Secret Santa searches in the title", () => {
      expect(page.title).toBe("Free Secret Santa Generator & Gift Exchange | No Sign-Up");
    });

    it("leads the description with no personal information and fits in search results", () => {
      const description = page.querySelector('meta[name="description"]').content;
      expect(description.startsWith("No personal information required.")).toBe(true);
      expect(description).toContain("exclusions for couples and households");
      expect(description.length).toBeLessThanOrEqual(160);
    });

    it("describes the site and app as structured data", () => {
      const {"@graph": graph} = JSON.parse(page.head.querySelector('script[type="application/ld+json"]').textContent);
      const ofType = (type) => graph.find((entry) => entry["@type"] === type);
      expect(ofType("WebSite").alternateName).toBe("Secret Santa Generator");
      expect(ofType("WebApplication").offers.price).toBe("0");
      expect(ofType("WebApplication").featureList.join(" ")).toContain("Exclusions");
    });
  });
});
