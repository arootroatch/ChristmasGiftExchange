import {getViewingAs} from "./session.js";
import * as snackbar from "./Snackbar.js";
import {escape, selectElement} from "./utils.js";
import styles from '../assets/styles/components/viewAsBanner.module.css';

const bannerId = "view-as-banner";

function template({name, email}) {
  return `<div id="${bannerId}" class="${styles.banner}" role="status">
    <span>Viewing as ${escape(name)} (${escape(email)}) — read-only</span>
    <button type="button" class="${styles.exitBtn}">Exit</button>
  </div>`;
}

async function exitViewAs() {
  try {
    const res = await fetch("/.netlify/functions/api-admin-view-as-delete", {method: "DELETE"});
    if (!res.ok) throw new Error("Exit failed");
  } catch {
    snackbar.showError("Failed to exit view-as mode. Try again.");
    return;
  }
  window.location.href = "/admin/users";
}

export function init() {
  const viewingAs = getViewingAs();
  if (!viewingAs || document.getElementById(bannerId)) return;
  document.body.insertAdjacentHTML("afterbegin", template(viewingAs));
  selectElement(`#${bannerId} button`).addEventListener("click", exitViewAs);
}
