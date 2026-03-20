const CONSENT_KEY = "cookie-consent";
const bannerId = "cookie-banner";

function template() {
  return `<div id="${bannerId}">
    <div class="cookie-banner-message"><img class="bmc-logo" src="https://cdn.buymeacoffee.com/buttons/bmc-new-btn-logo.svg" alt="BMC"><p class="cookie-banner-text">This site uses cookies from <strong>Buy Me a Coffee</strong> to power the support widget. That's it — no tracking, no ads.</p></div>
    <div class="cookie-banner-buttons">
      <button class="cookie-btn cookie-btn-reject" id="cookie-reject">Reject</button>
      <button class="cookie-btn cookie-btn-accept" id="cookie-accept">Accept</button>
    </div>
  </div>`;
}

export function loadBmcWidget() {
  if (document.querySelector('script[data-name="BMC-Widget"]')) return;
  const script = document.createElement("script");
  script.dataset.name = "BMC-Widget";
  script.dataset.cfasync = "false";
  script.src = "https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js";
  script.dataset.id = "arootroatch";
  script.dataset.description = "Support me on Buy me a coffee!";
  script.dataset.message = "Love the site? Have ideas? Become a supporter! ";
  script.dataset.color = "#FF5F5F";
  script.dataset.position = "Right";
  script.dataset.xMargin = "18";
  script.dataset.yMargin = "18";
  document.head.appendChild(script);
}

function removeBanner() {
  const banner = document.querySelector(`#${bannerId}`);
  if (!banner) return;
  banner.classList.add("dismissing");
  banner.addEventListener("animationend", () => banner.remove());
}

function accept() {
  localStorage.setItem(CONSENT_KEY, "accepted");
  removeBanner();
  loadBmcWidget();
}

function reject() {
  localStorage.setItem(CONSENT_KEY, "rejected");
  removeBanner();
}

function attachListeners() {
  document.querySelector("#cookie-accept").addEventListener("click", accept);
  document.querySelector("#cookie-reject").addEventListener("click", reject);
}

export function isBmcConsented() {
  return localStorage.getItem(CONSENT_KEY) === "accepted";
}

export function init() {
  const consent = localStorage.getItem(CONSENT_KEY);
  if (consent === "accepted") {
    loadBmcWidget();
    return;
  }
  if (consent === null) {
    document.body.insertAdjacentHTML("beforeend", template());
    attachListeners();
  }
}
