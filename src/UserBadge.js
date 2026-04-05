import {getSessionUser, clearSession} from "./session.js";
import {escape} from "./utils.js";
import styles from '../assets/styles/components/user-badge.module.css';

const badgeId = "user-badge";
const logoutId = `${badgeId}-logout`;

export function init() {
    const user = getSessionUser();
    if (!user) return;

    remove();

    const html = `<div id="${badgeId}" class="${styles.badge}">
        <span><span class="user-badge-prefix">Logged in as </span><strong>${escape(user.name)}</strong></span>
        <a id="${logoutId}" class="${styles.logout}" href="#">Log out</a>
    </div>`;
    document.body.insertAdjacentHTML("beforeend", html);

    document.getElementById(logoutId).addEventListener("click", async (e) => {
        e.preventDefault();
        await fetch("/.netlify/functions/api-auth-logout-post", {method: "POST"});
        clearSession();
        remove();
    });
}

export function remove() {
    document.getElementById(badgeId)?.remove();
}
