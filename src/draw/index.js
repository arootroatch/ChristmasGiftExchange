import {apiFetch, selectElement, escape, escapeAttr} from "../utils.js";
import {getState, setExchangeId, setNames, setNotFound, selectName, cancelConfirm} from "./state.js";

function notFoundHtml() {
  return `<p>This link isn't valid. Check with your organizer.</p>`;
}

function loadingHtml() {
  return `<div class="spinner-container"><div class="spinner"></div></div>`;
}

function pickerHtml() {
  const {names, errorMessage} = getState();
  const rows = names.map(({name, hasDrawn}) => `
    <button data-name="${escapeAttr(name)}" ${hasDrawn ? "disabled" : ""}>
      ${escape(name)}${hasDrawn ? " (Already viewed)" : ""}
    </button>`).join("");
  return `
    ${errorMessage ? `<p>${escape(errorMessage)}</p>` : ""}
    <p>Pick your name:</p>
    ${rows}`;
}

function confirmHtml() {
  const {selectedName} = getState();
  return `
    <p>You're about to reveal as <strong>${escape(selectedName)}</strong> — you can only do this once. Continue?</p>
    <button id="confirm-draw-btn">Continue</button>
    <button id="confirm-back-btn">Back</button>`;
}

function render() {
  const content = selectElement("#draw-content");
  const {screen} = getState();
  if (screen === "loading") content.innerHTML = loadingHtml();
  if (screen === "notFound") content.innerHTML = notFoundHtml();
  if (screen === "picker") content.innerHTML = pickerHtml();
  if (screen === "confirm") content.innerHTML = confirmHtml();
  attachListeners();
}

function attachListeners() {
  const {screen} = getState();
  if (screen === "picker") {
    document.querySelectorAll("[data-name]").forEach(btn => {
      btn.addEventListener("click", () => {
        selectName(btn.dataset.name);
        render();
      });
    });
  }
  if (screen === "confirm") {
    selectElement("#confirm-back-btn").addEventListener("click", () => {
      cancelConfirm();
      render();
    });
    // #confirm-draw-btn handling is added in Task 14
  }
}

function loadNames(exchangeId) {
  return apiFetch(`/.netlify/functions/api-link-exchange-get?exchangeId=${exchangeId}`, {
    method: "GET",
    onSuccess: (data) => {
      setNames(data.names);
      render();
    },
    onError: () => {
      setNotFound();
      render();
    },
  });
}

export async function main() {
  const id = new URLSearchParams(window.location.search).get("id");
  if (!id) {
    setNotFound();
    render();
    return;
  }
  setExchangeId(id);
  render();
  await loadNames(id);
}
