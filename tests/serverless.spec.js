// @vitest-environment jsdom

import {beforeEach, describe, expect, it, vi} from 'vitest'
import {getEmails, submitEmails} from '/resources/js/serverless.js'
import state from "../resources/js/state";

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

function installGivers(giverNames) {
    giverNames.forEach((name) => {
        state.givers.push({name: name, recipient: "", email: "", date: "", id: ""});
    })
}


describe('serverless', () => {
    global.fetch = vi.fn(() => Promise.resolve({status: 200}));
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
    renderEmailTable([
        {name: "Alex", email: "arootroatch@gmail.com"},
        {name: "Whitney", email: "whitney@gmail.com"},
        {name: "Hunter", email: "hunter@gmail.com"},
        {name: "Megan", email: "megan@gmail.com"}]);
    installGivers(["Alex", "Whitney", "Hunter", "Megan"]);

    describe("submitEmails", () => {
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

})


