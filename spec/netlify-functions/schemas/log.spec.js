import {describe, it, expect} from "vitest";
import {logSchema} from "../../../netlify/shared/schemas/log.mjs";

describe("logSchema", () => {
    it("accepts a valid log document", () => {
        const result = logSchema.safeParse({
            level: "warn",
            message: "Rate limit exceeded",
            endpoint: "/api/auth-code",
            ip: "1.2.3.4",
            metadata: {count: 4, maxRequests: 3},
            timestamp: new Date(),
        });
        expect(result.success).toBe(true);
    });

    it("accepts null endpoint and ip", () => {
        const result = logSchema.safeParse({
            level: "info",
            message: "Request received",
            endpoint: null,
            ip: null,
            metadata: {},
            timestamp: new Date(),
        });
        expect(result.success).toBe(true);
    });

    it("rejects an invalid level", () => {
        const result = logSchema.safeParse({
            level: "verbose",
            message: "test",
            endpoint: null,
            ip: null,
            metadata: {},
            timestamp: new Date(),
        });
        expect(result.success).toBe(false);
    });
});
