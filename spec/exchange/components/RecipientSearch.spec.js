import {beforeEach, describe, expect, it, vi, afterAll, beforeAll} from "vitest";
import {click, expectColor, stubFetchError} from "../../specHelper";
import {init} from "../../../src/exchange/components/RecipientSearch";
import {waitFor} from "@testing-library/dom";
import {serverErrorMessage} from "../../../src/utils";
import {exchangeEvents, ExchangeEvents} from "../../../src/exchange/state";

describe("getName", () => {
    let recipientSearchBtn;
    let query;
    let consoleLogSpy;
    let consoleErrorSpy;

    beforeAll(() => {
        consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterAll(() => {
        consoleLogSpy.mockRestore();
        consoleErrorSpy.mockRestore();
    });

    beforeEach(() => {
        vi.useRealTimers();
        vi.clearAllTimers();
        init();
        query = document.querySelector("#query");
        recipientSearchBtn = document.querySelector("#recipientSearchBtn");
    })

    function stubRecipientFetch(body) {
        global.fetch = vi.fn(() => Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(body)
        }));
    }

    it("shows spinner and disables button", () => {
        stubRecipientFetch({recipient: "Whitney", date: "2023-06-15T12:00:00.000Z"});
        click("#recipientSearchBtn");
        expect(recipientSearchBtn.innerHTML).toContain('class="spinner"');
        expect(recipientSearchBtn.disabled).toBe(true);
    })

    it("fetches from api-recipient-get with email query param", () => {
        stubRecipientFetch({recipient: "Whitney", date: "2023-06-15T12:00:00.000Z"});
        const emailInput = document.querySelector("#recipientSearch");
        emailInput.value = "test@example.com";
        click("#recipientSearchBtn");
        expect(global.fetch).toHaveBeenCalledWith(
            "/.netlify/functions/api-recipient-get?email=test%40example.com",
            expect.objectContaining({})
        );
    })

    it("displays recipient and date", async () => {
        stubRecipientFetch({recipient: "Whitney", date: "2023-06-15T12:00:00.000Z", giverName: "Alex"});
        click("#recipientSearchBtn");
        await waitFor(() => {
            expect(query.innerHTML).toContain("Alex");
            expect(query.innerHTML).toContain("is buying a gift for");
            expect(query.innerHTML).toContain("Whitney!");
            expect(query.innerHTML).toContain("As of Thu Jun 15 2023");
        });
    })

    it("displays 'You're' when giverName is missing (legacy)", async () => {
        stubRecipientFetch({recipient: "Whitney", date: "2023-06-15T12:00:00.000Z"});
        click("#recipientSearchBtn");
        await waitFor(() => {
            expect(query.innerHTML).toContain("You're buying a gift for");
            expect(query.innerHTML).toContain("Whitney!");
        });
    })

    it("allows multiple searches", async () => {
        stubRecipientFetch({recipient: "Whitney", date: "2023-06-15T12:00:00.000Z"});
        click("#recipientSearchBtn");
        await waitFor(() => {
            expect(query.innerHTML).toContain("Whitney!");
        });

        // Wait a tick to ensure event listener is attached to new button
        await new Promise(resolve => setTimeout(resolve, 0));

        stubRecipientFetch({recipient: "Hunter", date: "2023-06-15T12:00:00.000Z"});
        click("#recipientSearchBtn");
        await waitFor(() => {
            expect(query.innerHTML).toContain("Hunter!");
        });
    });

    it("displays error message for 2 secs on network error", async () => {
        vi.useFakeTimers();
        stubFetchError("Internal Server Error");
        click("#recipientSearchBtn");
        await vi.advanceTimersByTimeAsync(0);
        expect(query.innerHTML).toContain(serverErrorMessage);
        vi.advanceTimersByTime(2000);
        expect(query.innerHTML).not.toContain(serverErrorMessage);
        expect(query.innerHTML).toContain("Need to know who you're buying a gift for?");
        recipientSearchBtn = document.querySelector("#recipientSearchBtn");
        expect(recipientSearchBtn.innerHTML).toContain("Search it!");
        vi.useRealTimers();
    });

    function stubFetchNotOk(errorMessage) {
        global.fetch = vi.fn(() => Promise.resolve({
            ok: false,
            status: 400,
            json: () => Promise.resolve({error: errorMessage})
        }));
    }

    it("displays API error message on non-ok response", async () => {
        stubFetchNotOk("Database unavailable");
        click("#recipientSearchBtn");
        await waitFor(() => expect(query.innerHTML).toContain("Database unavailable"));
    });

    it("displays generic error on non-ok response without error field", async () => {
        global.fetch = vi.fn(() => Promise.resolve({
            ok: false,
            status: 400,
            json: () => Promise.resolve({})
        }));
        click("#recipientSearchBtn");
        await waitFor(() => expect(query.innerHTML).toContain("Email address not found. Please try again."));
    });

    it("hides when exchange starts", () => {
        exchangeEvents.emit(ExchangeEvents.EXCHANGE_STARTED, {});
        const slot = document.querySelector('[data-slot="recipient-search"]');
        expect(slot.innerHTML).toBe("");
    });

    it("shows wishlist email button for modern exchanges", async () => {
        stubRecipientFetch({recipient: "Whitney", date: "2023-06-15T12:00:00.000Z", giverName: "Alex", exchangeId: "ex-123"});
        click("#recipientSearchBtn");
        await waitFor(() => {
            expect(query.innerHTML).toContain("Email Me Whitney's Wish List");
        });
    });

    it("does not show wishlist email button for legacy results", async () => {
        stubRecipientFetch({recipient: "Whitney", date: "2023-06-15T12:00:00.000Z"});
        click("#recipientSearchBtn");
        await waitFor(() => {
            expect(query.innerHTML).toContain("Whitney!");
            expect(query.innerHTML).not.toContain("Email Me");
        });
    });

    it("sends wishlist email on button click", async () => {
        stubRecipientFetch({recipient: "Whitney", date: "2023-06-15T12:00:00.000Z", giverName: "Alex", exchangeId: "ex-123"});
        const emailInput = document.querySelector("#recipientSearch");
        emailInput.value = "alex@test.com";
        click("#recipientSearchBtn");
        await waitFor(() => {
            expect(query.innerHTML).toContain("Email Me");
        });

        global.fetch = vi.fn(() => Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({sent: true})
        }));

        click("#wishlistEmailBtn");
        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                "/.netlify/functions/api-wishlist-email-post",
                expect.objectContaining({
                    method: "POST",
                    body: JSON.stringify({email: "alex@test.com", exchangeId: "ex-123"}),
                })
            );
        });
    });

    it("shows success message after email sent", async () => {
        stubRecipientFetch({recipient: "Whitney", date: "2023-06-15T12:00:00.000Z", giverName: "Alex", exchangeId: "ex-123"});
        const emailInput = document.querySelector("#recipientSearch");
        emailInput.value = "alex@test.com";
        click("#recipientSearchBtn");
        await waitFor(() => expect(query.innerHTML).toContain("Email Me"));

        global.fetch = vi.fn(() => Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({sent: true})
        }));

        click("#wishlistEmailBtn");
        await waitFor(() => {
            const btn = document.querySelector("#wishlistEmailBtn");
            expect(btn.textContent).toBe("Email sent!");
            expect(btn.disabled).toBe(true);
        });
    });

    it("shows error message when wishlist email fails", async () => {
        stubRecipientFetch({recipient: "Whitney", date: "2023-06-15T12:00:00.000Z", giverName: "Alex", exchangeId: "ex-123"});
        const emailInput = document.querySelector("#recipientSearch");
        emailInput.value = "alex@test.com";
        click("#recipientSearchBtn");
        await waitFor(() => expect(query.innerHTML).toContain("Email Me"));

        global.fetch = vi.fn(() => Promise.resolve({
            ok: false,
            status: 404,
            json: () => Promise.resolve({error: "User not found"})
        }));

        click("#wishlistEmailBtn");
        await waitFor(() => {
            const btn = document.querySelector("#wishlistEmailBtn");
            expect(btn.textContent).toBe("User not found");
            expect(btn.disabled).toBe(true);
        });
    });

})
