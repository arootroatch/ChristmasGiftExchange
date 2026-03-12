import {ExchangeEvents as Events, exchangeEvents as stateEvents, startExchange} from "../state.js";
import {leftContainerId, selectElement} from "../../utils.js";

export const instructions = [
  `<span style="font-weight:bold">Step 1 / 4:</span> Enter the names of everyone participating in the gift exchange. Make sure all names are unique. If two people have the same name, please add a last initial or nickname.`,
  `<span style="font-weight:bold">Step 2 / 4</span> (optional): Who should NOT get who? <br><br>For example, a couple may not want to be able to get each other's names at the family gift exchange because they will already be getting each other gifts outside the exchange. <br><br> In that case, you can put them in an exclusion group together. Names in the same group will not get each other as recipients.<br><br> Click "Add Group." Then,  you can drag and drop to move people around or select their name from the drop-down in each box.`,
  `<span style="font-weight:bold">Step 3 / 4:</span> Click "Generate List!"`,
];

const introId = "intro";
let animating = false;

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

function renderStepInstructions({step}) {
  if (!step || step < 1 || step > instructions.length) return;
  const introDiv = selectElement(`#${introId}`);
  if (!introDiv) return;

  const newContent = `<p class="slide-in-right">${instructions[step - 1]}</p>`;
  const paragraph = introDiv.querySelector('p.slide-in-right');

  // First render or no animated paragraph yet — just replace
  if (!paragraph) {
    introDiv.innerHTML = newContent;
    return;
  }

  // Guard against rapid clicks during animation
  if (animating) return;
  animating = true;

  // Animate out, then swap and animate in
  paragraph.classList.remove('slide-in-right');
  paragraph.classList.add('slide-out-left');
  paragraph.addEventListener('animationend', () => {
    introDiv.innerHTML = newContent;
    animating = false;
  }, {once: true});
}

export function resetAnimating() {
  animating = false;
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
  stateEvents.on(Events.EXCHANGE_STARTED, renderStepInstructions);
  stateEvents.on(Events.NEXT_STEP, renderStepInstructions);
}
