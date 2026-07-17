import {describe, it, expect} from "vitest";
import {settingsSchema} from "../../../netlify/shared/schemas/settings.mjs";

describe("settingsSchema", () => {
    it("accepts a valid settings document", () => {
        const result = settingsSchema.safeParse({_id: "global", logLevel: "warn"});
        expect(result.success).toBe(true);
    });

    it("rejects an invalid logLevel", () => {
        const result = settingsSchema.safeParse({_id: "global", logLevel: "verbose"});
        expect(result.success).toBe(false);
    });

    it("rejects an _id other than 'global'", () => {
        const result = settingsSchema.safeParse({_id: "other", logLevel: "warn"});
        expect(result.success).toBe(false);
    });
});
