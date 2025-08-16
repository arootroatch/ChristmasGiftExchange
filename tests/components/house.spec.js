import {beforeEach, describe, expect, it, vi} from "vitest";
import {
    change,
    clearNameSelects,
    click,
    removeAllNames,
    resetState,
    shouldSelect,
    stubProperty,
    stubPropertyByID
} from "../specHelper";
import {addEventListener} from "../../resources/js/utils";
import "../../resources/js/scripts";
import "../../resources/js/components/name";
import {addHouse, deleteHouse, insertNameFromSelect} from "../../resources/js/components/house";

describe('addHouse', () => {
    vi.mock(import("/resources/js/utils.js"), async (importOriginal) => {
        const original = await importOriginal();
        return {
            ...original,
            addEventListener: vi.fn(original.addEventListener),
        };
    });

    beforeEach(() => {
        resetState();
        click("#addHouse");
    })

    it('should add house to DOM', () => {
        shouldSelect("#select-0");
        shouldSelect("#house-0");
        shouldSelect("#delete-0");
    });

    it('adds click event listener to delete house button', () => {
        expect(addEventListener).toHaveBeenCalledWith("delete-0", "click", deleteHouse);
    });

    it('adds change event listener to name select', () => {
        expect(addEventListener).toHaveBeenCalledWith("select-0", "change", insertNameFromSelect);
    });
});

describe("deleteHouse", () => {
    beforeEach(() => {
        resetState();
        removeAllNames();
        document.getElementById("input0").value = "Alex";
        click("#b0");
        document.getElementById("input0").value = "Whitney";
        click("#b0");
        addHouse();
        const nameContainer = document.querySelector("#house-0 .name-container");
        const nameWrappers = Array.from(document.querySelectorAll("#participants .name-wrapper"));
        nameWrappers.forEach(wrapper => {
            nameContainer.appendChild(wrapper);
        });
    });

    it("puts names back in participants list", () => {
        expect(document.querySelectorAll("#house-0 .name-container .name-wrapper").length).toBe(2);
        click("#delete-0")
        const participants = document.getElementById("participants");
        const participantNames = Array.from(participants.querySelectorAll(".name-wrapper"));
        expect(participantNames.length).toBe(2);
        expect(document.querySelector("#house-0 .name-container .name-wrapper")).toBeNull();
    });

    it("deletes houseDiv", () => {
        const houseDiv = document.getElementById("house-0");
        const removeSpy = vi.fn();
        stubProperty(houseDiv, "remove", removeSpy)
        click("#delete-0");
        expect(removeSpy).toHaveBeenCalled();
    })
});

describe('insertNameFromSelect', () => {
    let select;
    beforeEach(() => {
        resetState();
        clearNameSelects();
        document.getElementById("input0").value = "Alex";
        click("#b0");
        addHouse();
        select = document.getElementById("select-0");
    })

    it('sets select back to default', () => {
        change("#select-0", "Alex");
        expect(select.textContent).toContain("-- Select a name --");
    });

    it("adds name to house div and removes from participant list", () => {
        const appendChildSpy = vi.fn();
        stubProperty(select.previousElementSibling, "appendChild", appendChildSpy);
        change("#select-0", "Alex");
        const nameDiv = document.getElementById("wrapper-Alex");
        expect(appendChildSpy).toHaveBeenCalledWith(nameDiv);
    })

    it("adds name to participant list and removes from house div", () => {
        const appendChildSpy = vi.fn();
        stubPropertyByID("participants", "appendChild", appendChildSpy);
        change("#name-list-select", "Alex");
        const nameDiv = document.getElementById("wrapper-Alex");
        expect(appendChildSpy).toHaveBeenCalledWith(nameDiv);
    })
});
