import {ExchangeEvents as Events, exchangeEvents as stateEvents, startExchange} from "../state.js";
import {leftContainerId, selectElement} from "../../utils.js";

const reuseInstruction = `<span style="font-weight:bold">Welcome back!</span><br><br>You can make any changes to the exchange that you wish -- add or delete a group, add or delete a participant, move participants around between groups -- then click "Generate List"!<br><br>Remember, names under "Participant Names" can be matched with anybody, and names in a group won't be matched with anyone in the same group.`;

const introId = "intro";
let hasParticipant = false;
let hasResults = false;

const instructionContent = {
  started: {
    heading: "Add Participants",
    summary: "Enter the names of everyone in the exchange.",
    full: `Enter the names of everyone participating in the gift exchange. Make sure all names are unique. If two people share a name, add a last initial or nickname.`,
  },
  participantAdded: {
    heading: "Exclusion Groups",
    summary: "Create exclusion groups or click Generate List when ready.",
    full: `Want to prevent certain people from getting each other? Create an exclusion group and put them together.<br><br>Click <strong>"Add Group"</strong> to create one, then drag names in or use the dropdown.<br><br><em>When you're ready, click "Generate List."</em>`,
  },
  results: {
    heading: "Your Results",
    summary: 'Click "Email Results" to send assignments.',
    full: `Here are the gift exchange assignments!<br><br>Click <strong>"Email Results"</strong> to send each person an email with the name of their recipient.`,
  },
  secretSantaResults: {
    heading: "Secret Santa Complete",
    summary: "Enter emails below to send assignments.",
    full: `Secret Santa assignments have been generated!<br><br>Enter each participant's email address below to send them their recipient.`,
  },
};

function introTemplate() {
  return `<div id="${introId}">
    <p>
      Drawing names for a gift exchange or Secret Santa? Here's a
      web app to make it easier! <br><br>
      Simply:
    </p>
    <ol>
      <li>Add all participant names</li>
      <li>Sort people into exclusion groups (optional)</li>
      <li>Generate the list</li>
      <li>Send everyone an email with the name of their recipient (optional)</li>
    </ol>
    <p>
      To keep the results a secret, click
      "Secret Santa Mode" instead.
    </p>
    <p>
      This site will always be free to use, doesn't use any cookies, and your information will never be shared.
    </p>
    <div id="get-started">
      <p>Ready to get started?</p>
      <button class="button" id="letsGo" style="margin-bottom: 0;">Let's go!</button>
      <button class="btn-bottom" id="secretSantaBtn">Secret Santa Mode</button>
    </div>
  </div>`;
}

export function secretSantaMode() {
  selectElement(`#${leftContainerId}`).classList.add("secret");
  startExchange(true);
}

function attachButtonHandlers() {
  const letsGo = selectElement("#letsGo");
  const secretSantaBtn = selectElement("#secretSantaBtn");
  if (letsGo) letsGo.onclick = () => startExchange(false);
  if (secretSantaBtn) secretSantaBtn.onclick = secretSantaMode;
}

function sidebarHTML(content) {
  return `<p class="instruction-summary slide-in-right"><strong>${content.heading}</strong> — ${content.summary}<span class="chevron">&#9660;</span></p>
    <div class="instruction-full slide-in-right"><h3>${content.heading}</h3><p>${content.full}</p></div>`;
}

function reuseHTML() {
  return `<div class="instruction-full slide-in-right"><p>${reuseInstruction}</p></div>
    <p class="instruction-summary slide-in-right"><strong>Welcome back!</strong> — Modify the exchange and click Generate List.<span class="chevron">&#9660;</span></p>`;
}

function updateInstructions(html) {
  const introDiv = selectElement(`#${introId}`);
  if (!introDiv) return;

  introDiv.innerHTML = html;

  if (!introDiv.classList.contains("instruction-collapsed") &&
      !introDiv.classList.contains("instruction-expanded")) {
    introDiv.classList.add("instruction-collapsed");
    introDiv.onclick = toggleCollapse;
  }
}

function toggleCollapse() {
  const introDiv = selectElement(`#${introId}`);
  if (!introDiv) return;
  const isCollapsed = introDiv.classList.contains("instruction-collapsed");
  introDiv.classList.toggle("instruction-collapsed", !isCollapsed);
  introDiv.classList.toggle("instruction-expanded", isCollapsed);
}

function onExchangeStarted({isSecretSanta, isReuse}) {
  hasParticipant = false;
  hasResults = false;
  if (isReuse) {
    if (isSecretSanta) {
      selectElement(`#${leftContainerId}`).classList.add("secret");
    }
    updateInstructions(reuseHTML());
    hasParticipant = true;
    return;
  }
  updateInstructions(sidebarHTML(instructionContent.started));
}

function onParticipantAdded() {
  if (hasParticipant) return;
  hasParticipant = true;
  updateInstructions(sidebarHTML(instructionContent.participantAdded));
}

function onRecipientsAssigned({isSecretSanta}) {
  if (hasResults) return;
  hasResults = true;
  const content = isSecretSanta ? instructionContent.secretSantaResults : instructionContent.results;
  updateInstructions(sidebarHTML(content));
}

export function resetAnimating() {
  hasParticipant = false;
  hasResults = false;
}

export function render() {
  const slot = selectElement('[data-slot="instructions"]');
  if (slot) {
    slot.innerHTML = introTemplate();
    attachButtonHandlers();
  }
}

export function init() {
  render();
  stateEvents.on(Events.EXCHANGE_STARTED, onExchangeStarted);
  stateEvents.on(Events.PARTICIPANT_ADDED, onParticipantAdded);
  stateEvents.on(Events.RECIPIENTS_ASSIGNED, onRecipientsAssigned);
}
