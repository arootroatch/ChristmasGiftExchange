import {beforeEach, describe, expect, it, vi} from "vitest";
import {comboboxTemplate, initCombobox} from "../../src/draw/NameCombobox";

const NAMES = [
  {name: "Alex", hasDrawn: false},
  {name: "Whitney", hasDrawn: true},
  {name: "Sam", hasDrawn: false},
  {name: "Alexis", hasDrawn: false},
];

function setup(names = NAMES) {
  const onSelect = vi.fn();
  document.body.innerHTML = comboboxTemplate();
  initCombobox({names, onSelect});
  return {onSelect, input: document.querySelector('[role="combobox"]'), list: document.querySelector('[role="listbox"]')};
}

function type(input, value) {
  input.value = value;
  input.dispatchEvent(new Event("input", {bubbles: true}));
}

function press(input, key) {
  input.dispatchEvent(new KeyboardEvent("keydown", {key, bubbles: true, cancelable: true}));
}

function optionNames() {
  return [...document.querySelectorAll('[role="option"]')].map(o => o.dataset.name);
}

describe("NameCombobox", () => {
  let ctx;
  beforeEach(() => { ctx = setup(); });

  it("starts closed and links the input to the listbox", () => {
    expect(ctx.input.getAttribute("aria-expanded")).toBe("false");
    expect(ctx.input.getAttribute("aria-controls")).toBe(ctx.list.id);
    expect(ctx.list.hidden).toBe(true);
  });

  it("is labelled for assistive tech", () => {
    expect(document.querySelector(`label[for="${ctx.input.id}"]`)).not.toBeNull();
  });

  it("opens with every name on focus", () => {
    ctx.input.dispatchEvent(new Event("focus"));

    expect(ctx.input.getAttribute("aria-expanded")).toBe("true");
    expect(ctx.list.hidden).toBe(false);
    expect(optionNames()).toEqual(["Alex", "Whitney", "Sam", "Alexis"]);
  });

  it("reopens on click after being dismissed while still focused", () => {
    ctx.input.dispatchEvent(new Event("focus"));
    press(ctx.input, "Escape");
    ctx.input.click();

    expect(ctx.list.hidden).toBe(false);
  });

  it("filters case-insensitively as you type", () => {
    type(ctx.input, "ALEX");

    expect(ctx.list.hidden).toBe(false);
    expect(optionNames()).toEqual(["Alex", "Alexis"]);
  });

  it("matches anywhere in the name", () => {
    type(ctx.input, "tne");

    expect(optionNames()).toEqual(["Whitney"]);
  });

  it("shows a message when nothing matches", () => {
    type(ctx.input, "zzz");

    expect(optionNames()).toEqual([]);
    expect(ctx.list.textContent).toContain("No matching names");
  });

  it("selects a name on click", () => {
    type(ctx.input, "sam");
    document.querySelector('[data-name="Sam"]').click();

    expect(ctx.onSelect).toHaveBeenCalledWith("Sam");
  });

  it("marks drawn names as already viewed and does not select them", () => {
    ctx.input.dispatchEvent(new Event("focus"));
    const drawn = document.querySelector('[data-name="Whitney"]');

    expect(drawn.getAttribute("aria-disabled")).toBe("true");
    expect(drawn.textContent).toContain("Already viewed");
    drawn.click();
    expect(ctx.onSelect).not.toHaveBeenCalled();
  });

  it("does not mark undrawn names as disabled", () => {
    ctx.input.dispatchEvent(new Event("focus"));

    expect(document.querySelector('[data-name="Alex"]').getAttribute("aria-disabled")).toBeNull();
  });

  it("moves through enabled names with arrow keys, skipping drawn ones", () => {
    ctx.input.dispatchEvent(new Event("focus"));

    press(ctx.input, "ArrowDown");
    expect(activeName(ctx.input)).toBe("Alex");
    press(ctx.input, "ArrowDown");
    expect(activeName(ctx.input)).toBe("Sam");
    press(ctx.input, "ArrowUp");
    expect(activeName(ctx.input)).toBe("Alex");
    press(ctx.input, "ArrowUp");
    expect(activeName(ctx.input)).toBe("Alexis");
  });

  it("opens on ArrowDown when closed", () => {
    press(ctx.input, "ArrowDown");

    expect(ctx.list.hidden).toBe(false);
  });

  it("selects the active name on Enter", () => {
    ctx.input.dispatchEvent(new Event("focus"));
    press(ctx.input, "ArrowDown");
    press(ctx.input, "ArrowDown");
    press(ctx.input, "Enter");

    expect(ctx.onSelect).toHaveBeenCalledWith("Sam");
  });

  it("highlights the first enabled match while typing so Enter picks it", () => {
    type(ctx.input, "a");
    press(ctx.input, "Enter");

    expect(ctx.onSelect).toHaveBeenCalledWith("Alex");
  });

  it("does nothing on Enter when no name is active", () => {
    type(ctx.input, "zzz");
    press(ctx.input, "Enter");
    type(ctx.input, "whit");
    press(ctx.input, "Enter");

    expect(ctx.onSelect).not.toHaveBeenCalled();
  });

  it("closes on Escape", () => {
    ctx.input.dispatchEvent(new Event("focus"));
    press(ctx.input, "Escape");

    expect(ctx.list.hidden).toBe(true);
    expect(ctx.input.getAttribute("aria-expanded")).toBe("false");
    expect(ctx.input.hasAttribute("aria-activedescendant")).toBe(false);
  });

  it("closes on blur", () => {
    ctx.input.dispatchEvent(new Event("focus"));
    ctx.input.dispatchEvent(new Event("blur"));

    expect(ctx.list.hidden).toBe(true);
  });

  it("keeps quotes and markup in names intact", () => {
    const tricky = 'Al "<b>The Great</b>"';
    const {input} = setup([{name: tricky, hasDrawn: false}]);
    input.dispatchEvent(new Event("focus"));

    expect(optionNames()).toEqual([tricky]);
    expect(document.querySelector('[role="listbox"] b')).toBeNull();
  });
});

function activeName(input) {
  const id = input.getAttribute("aria-activedescendant");
  const option = document.getElementById(id);
  expect(option.getAttribute("aria-selected")).toBe("true");
  return option.dataset.name;
}
