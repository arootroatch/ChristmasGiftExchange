import {apiFetch, selectElement, escape} from "../utils.js";
import {getState, setExchangeId, setNames, setNotFound, selectName, cancelConfirm, setRevealed, setDrawError} from "./state.js";
import {comboboxTemplate, initCombobox} from "./NameCombobox.js";
import * as navbar from "../Navbar.js";
import * as cookieBanner from "../CookieBanner.js";
import {bmcButtonHtml} from "../BmcButton.js";
import {loadSession} from "../session.js";
import cardStyles from '../../assets/styles/dashboard/components/cards.module.css';
import btnStyles from '../../assets/styles/dashboard/components/buttons.module.css';

function notFoundHtml() {
  return `<p>This link isn't valid. Check with your organizer.</p>`;
}

function loadingHtml() {
  return `<div class="spinner-container"><div class="spinner"></div></div>`;
}

function pickerHtml() {
  const {errorMessage} = getState();
  return `
    ${errorMessage ? `<p role="alert">${escape(errorMessage)}</p>` : ""}
    <p>Pick your name to see who you're buying a gift for.</p>
    ${comboboxTemplate()}`;
}

function confirmHtml() {
  const {selectedName} = getState();
  return `
    <p>You're about to reveal as <strong>${escape(selectedName)}</strong> — you can only do this once. Continue?</p>
    <div class="draw-actions">
      <button class="${btnStyles.button} ${btnStyles.primary}" id="confirm-draw-btn">Continue</button>
      <button class="${btnStyles.button} ${btnStyles.modalLeave}" id="confirm-back-btn">Back</button>
    </div>`;
}

function revealHtml() {
  const {selectedName, recipient} = getState();
  return `
    <div class="draw-reveal">
      <p>${escape(selectedName)}, you're buying a gift for:</p>
      <h2 class="draw-recipient">${escape(recipient)}</h2>
    </div>`;
}

function render() {
  const content = selectElement("#draw-content");
  const {screen} = getState();
  let html = "";
  if (screen === "loading") html = loadingHtml();
  if (screen === "notFound") html = notFoundHtml();
  if (screen === "picker") html = pickerHtml();
  if (screen === "confirm") html = confirmHtml();
  if (screen === "reveal") html = revealHtml();
  content.innerHTML = `<div class="${cardStyles.card} card-slide-slow">${html}</div>`;
  attachListeners();
}

function attachListeners() {
  const {screen} = getState();
  if (screen === "picker") {
    initCombobox({
      names: getState().names,
      onSelect: (name) => {
        selectName(name);
        render();
      },
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

async function initNavbar() {
  try { await loadSession(); } catch { /* not logged in — the navbar just omits the user */ }
  navbar.init();
}

export async function main() {
  cookieBanner.init();
  selectElement("#draw-support").innerHTML = bmcButtonHtml();
  const navbarReady = initNavbar();

  const id = new URLSearchParams(window.location.search).get("id");
  if (!id) {
    setNotFound();
    render();
    await navbarReady;
    return;
  }
  setExchangeId(id);
  render();
  await Promise.all([navbarReady, loadNames(id)]);
}
