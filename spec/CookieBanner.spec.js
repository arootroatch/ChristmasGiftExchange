import {beforeEach, describe, expect, it, vi} from "vitest";
import * as cookieBanner from "../src/CookieBanner";
import styles from "../assets/styles/components/cookie-banner.module.css";

describe("CookieBanner", () => {
  beforeEach(() => {
    localStorage.clear();
    document.querySelector("#cookie-banner")?.remove();
    document.querySelector('script[data-name="BMC-Widget"]')?.remove();
  });

  describe("init", () => {
    it("renders banner when no preference is stored", () => {
      cookieBanner.init();

      const banner = document.querySelector("#cookie-banner");
      expect(banner).not.toBeNull();
      expect(banner.textContent).toContain("Buy Me a Coffee");
    });

    it("stores 'accepted' and removes banner on Accept click", () => {
      cookieBanner.init();

      document.querySelector("#cookie-accept").click();
      document.querySelector("#cookie-banner").dispatchEvent(new Event("animationend"));

      expect(localStorage.getItem("cookie-consent")).toBe("accepted");
      expect(document.querySelector("#cookie-banner")).toBeNull();
    });

    it("adds dismissing class on Accept click for slide-down animation", () => {
      cookieBanner.init();
      const banner = document.querySelector("#cookie-banner");

      document.querySelector("#cookie-accept").click();

      expect(banner.classList.contains(styles.dismissing)).toBe(true);
    });

    it("injects BMC script on Accept click", () => {
      cookieBanner.init();

      document.querySelector("#cookie-accept").click();

      const script = document.querySelector('script[data-name="BMC-Widget"]');
      expect(script).not.toBeNull();
      expect(script.src).toContain("buymeacoffee.com");
    });

    it("stores 'rejected' and removes banner on Reject click", () => {
      cookieBanner.init();

      document.querySelector("#cookie-reject").click();
      document.querySelector("#cookie-banner").dispatchEvent(new Event("animationend"));

      expect(localStorage.getItem("cookie-consent")).toBe("rejected");
      expect(document.querySelector("#cookie-banner")).toBeNull();
    });

    it("adds dismissing class on Reject click for slide-down animation", () => {
      cookieBanner.init();
      const banner = document.querySelector("#cookie-banner");

      document.querySelector("#cookie-reject").click();

      expect(banner.classList.contains(styles.dismissing)).toBe(true);
    });

    it("does not inject BMC script on Reject click", () => {
      cookieBanner.init();

      document.querySelector("#cookie-reject").click();

      expect(document.querySelector('script[data-name="BMC-Widget"]')).toBeNull();
    });

    it("does not render banner when consent is 'accepted'", () => {
      localStorage.setItem("cookie-consent", "accepted");

      cookieBanner.init();

      expect(document.querySelector("#cookie-banner")).toBeNull();
    });

    it("loads BMC widget when consent is 'accepted'", () => {
      localStorage.setItem("cookie-consent", "accepted");

      cookieBanner.init();

      const script = document.querySelector('script[data-name="BMC-Widget"]');
      expect(script).not.toBeNull();
    });

    it("does not render banner when consent is 'rejected'", () => {
      localStorage.setItem("cookie-consent", "rejected");

      cookieBanner.init();

      expect(document.querySelector("#cookie-banner")).toBeNull();
    });

    it("does not load BMC widget when consent is 'rejected'", () => {
      localStorage.setItem("cookie-consent", "rejected");

      cookieBanner.init();

      expect(document.querySelector('script[data-name="BMC-Widget"]')).toBeNull();
    });
  });

  describe("isBmcConsented", () => {
    it("returns true when consent is 'accepted'", () => {
      localStorage.setItem("cookie-consent", "accepted");
      expect(cookieBanner.isBmcConsented()).toBe(true);
    });

    it("returns false when consent is 'rejected'", () => {
      localStorage.setItem("cookie-consent", "rejected");
      expect(cookieBanner.isBmcConsented()).toBe(false);
    });

    it("returns false when no preference stored", () => {
      expect(cookieBanner.isBmcConsented()).toBe(false);
    });
  });
});
