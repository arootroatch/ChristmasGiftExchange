import {beforeEach, describe, expect, it, vi, afterAll, beforeAll} from "vitest";
import {click, expectColor, stubFetchError} from "../specHelper";
import {init} from "../../src/components/EmailQuery";
import {waitFor} from "@testing-library/dom";

describe("getName", () => {
    let emailQueryBtn;
    const query = document.querySelector("#query");
    let consoleLogSpy;
    let consoleErrorSpy;

    beforeAll(() => {
        // Mock console to suppress output during tests
        consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        init();
    });

    afterAll(() => {
        // Restore console
        consoleLogSpy.mockRestore();
        consoleErrorSpy.mockRestore();
    });

    beforeEach(() => {
        emailQueryBtn = document.querySelector("#emailQueryBtn");
    })

    function stubRecipientFetch(body) {
        global.fetch = vi.fn(() => Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(body)
        }));
    }

    it("sets button text to Loading...", () => {
        stubRecipientFetch({recipient: "Whitney", date: "2023-06-15T12:00:00.000Z"});
        click("#emailQueryBtn");
        expect(emailQueryBtn.innerHTML).toContain('Loading...');
        expectColor(emailQueryBtn.style.color, "rgb(128, 128, 128)", "#808080");
    })

    it("fetches from api-recipient-get with email query param", () => {
        stubRecipientFetch({recipient: "Whitney", date: "2023-06-15T12:00:00.000Z"});
        const emailInput = document.querySelector("#emailQuery");
        emailInput.value = "test@example.com";
        click("#emailQueryBtn");
        expect(global.fetch).toHaveBeenCalledWith(
            "/.netlify/functions/api-recipient-get?email=test%40example.com"
        );
    })

    it("displays recipient and date", () => {
        stubRecipientFetch({recipient: "Whitney", date: "2023-06-15T12:00:00.000Z"});
        click("#emailQueryBtn");
        expect(query.innerHTML).toContain("As of Thu Jun 15 2023, you're buying a gift for");
        expect(query.innerHTML).toContain("Whitney!");
    })

    it("displays View Wishlist link when wishlistViewUrl is present", async () => {
        stubRecipientFetch({
            recipient: "Whitney",
            date: "2023-06-15T12:00:00.000Z",
            wishlistViewUrl: "/wishlist/view/token-abc?exchange=ex123"
        });
        click("#emailQueryBtn");
        await waitFor(() => {
            expect(query.innerHTML).toContain("Whitney!");
            expect(query.innerHTML).toContain("View Wishlist");
            expect(query.innerHTML).toContain('href="/wishlist/view/token-abc?exchange=ex123"');
        });
    })

    it("does not display View Wishlist link when wishlistViewUrl is absent", async () => {
        stubRecipientFetch({
            recipient: "Whitney",
            date: "2023-06-15T12:00:00.000Z"
        });
        click("#emailQueryBtn");
        await waitFor(() => {
            expect(query.innerHTML).toContain("Whitney!");
            expect(query.innerHTML).not.toContain("View Wishlist");
        });
    })

    it("allows multiple searches", async () => {
        stubRecipientFetch({recipient: "Whitney", date: "2023-06-15T12:00:00.000Z"});
        click("#emailQueryBtn");
        await waitFor(() => {
            expect(query.innerHTML).toContain("Whitney!");
        });

        // Wait a tick to ensure event listener is attached to new button
        await new Promise(resolve => setTimeout(resolve, 0));

        stubRecipientFetch({recipient: "Hunter", date: "2023-06-15T12:00:00.000Z"});
        click("#emailQueryBtn");
        await waitFor(() => {
            expect(query.innerHTML).toContain("Hunter!");
        });
    });

    it("displays error message for 2 secs if email not found", async () => {
        stubFetchError("Internal Server Error");
        click("#emailQueryBtn");
        await waitFor(() => expect(query.innerHTML).toContain("Email address not found!"));
        setTimeout(() => {
            expect(query.innerHTML).not.toContain("Email address not found!");
            expect(query.innerHTML).toContain("Need to know who you're buying a gift for?");
            expect(emailQueryBtn.innerHTML).toContain("Search it!");
        }, 2000);
    });

})
