import styles from '../assets/styles/components/cookie-banner.module.css';

const CONSENT_KEY = "cookie-consent";
const bannerId = "cookie-banner";

function template() {
  return `<div id="${bannerId}" class="${styles.banner}">
    <div class="${styles.message}"><img class="${styles.logo}" src="https://cdn.buymeacoffee.com/buttons/bmc-new-btn-logo.svg" alt="BMC"><p class="${styles.text}">This site uses a session cookie for authentication and optional cookies from <strong>Buy Me a Coffee</strong> to power the support widget. No tracking, no ads.</p></div>
    <div class="${styles.buttons}">
      <button class="${styles.btn} ${styles.btnReject}" id="cookie-reject">Reject</button>
      <button class="${styles.btn} ${styles.btnAccept}" id="cookie-accept">Accept</button>
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
  script.setAttribute("data-x_margin", "18");
  script.setAttribute("data-y_margin", "18");
  script.onload = () => window.dispatchEvent(new Event("DOMContentLoaded"));
  document.head.appendChild(script);
}

function removeBanner() {
  const banner = document.querySelector(`#${bannerId}`);
  if (!banner) return;
  banner.classList.add(styles.dismissing);
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
