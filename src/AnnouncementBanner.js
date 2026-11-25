import defaultAnnouncement from "./announcement.json";
import {escape} from "./utils.js";
import styles from '../assets/styles/components/announcementBanner.module.css';

const bannerId = "announcement-banner";
const storageKey = "dismissedAnnouncement";

function template(message) {
  return `<div id="${bannerId}" class="${styles.banner}" role="status">
    <span class="${styles.message}">${escape(message).replace(/\r?\n/g, "<br>")}</span>
    <button type="button" class="${styles.dismissBtn}">Got it, thanks!</button>
  </div>`;
}

// Storage may be unavailable (private mode, blocked site data). Fail open: show the
// banner, and let dismissal hide it for the current page only.
function readDismissed() {
  try {
    return localStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

function writeDismissed(message) {
  try {
    localStorage.setItem(storageKey, message);
  } catch {
    // ignore
  }
}

// Local midnight after the expires day, or null if expires isn't a real YYYY-MM-DD date.
function endOfExpiresDay(expires) {
  if (typeof expires !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(expires)) return null;
  const [y, m, d] = expires.split("-").map(Number);
  const day = new Date(y, m - 1, d);
  if (day.getMonth() !== m - 1 || day.getDate() !== d) return null;
  return new Date(y, m - 1, d + 1);
}

// The banner is pinned to the top of the viewport. Push the page content and the other
// fixed top elements (navbar, dashboard sidebar, view-as banner) down by its height.
function reserveSpace(banner) {
  const root = document.documentElement;
  const update = () => {
    root.style.setProperty("--announcement-offset", `${banner.getBoundingClientRect().height}px`);
  };
  update();
  document.body.style.paddingTop = "var(--announcement-offset)";
  window.addEventListener("resize", update);
  return () => {
    window.removeEventListener("resize", update);
    root.style.removeProperty("--announcement-offset");
    document.body.style.paddingTop = "";
  };
}

export function init({announcement = defaultAnnouncement, now = new Date()} = {}) {
  const {message, expires} = announcement;
  if (!message?.trim() || document.getElementById(bannerId)) return;
  const end = endOfExpiresDay(expires);
  if (!end || now >= end) return;
  if (readDismissed() === message) return;
  // Keep DOM order matching what renders: the view-as banner sits just below this one.
  const viewAsBanner = document.getElementById("view-as-banner");
  if (viewAsBanner) viewAsBanner.insertAdjacentHTML("afterend", template(message));
  else document.body.insertAdjacentHTML("afterbegin", template(message));
  const banner = document.getElementById(bannerId);
  const releaseSpace = reserveSpace(banner);
  banner.querySelector("button").addEventListener("click", () => {
    writeDismissed(message);
    releaseSpace();
    banner.remove();
  });
}
