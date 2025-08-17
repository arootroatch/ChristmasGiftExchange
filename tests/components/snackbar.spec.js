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
import "../../resources/js/components/name";
import {addHouse, deleteHouse, insertNameFromSelect} from "../../resources/js/components/house";

describe("snackbar", function() {
    it("blah")
})