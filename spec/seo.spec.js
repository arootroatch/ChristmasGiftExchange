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

  describe("content pages", () => {
    const contentPages = [
      ["pages/family-gift-exchange/index.html", "/family-gift-exchange"],
      ["pages/office-secret-santa/index.html", "/office-secret-santa"],
      ["pages/privacy/index.html", "/privacy"],
    ];

    describe.each(contentPages)("%s", (path, url) => {
      const page = parsePage(path);

      it("can be indexed", () => {
        expect(page.head.querySelector('meta[name="robots"]')).toBeNull();
      });

      it("has a title that fits in search results", () => {
        expect(page.title.length).toBeGreaterThan(0);
        expect(page.title.length).toBeLessThanOrEqual(60);
      });

      it("has a description that fits in search results", () => {
        const {content} = page.head.querySelector('meta[name="description"]');
        expect(content.length).toBeGreaterThan(50);
        expect(content.length).toBeLessThanOrEqual(160);
      });

      it("has exactly one main heading", () => {
        expect(page.querySelectorAll("h1").length).toBe(1);
      });

      it("is listed in the sitemap", () => {
        expect(readFileSync("public/sitemap.xml", "utf8")).toContain(`<loc>https://gift-exchange-generator.com${url}</loc>`);
      });

      it("shows the shared footer", () => {
        expect(page.querySelector('[data-slot="site-footer"]')).not.toBeNull();
      });

      it("links back to the generator", () => {
        expect(page.querySelector('main a[href="/"]')).not.toBeNull();
      });
    });

    it("gives every page its own title and description", () => {
      const pages = [...contentPages.map(([path]) => path), "index.html"].map(parsePage);
      expect(new Set(pages.map((p) => p.title)).size).toBe(pages.length);
      expect(new Set(pages.map((p) => p.head.querySelector('meta[name="description"]').content)).size).toBe(pages.length);
    });

    it("targets household exclusions on the family page", () => {
      const page = parsePage("pages/family-gift-exchange/index.html");
      expect(page.querySelector("h1").textContent).toContain("Family");
      expect(page.querySelector("main").textContent).toContain("household");
    });

    it("targets one shareable link on the office page", () => {
      const page = parsePage("pages/office-secret-santa/index.html");
      expect(page.querySelector("h1").textContent).toContain("Office");
      expect(page.querySelector("main").textContent).toContain("one link");
    });

    describe("privacy page", () => {
      const text = parsePage("pages/privacy/index.html").querySelector("main").textContent;

      it.each([
        ["how long server logs keep IP addresses", "30 days"],
        ["the service that sends email", "Postmark"],
        ["the site's hosting", "Netlify"],
        ["the optional support widget", "Buy Me a Coffee"],
        ["how to ask for deletion", "alex@gift-exchange-generator.com"],
      ])("states %s", (_label, fact) => {
        expect(text).toContain(fact);
      });

      it("states that emails and names are kept until deletion is requested", () => {
        expect(text).toContain("until you ask us to delete");
      });
    });
  });

  describe("llms.txt", () => {
    const llms = readFileSync("public/llms.txt", "utf8");

    it("starts with the site name as a heading", () => {
      expect(llms.startsWith("# Gift Exchange Generator\n")).toBe(true);
    });

    it.each(["/family-gift-exchange", "/office-secret-santa", "/privacy"])("links to %s", (path) => {
      expect(llms).toContain(`https://gift-exchange-generator.com${path}`);
    });

    it("does not claim that no personal data is stored", () => {
      expect(llms).not.toMatch(/no personal (data|information)/i);
    });
  });

  describe("home page guide", () => {
    const guide = parsePage("index.html").querySelector("#home-guide");

    it("is plain HTML that search engines can read without running JavaScript", () => {
      expect(guide.textContent.trim().split(/\s+/).length).toBeGreaterThan(300);
    });

    it("explains how drawing names works", () => {
      expect(guide.querySelectorAll("ol li").length).toBe(3);
    });

    it.each(["Kris Kringle", "Pollyanna", "Amigo Secreto"])("mentions the regional name %s", (name) => {
      expect(guide.textContent).toContain(name);
    });

    it.each(["/family-gift-exchange", "/office-secret-santa", "/privacy"])("links to %s", (href) => {
      expect(guide.querySelector(`a[href="${href}"]`)).not.toBeNull();
    });

    it("says plainly which modes need an email address", () => {
      expect(guide.textContent).toContain("Names from a Hat and Quick Match don't need any email addresses");
    });
  });

  describe("home page head", () => {
    const page = parsePage("index.html");

    it("keeps its metadata in the head instead of spilling into the body", () => {
      ['title', 'meta[name="description"]', 'link[rel="stylesheet"]'].forEach((selector) => {
        expect(page.head.querySelector(selector), selector).not.toBeNull();
      });
    });

    it("targets free online Secret Santa searches in the title", () => {
      expect(page.title).toBe("Free Online Secret Santa Generator | No Ads, No Account");
    });

    it("keeps the title short enough to show in full in search results", () => {
      expect(page.title.length).toBeLessThanOrEqual(60);
    });

    it("keeps both Secret Santa and gift exchange searches in the main heading", () => {
      expect(page.querySelector("h1").textContent).toBe("Free Online Secret Santa & Gift Exchange Generator");
    });

    it("sells the privacy promise and the two standout features in the description", () => {
      const description = page.querySelector('meta[name="description"]').content;
      expect(description.startsWith("Free online Secret Santa generator with no ads, tracking or accounts.")).toBe(true);
      expect(description).toContain("Keep households from drawing each other");
      expect(description).toContain("share wishlists anonymously");
      expect(description.length).toBeLessThanOrEqual(160);
    });

    it("uses the same description in the structured data", () => {
      const {"@graph": graph} = JSON.parse(page.head.querySelector('script[type="application/ld+json"]').textContent);
      const app = graph.find((entry) => entry["@type"] === "WebApplication");
      expect(app.description).toBe(page.querySelector('meta[name="description"]').content);
    });

    it("never claims that no personal data is stored", () => {
      const copy = readFileSync("index.html", "utf8");
      expect(copy).not.toMatch(/no personal (data|information)/i);
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
