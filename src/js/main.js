import {initDragDrop} from "./dragDrop.js";
import * as house from "../js/components/House.js";
import * as name from "../js/components/Name.js";
import * as nameList from "../js/components/NameList.js";
import * as select from "../js/components/Select.js";
import * as resultsTable from "../js/components/ResultsTable.js";
import * as controlStrip from "../js/components/ControlStrip/ControlStrip.js";
import * as nextStepButton from "../js/components/ControlStrip/NextStepButton.js";
import * as addHouseButton from "../js/components/ControlStrip/AddHouseButton.js";
import * as generateButton from "../js/components/ControlStrip/GenerateButton.js";
import * as instructions from "../js/components/Instructions.js";
import * as emailTable from "../js/components/EmailTable/EmailTable.js";
import * as emailQuery from "../js/components/EmailQuery.js";
import * as sendEmails from "../js/components/EmailTable/SendEmails.js";
import * as snackbar from "../js/components/Snackbar.js";
import {startExchange} from "./state.js";
import {leftContainerId, selectElement} from "./utils.js";

export function secretSantaMode() {
  selectElement(`#${leftContainerId}`).classList.add("secret");
  startExchange(true);
}

export default function main() {
  snackbar.init();
  house.init();
  name.init();
  nameList.init();
  select.init();
  resultsTable.init();
  controlStrip.init();
  nextStepButton.init();
  addHouseButton.init();
  generateButton.init();
  instructions.init();

  emailTable.init();
  emailQuery.init();
  sendEmails.init();

  const letsGo = selectElement("#letsGo");
  const secretSantaBtn = selectElement("#secretSantaBtn");
  if (letsGo) letsGo.onclick = () => startExchange(false);
  if (secretSantaBtn) secretSantaBtn.onclick = secretSantaMode;

  initDragDrop();
}
