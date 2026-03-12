import {beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import {installGivers, resetState, shouldDisplayErrorSnackbar, shouldDisplaySuccessSnackbar} from "../../../specHelper";
import {assignRecipients, getState, nextStep, startExchange} from "../../../../src/exchange/state";
import {init} from "../../../../src/exchange/components/EmailTable/SendResults";
import {init as initSnackbar} from "../../../../src/Snackbar";
import {alex, whitney, hunter} from "../../../testData";

describe("SendResults", () => {
    vi.useFakeTimers();

    beforeAll(() => {
        initSnackbar();
        init();
    });

    beforeEach(() => {
        resetState();
        const existing = document.querySelector("#sendResults");
        if (existing) existing.remove();
    });

    function triggerSecretSantaAssign() {
        getState().isSecretSanta = true;
        installGivers([{...alex}, {...whitney}, {...hunter}]);
        assignRecipients(["Whitney", "Hunter", "Alex"]);
    }

    describe("collapsed state", () => {
        it("renders on RECIPIENTS_ASSIGNED in secret santa mode", () => {
            triggerSecretSantaAssign();
            const el = document.querySelector("#sendResults");
            expect(el).not.toBeNull();
            expect(el.textContent).toContain("Don't want to send out emails to everyone?");
        });

        it("does not render on RECIPIENTS_ASSIGNED when not isSecretSanta", () => {
            getState().isSecretSanta = false;
            installGivers([{...alex}, {...whitney}]);
            assignRecipients(["Whitney", "Alex"]);
            expect(document.querySelector("#sendResults")).toBeNull();
        });

        it("renders on NEXT_STEP when step is 4", () => {
            installGivers([{...alex}, {...whitney}]);
            getState().step = 3;
            nextStep();
            expect(document.querySelector("#sendResults")).not.toBeNull();
        });

        it("does not render on NEXT_STEP when step is not 4", () => {
            installGivers([{...alex}, {...whitney}]);
            getState().step = 1;
            nextStep();
            expect(document.querySelector("#sendResults")).toBeNull();
        });

        it("removes on EXCHANGE_STARTED", () => {
            triggerSecretSantaAssign();
            expect(document.querySelector("#sendResults")).not.toBeNull();
            startExchange(false);
            expect(document.querySelector("#sendResults")).toBeNull();
        });

        it("hides with animation on EMAILS_ADDED", async () => {
            const {addEmailsToParticipants} = await import("../../../../src/exchange/state");
            triggerSecretSantaAssign();
            const el = document.querySelector("#sendResults");
            expect(el).not.toBeNull();

            addEmailsToParticipants([
                {name: alex.name, email: alex.email, index: 0},
                {name: whitney.name, email: whitney.email, index: 1},
                {name: hunter.name, email: hunter.email, index: 2},
            ]);

            expect(el.classList).toContain("hide");

            vi.advanceTimersByTime(500);

            expect(document.querySelector("#sendResults")).toBeNull();
        });
    });

    describe("confirmation state", () => {
        beforeEach(() => {
            triggerSecretSantaAssign();
        });

        it("shows confirmation warnings when Send Me the Results is clicked", () => {
            const btn = document.querySelector("#sendResultsBtn");
            btn.click();

            const el = document.querySelector("#sendResults");
            expect(el.textContent).toContain("Your exchange will not be saved");
            expect(el.textContent).toContain("save your results email or take a screenshot");
        });

        it("shows reveal warning in secret santa mode", () => {
            document.querySelector("#sendResultsBtn").click();

            const el = document.querySelector("#sendResults");
            expect(el.textContent).toContain("reveal all gift exchange assignments");
        });

        it("does not show reveal warning in non-secret-santa mode", () => {
            const existing = document.querySelector("#sendResults");
            if (existing) existing.remove();
            getState().isSecretSanta = false;
            installGivers([{...alex}, {...whitney}]);
            assignRecipients(["Whitney", "Alex"]);
            getState().step = 3;
            nextStep();

            document.querySelector("#sendResultsBtn").click();

            const el = document.querySelector("#sendResults");
            expect(el.textContent).not.toContain("reveal all gift exchange assignments");
        });

        it("Cancel returns to collapsed state", () => {
            document.querySelector("#sendResultsBtn").click();
            expect(document.querySelector("#sendResults").textContent).toContain("will not be saved");

            document.querySelector("#sendResultsCancelBtn").click();

            const el = document.querySelector("#sendResults");
            expect(el.textContent).toContain("Don't want to send out emails to everyone?");
            expect(el.textContent).not.toContain("will not be saved");
        });
    });

    describe("expanded form", () => {
        beforeEach(() => {
            triggerSecretSantaAssign();
            document.querySelector("#sendResultsBtn").click();
            document.querySelector("#sendResultsConfirmBtn").click();
        });

        it("shows form with participant select and email input", () => {
            const select = document.querySelector("#sendResultsName");
            const emailInput = document.querySelector("#sendResultsEmail");

            expect(select).not.toBeNull();
            expect(emailInput).not.toBeNull();
            expect(select.options.length).toBe(4); // placeholder + 3 participants
            expect(select.options[1].textContent).toBe("Alex");
        });

        it("shows results table in secret santa mode", () => {
            const resultsCard = document.querySelector("#sendResults .results-card");
            expect(resultsCard).not.toBeNull();
            expect(resultsCard.textContent).toContain("Alex");
            expect(resultsCard.textContent).toContain("Whitney");
        });
    });

    describe("expanded form non-secret-santa", () => {
        beforeEach(() => {
            const existing = document.querySelector("#sendResults");
            if (existing) existing.remove();
            getState().isSecretSanta = false;
            installGivers([{...alex}, {...whitney}]);
            assignRecipients(["Whitney", "Alex"]);
            getState().step = 3;
            nextStep();
            document.querySelector("#sendResultsBtn").click();
            document.querySelector("#sendResultsConfirmBtn").click();
        });

        it("does not show results table", () => {
            expect(document.querySelector("#sendResults .results-card")).toBeNull();
        });

        it("shows form with select and email input", () => {
            expect(document.querySelector("#sendResultsName")).not.toBeNull();
            expect(document.querySelector("#sendResultsEmail")).not.toBeNull();
        });
    });

    describe("submit", () => {
        beforeEach(() => {
            global.fetch = vi.fn(() => Promise.resolve({
                ok: true,
                status: 200,
                json: () => Promise.resolve({success: true})
            }));
            triggerSecretSantaAssign();
            document.querySelector("#sendResultsBtn").click();
            document.querySelector("#sendResultsConfirmBtn").click();
            // Fill form
            const select = document.querySelector("#sendResultsName");
            select.value = "Alex";
            document.querySelector("#sendResultsEmail").value = "alex@test.com";
        });

        it("sends request to api-results-email-post", () => {
            document.querySelector("#sendResultsSubmit").click();

            expect(global.fetch).toHaveBeenCalledWith(
                "/.netlify/functions/api-results-email-post",
                expect.objectContaining({method: "POST"})
            );
            const body = JSON.parse(global.fetch.mock.calls[0][1].body);
            expect(body.name).toBe("Alex");
            expect(body.email).toBe("alex@test.com");
            expect(body.assignments).toHaveLength(3);
        });

        it("shows loading state on submit button", () => {
            document.querySelector("#sendResultsSubmit").click();

            const btn = document.querySelector("#sendResultsSubmit");
            expect(btn.textContent).toBe("Loading...");
        });

        it("shows success snackbar and hides component on success", async () => {
            document.querySelector("#sendResultsSubmit").click();
            await vi.advanceTimersByTimeAsync(0);

            shouldDisplaySuccessSnackbar("Results sent!");
            const el = document.querySelector("#sendResults");
            expect(el.classList).toContain("hide");

            vi.advanceTimersByTime(500);
            expect(document.querySelector("#sendResults")).toBeNull();
        });

        it("shows error snackbar on API failure", async () => {
            global.fetch = vi.fn(() => Promise.resolve({
                ok: false,
                status: 500,
                json: () => Promise.resolve({error: "Server error"})
            }));
            document.querySelector("#sendResultsSubmit").click();

            const {serverErrorMessage} = await import("../../../../src/utils");
            await vi.waitFor(() => {
                shouldDisplayErrorSnackbar(serverErrorMessage);
            });
        });

        it("re-enables send button on API failure", async () => {
            global.fetch = vi.fn(() => Promise.resolve({
                ok: false,
                status: 400,
                json: () => Promise.resolve({error: "Bad request"})
            }));
            document.querySelector("#sendResultsSubmit").click();

            await vi.waitFor(() => {
                const btn = document.querySelector("#sendResultsSubmit");
                expect(btn.textContent).toBe("Send");
            });
        });

        it("shows error when no name selected", () => {
            document.querySelector("#sendResultsName").value = "";
            document.querySelector("#sendResultsSubmit").click();

            shouldDisplayErrorSnackbar("Please select your name");
            expect(global.fetch).not.toHaveBeenCalled();
        });

        it("shows error when no email entered", () => {
            document.querySelector("#sendResultsEmail").value = "";
            document.querySelector("#sendResultsSubmit").click();

            shouldDisplayErrorSnackbar("Please enter your email");
            expect(global.fetch).not.toHaveBeenCalled();
        });
    });
});
