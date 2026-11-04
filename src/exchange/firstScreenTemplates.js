export const introId = "intro";

const noContactInfoTag = "No contact or personal info required";

const arrowIcon = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`;

function modeCard(styles, id, title, description, {featured = false, isNew = false, tag = null} = {}) {
  const card = styles.modeCard || "modeCard";
  const cardFeatured = styles.modeCardFeatured || "modeCardFeatured";
  const cardTitle = styles.modeCardTitle || "modeCardTitle";
  const cardDesc = styles.modeCardDesc || "modeCardDesc";
  const newBadge = styles.modeCardNewBadge || "modeCardNewBadge";
  const cardTag = styles.modeCardTag || "modeCardTag";
  const cardArrow = styles.modeCardArrow || "modeCardArrow";
  return `<button class="${featured ? `${card} ${cardFeatured}` : card}" id="${id}">
    <h3 class="${cardTitle}">${title}${isNew ? ` <span class="${newBadge}">New</span>` : ""}</h3>
    <p class="${cardDesc}">${description}</p>${tag ? `
    <span class="${cardTag}">${tag}</span>` : ""}
    <span class="${cardArrow}" aria-hidden="true">${arrowIcon}</span>
  </button>`;
}

export function introTemplate(styles = {}) {
  const modesContainer = styles.modesContainer || "modesContainer";
  const modesHeading = styles.modesHeading || "modesHeading";
  return `<div id="${introId}">
    <h2 class="${modesHeading}">How do you want to draw names?</h2>
    <div class="${modesContainer}">
      ${modeCard(styles, "namesFromHatBtn", "Names from a Hat", "No emails needed. Get one link to share with everyone &mdash; each person opens it, picks their name, and sees who they're buying for.", {featured: true, isNew: true, tag: noContactInfoTag})}
      ${modeCard(styles, "secretSantaBtn", "Secret Santa Mode", "Keep it a surprise, with the full toolkit: we privately email each person their recipient, plus anonymous wishlist sharing, contact info exchange, and a lookup page in case someone missed their email.", {tag: "Email addresses required"})}
      ${modeCard(styles, "letsGo", "Quick Match", "See the full list right away. Draw again as many times as you like, then (optionally) email the results to yourself or to the participants. Good for grab bags or when keeping it secret doesn't matter.", {tag: noContactInfoTag})}
    </div>
    <p>
      This site will always be free to use and your information will never be sold.
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
