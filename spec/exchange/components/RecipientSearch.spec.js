import {beforeEach, describe, expect, it, vi, afterAll, beforeAll} from "vitest";
import {click, stubFetchError} from "../../specHelper";
import {init} from "../../../src/exchange/components/RecipientSearch";
import {waitFor} from "@testing-library/dom";
import {serverErrorMessage} from "../../../src/utils";
import {exchangeEvents, ExchangeEvents} from "../../../src/exchange/state";

const flush = () => new Promise(r => setTimeout(r, 0));

describe("RecipientSearch", () => {
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
    })

    function stubFetch(body) {
        global.fetch = vi.fn(() => Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(body)
        }));
    }

    function stubFetchNotOk(errorMessage) {
        global.fetch = vi.fn(() => Promise.resolve({
            ok: false,
            status: 400,
            json: () => Promise.resolve({error: errorMessage})
        }));
    }

    /**
     * Stubs fetch to handle both the verify call AND the subsequent
     * getName call in sequence, since onSuccess triggers getName synchronously.
     */
    function stubVerifyThenRecipient(recipientData) {
        let callCount = 0;
        global.fetch = vi.fn(() => {
            callCount++;
            if (callCount === 1) {
                // First call: verify code → success
                return Promise.resolve({
                    ok: true, status: 200,
                    json: () => Promise.resolve({success: true}),
                });
            }
            // Second call: GET recipient
            return Promise.resolve({
                ok: true, status: 200,
                json: () => Promise.resolve(recipientData),
            });
        });
    }

    function stubVerifyThenRecipientError(errorMessage) {
        let callCount = 0;
        global.fetch = vi.fn(() => {
            callCount++;
            if (callCount === 1) {
                return Promise.resolve({
                    ok: true, status: 200,
                    json: () => Promise.resolve({success: true}),
                });
            }
            return Promise.resolve({
                ok: false, status: 400,
                json: () => Promise.resolve({error: errorMessage}),
            });
        });
    }

    function stubVerifyThenNetworkError() {
        let callCount = 0;
        global.fetch = vi.fn(() => {
            callCount++;
            if (callCount === 1) {
                return Promise.resolve({
                    ok: true, status: 200,
                    json: () => Promise.resolve({success: true}),
                });
            }
            return Promise.reject({status: 500, message: "Internal Server Error"});
        });
    }

    async function authenticate() {
        document.getElementById("auth-email").value = "test@example.com";
        document.getElementById("auth-code").value = "12345678";
        document.getElementById("auth-verify-code").click();
    }

    async function authenticateAndFetchRecipient(recipientData) {
        stubVerifyThenRecipient(recipientData);
        await authenticate();
        await waitFor(() => {
            expect(query.innerHTML).toContain("buying a gift for");
        });
    }

    describe("auth gate", () => {
        it("renders auth gate with email input", () => {
            expect(query.innerHTML).toContain('id="auth-email"');
            expect(query.innerHTML).toContain('id="auth-send-code"');
        });

        it("renders heading 'Find Your Recipient'", () => {
            expect(query.innerHTML).toContain("Find Your Recipient");
        });

        it("does not render a password input", () => {
            const input = document.querySelector('input[type="password"]');
            expect(input).toBeNull();
        });

        it("sends verification code on send button click", async () => {
            stubFetch({sent: true});
            document.getElementById("auth-email").value = "test@example.com";
            document.getElementById("auth-send-code").click();

            await flush();
            expect(global.fetch).toHaveBeenCalledWith(
                "/.netlify/functions/api-auth-code-post",
                expect.objectContaining({method: "POST"})
            );
        });

        it("shows code step after sending code", async () => {
            stubFetch({sent: true});
            document.getElementById("auth-email").value = "test@example.com";
            document.getElementById("auth-send-code").click();

            await flush();
            expect(document.getElementById("auth-email-step").style.display).toBe("none");
            expect(document.getElementById("auth-code-step").style.display).toBe("");
        });

        it("calls GET api-recipient-get after successful verification", async () => {
            stubVerifyThenRecipient({recipient: "Whitney", date: "2023-06-15T12:00:00.000Z", giverName: "Alex"});
            await authenticate();

            await waitFor(() => {
                expect(global.fetch).toHaveBeenCalledWith(
                    "/.netlify/functions/api-recipient-get",
                    expect.objectContaining({method: "GET"})
                );
            });
        });
    });

    describe("recipient display", () => {
        it("displays recipient and date", async () => {
            await authenticateAndFetchRecipient({recipient: "Whitney", date: "2023-06-15T12:00:00.000Z", giverName: "Alex"});
            expect(query.innerHTML).toContain("Alex");
            expect(query.innerHTML).toContain("is buying a gift for");
            expect(query.innerHTML).toContain("Whitney!");
            expect(query.innerHTML).toContain("As of Thu Jun 15 2023");
        });

        it("displays 'You're' when giverName is missing (legacy)", async () => {
            await authenticateAndFetchRecipient({recipient: "Whitney", date: "2023-06-15T12:00:00.000Z"});
            expect(query.innerHTML).toContain("You're buying a gift for");
            expect(query.innerHTML).toContain("Whitney!");
        });

        it("shows wishlist email button for modern exchanges", async () => {
            await authenticateAndFetchRecipient({recipient: "Whitney", date: "2023-06-15T12:00:00.000Z", giverName: "Alex", exchangeId: "ex-123"});
            expect(query.innerHTML).toContain("Email Me Whitney's Wish List");
        });

        it("does not show wishlist email button for legacy results", async () => {
            await authenticateAndFetchRecipient({recipient: "Whitney", date: "2023-06-15T12:00:00.000Z"});
            expect(query.innerHTML).toContain("Whitney!");
            expect(query.innerHTML).not.toContain("Email Me");
        });

        it("allows searching again after results via Search it button", async () => {
            await authenticateAndFetchRecipient({recipient: "Whitney", date: "2023-06-15T12:00:00.000Z"});
            expect(query.innerHTML).toContain("Whitney!");

            await new Promise(resolve => setTimeout(resolve, 0));

            stubFetch({recipient: "Hunter", date: "2023-06-15T12:00:00.000Z"});
            click("#recipientSearchBtn");
            await waitFor(() => {
                expect(query.innerHTML).toContain("Hunter!");
            });
        });
    });

    describe("error handling", () => {
        it("displays error message for 2 secs on network error then restores auth gate", async () => {
            vi.useFakeTimers();

            stubVerifyThenNetworkError();
            document.getElementById("auth-email").value = "test@example.com";
            document.getElementById("auth-code").value = "12345678";
            document.getElementById("auth-verify-code").click();
            await vi.advanceTimersByTimeAsync(0);
            await vi.advanceTimersByTimeAsync(0);

            expect(query.innerHTML).toContain(serverErrorMessage);
            vi.advanceTimersByTime(2000);
            expect(query.innerHTML).not.toContain(serverErrorMessage);
            expect(query.innerHTML).toContain("auth-email");
            expect(query.innerHTML).toContain("Find Your Recipient");
            vi.useRealTimers();
        });

        it("displays API error message on non-ok response", async () => {
            stubVerifyThenRecipientError("Database unavailable");
            await authenticate();

            await waitFor(() => expect(query.innerHTML).toContain("Database unavailable"));
        });

        it("displays generic fallback error on non-ok response without error field", async () => {
            let callCount = 0;
            global.fetch = vi.fn(() => {
                callCount++;
                if (callCount === 1) {
                    return Promise.resolve({
                        ok: true, status: 200,
                        json: () => Promise.resolve({success: true}),
                    });
                }
                return Promise.resolve({
                    ok: false, status: 400,
                    json: () => Promise.resolve({}),
                });
            });
            await authenticate();

            await waitFor(() => expect(query.innerHTML).toContain("Could not find your recipient. Please try again."));
        });
    });

    describe("wishlist email", () => {
        it("sends wishlist email with exchangeId only (cookie auth)", async () => {
            await authenticateAndFetchRecipient({recipient: "Whitney", date: "2023-06-15T12:00:00.000Z", giverName: "Alex", exchangeId: "ex-123"});
            expect(query.innerHTML).toContain("Email Me");

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
                        body: JSON.stringify({exchangeId: "ex-123"}),
                    })
                );
            });
        });

        it("shows success message after email sent", async () => {
            await authenticateAndFetchRecipient({recipient: "Whitney", date: "2023-06-15T12:00:00.000Z", giverName: "Alex", exchangeId: "ex-123"});
            expect(query.innerHTML).toContain("Email Me");

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
            await authenticateAndFetchRecipient({recipient: "Whitney", date: "2023-06-15T12:00:00.000Z", giverName: "Alex", exchangeId: "ex-123"});
            expect(query.innerHTML).toContain("Email Me");

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
    });

    it("hides when exchange starts", () => {
        exchangeEvents.emit(ExchangeEvents.EXCHANGE_STARTED, {});
        const slot = document.querySelector('[data-slot="recipient-search"]');
        expect(slot.innerHTML).toBe("");
    });
})
