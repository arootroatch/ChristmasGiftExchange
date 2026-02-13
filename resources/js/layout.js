import {startExchange} from "./state.js";
import {selectElement} from "./utils";

const leftContainerId = "left-container";
const letsGoId = "letsGo";
const secretSantaBtnId = "secretSantaBtn";

export function secretSantaMode() {
  selectElement(`#${leftContainerId}`).classList.add("secret");
  startExchange(true);
}

export function init() {
  const letsGo = selectElement(`#${letsGoId}`);
  const secretSantaBtn = selectElement(`#${secretSantaBtnId}`);

  if (letsGo) letsGo.onclick = () => startExchange(false);
  if (secretSantaBtn) secretSantaBtn.onclick = secretSantaMode;
}
