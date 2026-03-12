import {beforeAll, describe, expect, it} from "vitest";
import {shouldSelect} from "../../specHelper";
import {init} from "../../../src/exchange/components/ReuseLink";

describe("ReuseLink", () => {
    beforeAll(() => {
        init();
    });

    it("renders into the reuse-link data-slot", () => {
        shouldSelect('[data-slot="reuse-link"]');
    });

    it("renders a container with the reuseLink class", () => {
        const slot = document.querySelector('[data-slot="reuse-link"]');
        const container = slot.querySelector(".reuseLink");
        expect(container).not.toBeNull();
    });

    it("displays 'Been here before?' label", () => {
        const slot = document.querySelector('[data-slot="reuse-link"]');
        expect(slot.textContent).toContain("Been here before?");
    });

    it("renders a link to /reuse", () => {
        const link = document.querySelector('[data-slot="reuse-link"] a');
        expect(link).not.toBeNull();
        expect(link.getAttribute("href")).toBe("/reuse");
    });

    it("link text says 'Reuse a Previous Exchange'", () => {
        const link = document.querySelector('[data-slot="reuse-link"] a');
        expect(link.textContent).toContain("Reuse a Previous Exchange");
    });

    it("link has no text-decoration", () => {
        const link = document.querySelector('[data-slot="reuse-link"] a');
        expect(link.style.textDecoration).toBe("none");
    });
});
