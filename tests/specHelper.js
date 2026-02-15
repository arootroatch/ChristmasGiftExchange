import {addHouseToState, state, startExchange} from "../src/state";
import {expect, vi} from "vitest";
import {indexHtml} from "../setupTests";
import {selectElement} from "../src/utils";
import * as house from "../src/components/House";
import * as name from "../src/components/Name";
import * as nameList from "../src/components/NameList";
import * as select from "../src/components/Select";
import * as controlStrip from "../src/components/ControlStrip/ControlStrip";
import * as nextStepButton from "../src/components/ControlStrip/NextStepButton";
import * as addHouseButton from "../src/components/ControlStrip/AddHouseButton";
import * as generateButton from "../src/components/ControlStrip/GenerateButton";
import * as instructions from "../src/components/Instructions";
import * as snackbar from "../src/components/Snackbar";

let isReactiveSystemInitialized = false;

export function initReactiveSystem() {
  if (!isReactiveSystemInitialized) {
    snackbar.init();
    house.init();
    name.init();
    nameList.init();
    select.init();
    controlStrip.init();
    nextStepButton.init();
    addHouseButton.init();
    generateButton.init();
    instructions.init();
    isReactiveSystemInitialized = true;
  }
}

export function installGivers(givers) {
  state.givers = givers;
}

export function stubFetch(ok, status, body) {
  global.fetch = vi.fn(() => Promise.resolve({
    ok: ok,
    status: status,
    json: () => Promise.resolve(body)
  }));
}

export function stubFetchError(message) {
  global.fetch = vi.fn(() => Promise.reject({
    status: 500,
    message: message
  }));
}

export function installGiverNames(...giverNames) {
  giverNames.forEach((name) => {
    state.givers.push({name: name, recipient: "", email: "", date: "", id: ""});
  })
}

export function shouldSelect(selector) {
  expect(document.querySelector(selector)).not.toBeNull();
}

export function shouldNotSelect(selector) {
  expect(document.querySelector(selector)).toBeNull();
}

export function shouldNotDisplay(selector) {
  expect(document.querySelector(selector).style.display).toBe("none");
}

export function shouldBeDraggable(selector) {
  expect(document.querySelector(selector).draggable).toBe(true);
}

export function stubPropertyByID(thing, event, func) {
  const element = selectElement(`#${thing}`);
  Object.defineProperty(element, event, {
    configurable: true,
    value: func,
  });
}

export function stubProperty(thing, event, func) {
  Object.defineProperty(thing, event, {
    configurable: true,
    value: func,
  });
}

export function click(selector) {
  const clickEvent = new Event('click', {bubbles: true, cancelable: true});
  const element = document.querySelector(selector);
  element.dispatchEvent(clickEvent);
}

export function change(selector, value) {
  const changeEvent = new Event('change', {bubbles: true, cancelable: true});
  const element = document.querySelector(selector);
  Object.defineProperty(changeEvent, 'target', {
    writable: false,
    value: element
  });
  element.value = value;
  element.dispatchEvent(changeEvent);
}

export function clearNameSelects() {
  let selects = Array.from(document.getElementsByClassName("name-select"));
  selects.map((select) => {
    select.innerHTML = `<option disabled selected value="default">-- Select a name --</option>`;
  });
}

export function resetState() {
  startExchange();
}

export function resetDOM() {
  document.open();
  document.write(indexHtml);
  document.close();
  snackbar.init();
}

export function removeAllNames() {
  const names = document.querySelectorAll(".name-wrapper");
  names.forEach((name) => {
    name.remove();
  });
}

export function removeAllHouses() {
  document.querySelectorAll('.household').forEach(el => el.remove());
}

export function enterName(name) {
  const nameInput = selectElement("#name-input");
  nameInput.value = name;
  click("#add-name-btn");
}

export function addHouseToDOM() {
  const houseNumber = Object.keys(state.houses).length;
  const houseID = `house-${houseNumber}`;
  addHouseToState(houseID);
}

export function addNamesToDOM(...names){
  const input = document.querySelector("#name-input");
  names.forEach(name => {
    input.value = name;
    click("#add-name-btn");
  })
}

export function moveNameToHouse(houseSelector, name) {
  change(houseSelector, name);
}

export function shouldDisplayErrorSnackbar(message) {
  const snackbar = document.querySelector("#snackbar");
  expect(snackbar.classList).toContain("show");
  expectColor(snackbar.style.color, "rgb(179, 30, 32)", "#b31e20");
  expectBorderColor(snackbar.style.border, "3px solid", "rgb(179, 30, 32)", "#b31e20");
  expect(snackbar.innerHTML).toContain(message);
}

export function shouldDisplaySuccessSnackbar(message) {
  const snackbar = selectElement("#snackbar");
  expect(snackbar.innerHTML).toContain(message);
  expectColor(snackbar.style.color, "rgb(25, 140, 10)", "#198c0a");
  expectBorderColor(snackbar.style.border, "2px solid", "rgb(25, 140, 10)", "#198c0a");
}

export function shouldDisplayEmailTable(...names) {
  const table = selectElement("#emailTable");
  const body = selectElement("#emailTableBody");

  expect(table.classList).toContain("show");
  expect(table.classList).not.toContain("hidden");
  expect(body.innerHTML).toContain('class="emailDiv"');
  for (let i = 0; i > names.length; i++) {
    expect(body.innerHTML).toContain(`<label for="${i}">${names[i]}</label>`);
  }
}

export function giverByName(name){
  return state.givers.filter((giver) => giver.name === name)[0];
}

export function expectColor(actual, ...expectedColors) {
  const actualParsed = parseColor(actual);
  const expectedParsed = expectedColors
    .flat()
    .map((color) => parseColor(color))
    .filter((color) => color !== null);

  expect(actualParsed).not.toBeNull();
  expect(expectedParsed.length).toBeGreaterThan(0);

  const matches = expectedParsed.some((expected) => colorsClose(actualParsed, expected));
  expect(matches).toBe(true);
}

export function expectBorderColor(borderValue, expectedPrefix, ...expectedColors) {
  expect(borderValue.startsWith(expectedPrefix)).toBe(true);
  const colorPart = borderValue.slice(expectedPrefix.length).trim();
  expectColor(colorPart, ...expectedColors);
}

function parseColor(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim().toLowerCase();
  if (trimmed === "transparent") return {r: 0, g: 0, b: 0, a: 0};

  if (trimmed.startsWith("rgb")) {
    const match = trimmed.match(/rgba?\(([^)]+)\)/);
    if (!match) return null;
    const parts = match[1].split(",").map((part) => part.trim());
    const r = Number.parseFloat(parts[0]);
    const g = Number.parseFloat(parts[1]);
    const b = Number.parseFloat(parts[2]);
    const a = parts.length === 4 ? Number.parseFloat(parts[3]) : 1;
    if ([r, g, b, a].some((num) => Number.isNaN(num))) return null;
    return {r, g, b, a};
  }

  if (trimmed.startsWith("#")) {
    const hex = trimmed.slice(1);
    let r;
    let g;
    let b;
    let a = 1;

    if (hex.length === 3 || hex.length === 4) {
      r = Number.parseInt(hex[0] + hex[0], 16);
      g = Number.parseInt(hex[1] + hex[1], 16);
      b = Number.parseInt(hex[2] + hex[2], 16);
      if (hex.length === 4) {
        a = Number.parseInt(hex[3] + hex[3], 16) / 255;
      }
      return {r, g, b, a};
    }

    if (hex.length === 6 || hex.length === 8) {
      r = Number.parseInt(hex.slice(0, 2), 16);
      g = Number.parseInt(hex.slice(2, 4), 16);
      b = Number.parseInt(hex.slice(4, 6), 16);
      if (hex.length === 8) {
        a = Number.parseInt(hex.slice(6, 8), 16) / 255;
      }
      return {r, g, b, a};
    }
  }

  return null;
}

function colorsClose(actual, expected) {
  const channelTolerance = 0.5;
  const alphaTolerance = 0.01;
  return (
    Math.abs(actual.r - expected.r) <= channelTolerance &&
    Math.abs(actual.g - expected.g) <= channelTolerance &&
    Math.abs(actual.b - expected.b) <= channelTolerance &&
    Math.abs(actual.a - expected.a) <= alphaTolerance
  );
}
