import {getSessionUser, clearSession} from "../../session.js";
import {escape} from "../../utils.js";
import {ExchangeEvents as Events, exchangeEvents as stateEvents} from "../state.js";
import styles from '../../../assets/styles/exchange/components/navbar.module.css';

const navbarId = "navbar";
const logoutId = "navbar-logout";

function template(user) {
  const rightSide = user
    ? `<div class="${styles.userInfo}">
        <span><span class="${styles.loginPrefix}">Logged in as </span><strong class="${styles.userName}">${escape(user.name)}</strong></span>
        <button id="${logoutId}" class="${styles.logoutBtn}">
          <svg class="${styles.logoutIcon}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Log out
        </button>
      </div>`
    : '';

  return `<nav id="${navbarId}" class="${styles.navbar}">
    <a class="${styles.siteLink}" href="/">
      <img class="${styles.favicon}" src="/favicon-32x32.png" alt="" width="24" height="24">
      <span class="${styles.siteTitle}">Gift Exchange Generator</span>
    </a>
    ${rightSide}
  </nav>`;
}

export function init() {
  const container = document.getElementById("container");
  container.insertAdjacentHTML("beforebegin", template(getSessionUser()));

  const logoutBtn = document.getElementById(logoutId);
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await fetch("/.netlify/functions/api-auth-logout-post", {method: "POST"});
      clearSession();
      document.getElementById(navbarId)?.remove();
    });
  }

  stateEvents.on(Events.EXCHANGE_STARTED, () => {
    const title = document.getElementById("exchange-title");
    if (title) title.hidden = true;
  });
}
