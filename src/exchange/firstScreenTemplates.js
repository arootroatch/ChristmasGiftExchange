export const introId = "intro";

export function introTemplate(styles = {}) {
  const btn = styles.button || "button";
  const btnBottom = styles.btnBottom || "btn-bottom";
  return `<div id="${introId}">
    <p>
      Drawing names for a gift exchange or Secret Santa? Here's a
      web app to make it easier! <br><br>
      Simply:
    </p>
    <ol>
      <li>Add all participant names</li>
      <li>Separate people who live together into Houses (optional)</li>
      <li>Generate the list</li>
      <li>Send everyone an email with the name of their recipient (optional)</li>
    </ol>
    <p>
      To keep the results a secret, click
      "Secret Santa Mode" instead.
    </p>
    <p>
      This site will always be free to use and your information will never be shared.
    </p>
    <div id="get-started">
      <p>Ready to get started?</p>
      <button class="${btn}" id="letsGo" style="margin-bottom: 0;">Let's go!</button>
      <button class="${btnBottom}" id="secretSantaBtn">Secret Santa Mode</button>
    </div>
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
