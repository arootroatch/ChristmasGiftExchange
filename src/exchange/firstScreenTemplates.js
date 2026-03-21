export const introId = "intro";

export function introTemplate() {
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
      <button class="button" id="letsGo" style="margin-bottom: 0;">Let's go!</button>
      <button class="btn-bottom" id="secretSantaBtn">Secret Santa Mode</button>
    </div>
  </div>`;
}

export const recipientSearchId = "recipientSearch";
export const recipientSearchBtnId = "recipientSearchBtn";
export const queryDivId = "query";

export const recipientSearchInput =
  `<div>
        <input
            type="email"
            maxlength="100"
            id="${recipientSearchId}"
            placeholder="you@example.com"
        />
        <button
            type="submit"
            class="button queryBtn"
            id="${recipientSearchBtnId}"
        >
        Search it!
        </button>
    </div>`;

export const recipientSearchInit =
  `<label for="${recipientSearchId}">
        Need to know who you're buying a gift for?
    </label>
    ${recipientSearchInput}`;

export function recipientSearchTemplate() {
  return `<div id="${queryDivId}" class="recipientSearch">${recipientSearchInit}</div>`;
}

export function reuseLinkTemplate() {
  return `<div class="reuseLink">
        <label>Been here before?</label>
        <div>
            <a href="/reuse" class="button" style="text-decoration: none; width: auto;">Reuse a Previous Exchange</a>
        </div>
    </div>`;
}
