import {initDragDrop} from "./dragDrop.js";
import * as house from "./components/House.js";
import * as name from "./components/Name.js";
import * as nameList from "./components/NameList.js";
import * as select from "./components/Select.js";
import * as resultsTable from "./components/ResultsTable.js";
import * as controlStrip from "./components/ControlStrip/ControlStrip.js";
import * as nextStepButton from "./components/ControlStrip/NextStepButton.js";
import * as addHouseButton from "./components/ControlStrip/AddHouseButton.js";
import * as generateButton from "./components/ControlStrip/GenerateButton.js";
import * as instructions from "./components/Instructions.js";
import * as emailTable from "./components/EmailTable/EmailTable.js";
import * as recipientSearch from "./components/RecipientSearch.js";
import * as reuseLink from "./components/ReuseLink.js";
import * as snackbar from "../Snackbar.js";
import {loadExchange, startExchange} from "./state.js";
import {leftContainerId, selectElement} from "../utils.js";

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
  recipientSearch.init();
  reuseLink.init();

  const letsGo = selectElement("#letsGo");
  const secretSantaBtn = selectElement("#secretSantaBtn");
  if (letsGo) letsGo.onclick = () => startExchange(false);
  if (secretSantaBtn) secretSantaBtn.onclick = secretSantaMode;

  initDragDrop();

  const reuseData = sessionStorage.getItem("reuseExchange");
  if (reuseData) {
    sessionStorage.removeItem("reuseExchange");
    loadExchange(JSON.parse(reuseData));
  }

  const snackbarError = sessionStorage.getItem("snackbarError");
  if (snackbarError) {
    sessionStorage.removeItem("snackbarError");
    snackbar.showError(snackbarError);
  }
}
