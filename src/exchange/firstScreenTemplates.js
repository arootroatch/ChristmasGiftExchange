export const introId = "intro";

function modeCard(styles, id, title, description) {
  const card = styles.modeCard || "modeCard";
  const cardTitle = styles.modeCardTitle || "modeCardTitle";
  const cardDesc = styles.modeCardDesc || "modeCardDesc";
  return `<button class="${card}" id="${id}">
    <h3 class="${cardTitle}">${title}</h3>
    <p class="${cardDesc}">${description}</p>
  </button>`;
}

export function introTemplate(styles = {}) {
  const modesContainer = styles.modesContainer || "modesContainer";
  return `<div id="${introId}">
    <div class="${modesContainer}">
      ${modeCard(styles, "letsGo", "Quick Match", "Draw names for a gift exchange. See the full list right away &mdash; good for grab bags or when keeping it secret doesn't matter.")}
      ${modeCard(styles, "secretSantaBtn", "Secret Santa Mode", "Keep it a surprise, with the full toolkit: we privately email each person their recipient, plus anonymous wishlist sharing, contact info exchange, and a lookup page in case someone missed their email.")}
      ${modeCard(styles, "namesFromHatBtn", "Names from a Hat", "No emails needed. Get one link to share with everyone &mdash; each person opens it, picks their name, and sees who they're buying for.")}
    </div>
    <p>
      This site will always be free to use and your information will never be shared.
    </p>
  </div>`;
}

export function dashboardLinkTemplate(styles = {}) {
  const btn = styles.button || "button";
  return `<div class="dashboardLink">
    <p class="dashboardLink-desc">
      Find out who you're buying a gift for, peek at their wishlist, share your own wishes and mailing info with your Secret Santa, or even reuse last year's exchange!
    </p>
    <a href="/dashboard" class="${btn} dashboardLink-btn">Participant Dashboard</a>
  </div>`;
}
