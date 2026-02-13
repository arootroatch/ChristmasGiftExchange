import {beforeEach, describe, expect, it, vi, afterAll, beforeAll} from "vitest";
import {click, expectColor, stubFetch, stubFetchError} from "../specHelper";
import {init} from "../../resources/js/components/emailQuery";
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

    it("sets button text to Loading...", () => {
        stubFetch(true, 200, {recipient: "Whitney", date: "2023-01-01T00:00:00.000Z"});
        click("#emailQueryBtn");
        expect(emailQueryBtn.innerHTML).toContain('Loading...');
        expectColor(emailQueryBtn.style.color, "rgb(128, 128, 128)", "#808080");
    })

    it("displays recipient and date", () => {
        stubFetch(true, 200, {recipient: "Whitney", date: "2023-01-01T00:00:00.000Z"});
        click("#emailQueryBtn");
        expect(query.innerHTML).toContain("As of Sat Dec 31 2022, you're buying a gift for");
        expect(query.innerHTML).toContain("Whitney!");
    })

    it("allows multiple searches", async () => {
        stubFetch(true, 200, {recipient: "Whitney", date: "2023-01-01T00:00:00.000Z"});
        click("#emailQueryBtn");
        await waitFor(() => {
            expect(query.innerHTML).toContain("Whitney!");
        });

        // Wait a tick to ensure event listener is attached to new button
        await new Promise(resolve => setTimeout(resolve, 0));

        stubFetch(true, 200, {recipient: "Hunter", date: "2023-01-01T00:00:00.000Z"});
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
