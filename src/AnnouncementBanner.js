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

// The navbar and dashboard sidebar are fixed to the top of the viewport. Push them below
// the banner while any of it is on screen, so the banner never sits underneath them.
function trackOffset(banner) {
  const root = document.documentElement;
  const update = () => {
    const visible = Math.max(0, banner.getBoundingClientRect().bottom);
    root.style.setProperty("--announcement-offset", `${visible}px`);
  };
  update();
  window.addEventListener("scroll", update, {passive: true});
  window.addEventListener("resize", update);
  return () => {
    window.removeEventListener("scroll", update);
    window.removeEventListener("resize", update);
    root.style.removeProperty("--announcement-offset");
  };
}

export function init({announcement = defaultAnnouncement, now = new Date()} = {}) {
  const {message, expires} = announcement;
  if (!message?.trim() || document.getElementById(bannerId)) return;
  const end = endOfExpiresDay(expires);
  if (!end || now >= end) return;
  if (readDismissed() === message) return;
  // The sticky view-as banner stays on top if it rendered first.
  const viewAsBanner = document.getElementById("view-as-banner");
  if (viewAsBanner) viewAsBanner.insertAdjacentHTML("afterend", template(message));
  else document.body.insertAdjacentHTML("afterbegin", template(message));
  const banner = document.getElementById(bannerId);
  const stopTracking = trackOffset(banner);
  banner.querySelector("button").addEventListener("click", () => {
    writeDismissed(message);
    stopTracking();
    banner.remove();
  });
}
