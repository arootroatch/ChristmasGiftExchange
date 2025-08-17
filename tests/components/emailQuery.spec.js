import {beforeEach, describe, expect, it} from "vitest";
import {click, stubFetch, stubFetchError} from "../specHelper";
import "../../resources/js/components/emailQuery";
import {waitFor} from "@testing-library/dom";


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