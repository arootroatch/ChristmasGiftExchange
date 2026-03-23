import {describe, it, expect} from "vitest";
import {extractTokenFromPath} from "../../netlify/shared/auth.mjs";

describe("extractTokenFromPath", () => {
    it("extracts token after exact segment match", () => {
        const event = {path: "/.netlify/functions/api-user-get/abc-123"};
        expect(extractTokenFromPath(event, "api-user-get")).toBe("abc-123");
    });

    it("does not match partial segment names", () => {
        const event = {path: "/.netlify/functions/api-user-get/abc-123"};
        expect(extractTokenFromPath(event, "user")).toBeNull();
    });

    it("returns null when segment not found", () => {
        const event = {path: "/.netlify/functions/api-other/abc-123"};
        expect(extractTokenFromPath(event, "api-user-get")).toBeNull();
    });

    it("returns null when no token after segment", () => {
        const event = {path: "/.netlify/functions/api-user-get"};
        expect(extractTokenFromPath(event, "api-user-get")).toBeNull();
    });
});
