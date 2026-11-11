import {getViewingAs} from "./session.js";
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
  await fetch("/.netlify/functions/api-admin-view-as-delete", {method: "DELETE"});
  window.location.href = "/admin/users";
}

export function init() {
  const viewingAs = getViewingAs();
  if (!viewingAs) return;
  document.body.insertAdjacentHTML("afterbegin", template(viewingAs));
  selectElement(`#${bannerId} button`).addEventListener("click", exitViewAs);
}
