import {apiFetch, selectElement, escape, escapeAttr} from "../utils.js";
import {getState, setExchangeId, setNames, setNotFound, selectName, cancelConfirm, setRevealed, setDrawError} from "./state.js";

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

function revealHtml() {
  const {selectedName, recipient} = getState();
  return `
    <p>${escape(selectedName)}, you're buying a gift for:</p>
    <h2>${escape(recipient)}</h2>`;
}

function render() {
  const content = selectElement("#draw-content");
  const {screen} = getState();
  if (screen === "loading") content.innerHTML = loadingHtml();
  if (screen === "notFound") content.innerHTML = notFoundHtml();
  if (screen === "picker") content.innerHTML = pickerHtml();
  if (screen === "confirm") content.innerHTML = confirmHtml();
  if (screen === "reveal") content.innerHTML = revealHtml();
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
    selectElement("#confirm-draw-btn").addEventListener("click", submitDraw);
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

function submitDraw() {
  const {exchangeId, selectedName} = getState();
  return apiFetch("/.netlify/functions/api-link-draw-post", {
    method: "POST",
    body: {exchangeId, name: selectedName},
    onSuccess: (data) => {
      setRevealed(data.recipient);
      render();
    },
    onError: (msg) => {
      refetchAfterDrawError(exchangeId, msg);
    },
  });
}

function refetchAfterDrawError(exchangeId, msg) {
  return apiFetch(`/.netlify/functions/api-link-exchange-get?exchangeId=${exchangeId}`, {
    method: "GET",
    onSuccess: (data) => {
      setDrawError(msg, data.names);
      render();
    },
    onError: () => {
      setDrawError(msg, getState().names);
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
