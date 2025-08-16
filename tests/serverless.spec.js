// @vitest-environment jsdom

import {beforeEach, describe, expect, it, vi} from 'vitest'
import {displaySendEmails, getEmails, submitEmails} from '/resources/js/serverless.js'
import {click, installGiverNames, installGivers, stubFetch, stubFetchError} from "./specHelper";
import {alex, hunter, megan, whitney} from "./testData";
import state from "../resources/js/state";
import {waitFor} from '@testing-library/dom';

function renderEmailTable(givers) {
    const body = document.getElementById("emailTableBody");
    for (let i = 0; i < givers.length; i++) {
        body.insertAdjacentHTML(
            "afterbegin",
            `<div class="emailDiv">
          <label for=${i}>${givers[i].name}</label>
          <input type="email" class="emailInput" maxlength="100" name=${givers[i].name} id=${i} value=${givers[i].email} required/>
        </div>
        `
        );
    }
}

describe('serverless', () => {
    stubFetch(true, 200, {});
    Math.random = vi.fn(() => 123456789);
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2023, 0, 1));
    vi.mock(import("/resources/js/serverless.js"), async (importOriginal) => {
        const actual = await importOriginal()
        return {
            ...actual,
            getEmails: vi.fn(actual.getEmails),
            postToServer: vi.fn(actual.postToServer),
        }
    })

    describe("submitEmails", () => {
        renderEmailTable([
            {name: "Alex", email: "arootroatch@gmail.com"},
            {name: "Whitney", email: "whitney@gmail.com"},
            {name: "Hunter", email: "hunter@gmail.com"},
            {name: "Megan", email: "megan@gmail.com"}]);
        installGiverNames(["Alex", "Whitney", "Hunter", "Megan"]);
        const submitEmailsButton = document.getElementById("submitEmails");

        beforeEach(() => {
            const emailTableBody = document.getElementById("emailTableBody");
            const submitEvent = new Event("submit", {bubbles: true, cancelable: true});
            emailTableBody.dispatchEvent(submitEvent);
        })

        it('sets button text to Loading...', () => {
            expect(submitEmailsButton.innerHTML).toBe('Loading...');
        })

        it("sets button color to #808080", () => {
            expect(submitEmailsButton.style.color).toBe("rgb(128, 128, 128)");
        })

        it("gets emails from form", () => {
            const result = getEmails();
            expect(result).toContainEqual({"name": "Alex", "email": "arootroatch@gmail.com", "index": "0"});
            expect(result).toContainEqual({"name": "Whitney", "email": "whitney@gmail.com", "index": "1"});
            expect(result).toContainEqual({"name": "Hunter", "email": "hunter@gmail.com", "index": "2"});
            expect(result).toContainEqual({"name": "Megan", "email": "megan@gmail.com", "index": "3"});
        })

        it("invokes getEmails", () => {
            expect(getEmails).toHaveBeenCalled();
        })

        it("sets email, id, and date for each giver", () => {
            const date = new Date().toISOString();
            const givers = [
                [state.givers[0], "arootroatch@gmail.com"],
                [state.givers[1], "whitney@gmail.com"],
                [state.givers[2], "hunter@gmail.com"],
                [state.givers[3], "megan@gmail.com"]];

            givers.forEach(([giver, email]) => {
                expect(giver.email).toBe(email);
                expect(giver.date).toBe(date);
                expect(giver.id).toBe(`4_1ibc1j9_${date}`);
            })
        })

        it("invokes postToServer", async () => {
            expect(global.fetch).toHaveBeenCalledWith("/.netlify/functions/postToDb",
                {"body": JSON.stringify(state.givers), "method": "POST", "mode": "cors"});
        })

        it("displays saved emails success message", async () => {
            const sendDiv = document.getElementById("sendEmails");
            expect(sendDiv.innerHTML).toContain("4 email addresses added successfully!");
            expect(sendDiv.innerHTML).toContain("Now let's send out those emails:");
            expect(sendDiv.innerHTML).toContain(`<button class="button" id="sendEmailsBtn">Send Emails</button>`);
            expect(sendDiv.classList).not.toContain("hidden");
            expect(sendDiv.classList).toContain("show");
        })

        it("hides email table after saving emails", async () => {
            const table = document.getElementById("emailTable");
            expect(table.classList).toContain("hide");
            setTimeout(() => {
                expect(table.classList).not.toContain("hide");
                expect(table.classList).not.toContain("show");
                expect(table.classList).toContain("hidden");
            })
        })

    })

    describe("batchEmails", () => {
        let sendEmailsButton;
        beforeEach(() => {
            alex.recipient = "Whitney";
            whitney.recipient = "Hunter";
            hunter.recipient = "Megan";
            megan.recipient = "Alex";
            installGivers([alex, whitney, hunter, megan]);
            displaySendEmails();
            sendEmailsButton = document.getElementById("sendEmailsBtn");
            click("#sendEmailsBtn");
        })

        it("sets button text to Loading...", () => {
            expect(sendEmailsButton.innerHTML).toContain('Loading...');
            expect(sendEmailsButton.style.color).toBe("rgb(128, 128, 128)");
        });

        it("sends emails for each giver", () => {
            state.givers.forEach((giver) => {
                expect(global.fetch).toHaveBeenCalledWith("/.netlify/functions/dispatchEmail", {
                    "body": JSON.stringify({
                        name: giver.name,
                        recipient: giver.recipient,
                        email: giver.email
                    }),
                    "method": "POST",
                    "mode": "cors"
                });
            })
        })

        it("hides sendEmails popup", () => {
            const sendEmails = document.getElementById("sendEmails");
            expect(sendEmails.classList).toContain("hide");
            setTimeout(() => {
                expect(sendEmails.classList).not.toContain("hide");
                expect(sendEmails.classList).not.toContain("show");
                expect(sendEmails.classList).toContain("hidden");
            }, 500);
        })

        it("displays success snackbar with number of emails sent", () => {
            const snackbar = document.getElementById("snackbar");
            expect(snackbar.innerHTML).toContain("Sent 4 of 4 emails successfully!");
            expect(snackbar.style.color).toBe("rgb(25, 140, 10)");
            expect(snackbar.style.border).toBe("2px solid #198c0a");
        });
    })

    describe("getName", () => {
        let emailQueryBtn;
        const query = document.getElementById("query");
        stubFetch(true, 200, {recipient: "Whitney", date: "2023-01-01T00:00:00.000Z"});

        beforeEach(() => {
            emailQueryBtn = document.getElementById("emailQueryBtn");
            click("#emailQueryBtn");
        })

        it("sets button text to Loading...", () => {
            expect(emailQueryBtn.innerHTML).toContain('Loading...');
            expect(emailQueryBtn.style.color).toBe("rgb(128, 128, 128)");
        })

        it("displays recipient and date", () => {
            expect(query.innerHTML).toContain("As of Sat Dec 31 2022, you're buying a gift for");
            expect(query.innerHTML).toContain("Whitney!");
        })

        it("allows multiple searches", async () => {
            expect(query.innerHTML).toContain("As of Sat Dec 31 2022, you're buying a gift for");
            expect(query.innerHTML).toContain("Whitney!");
            stubFetch(true, 200, {recipient: "Hunter", date: "2023-01-01T00:00:00.000Z"});
            click("#emailQueryBtn");
            await waitFor(() => expect(query.innerHTML).toContain("Hunter!"));
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
})


