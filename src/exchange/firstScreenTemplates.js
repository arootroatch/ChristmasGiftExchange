import cardStyles from '../../assets/styles/exchange/components/mode-cards.module.css';

export const introId = "intro";

function modeCard(id, title, description) {
  return `<button class="${cardStyles.modeCard}" id="${id}">
    <h3 class="${cardStyles.modeCardTitle}">${title}</h3>
    <p class="${cardStyles.modeCardDesc}">${description}</p>
  </button>`;
}

export function introTemplate() {
  return `<div id="${introId}">
    <div class="${cardStyles.modesContainer}">
      ${modeCard("letsGo", "Quick Match", "Draw names for a gift exchange. See the full list right away &mdash; good for grab bags or when keeping it secret doesn't matter.")}
      ${modeCard("secretSantaBtn", "Secret Santa Mode", "Keep it a surprise, with the full toolkit: we privately email each person their recipient, plus anonymous wishlist sharing, contact info exchange, and a lookup page in case someone missed their email.")}
      ${modeCard("namesFromHatBtn", "Names from a Hat", "No emails needed. Get one link to share with everyone &mdash; each person opens it, picks their name, and sees who they're buying for.")}
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
