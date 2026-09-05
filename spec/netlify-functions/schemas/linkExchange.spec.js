import {describe, it, expect} from "vitest";
import {ObjectId} from "mongodb";
import {linkExchangeSchema} from "../../../netlify/shared/schemas/linkExchange.mjs";

describe("linkExchangeSchema", () => {
    const valid = {
        exchangeId: "abc-123",
        createdAt: new Date(),
        houses: [{name: "Family", members: ["Alex", "Whitney"]}],
        participants: [
            {name: "Alex", recipient: "Whitney", hasDrawn: false},
            {name: "Whitney", recipient: "Alex", hasDrawn: true},
        ],
    };

    it("accepts a valid document without an organizer", () => {
        expect(linkExchangeSchema.safeParse(valid).success).toBe(true);
    });

    it("accepts a valid document with an organizer ObjectId", () => {
        const result = linkExchangeSchema.safeParse({...valid, organizer: new ObjectId()});
        expect(result.success).toBe(true);
    });

    it("rejects a participant missing hasDrawn", () => {
        const result = linkExchangeSchema.safeParse({
            ...valid,
            participants: [{name: "Alex", recipient: "Whitney"}],
        });
        expect(result.success).toBe(false);
    });

    it("rejects missing exchangeId", () => {
        const {exchangeId, ...rest} = valid;
        expect(linkExchangeSchema.safeParse(rest).success).toBe(false);
    });
});
