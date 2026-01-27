import state from "../resources/js/state";
import {expect, vi} from "vitest";
import {indexHtml} from "../setupTests";
import * as snackbar from "../resources/js/components/snackbar";

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
  const element = document.getElementById(thing);
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
  state = {
    houses: [],
    isGenerated: false,
    introIndex: 0,
    isSecretSanta: false,
    givers: [],
    houseID: 0,
    nameNumber: 1,
  }
}

export function resetDOM() {
  document.open();
  document.write(indexHtml);
  document.close();
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
  const nameInput = document.getElementById("input0");
  nameInput.value = name;
  click("#b0");
}

export function addHouseToDOM() {
  click("#addHouse");
}

export function moveNameToHouse(houseSelector, name) {
  change(houseSelector, name);
}

export function shouldDisplayErrorSnackbar(message) {
  const snackbar = document.querySelector("#snackbar");
  expect(snackbar.classList).toContain("show");
  expect(snackbar.style.color).toBe("rgb(179, 30, 32)");
  expect(snackbar.style.border).toBe("3px solid #b31e20");
  expect(snackbar.innerHTML).toContain(message);
}

export function shouldDisplaySuccessSnackbar(message) {
  const snackbar = document.getElementById("snackbar");
  expect(snackbar.innerHTML).toContain(message);
  expect(snackbar.style.color).toBe("rgb(25, 140, 10)");
  expect(snackbar.style.border).toBe("2px solid #198c0a");
}

export function shouldDisplayEmailTable(...names) {
  const table = document.getElementById("emailTable");
  const body = document.getElementById("emailTableBody");

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

