import {initDragDrop} from "./dragDrop.js";
import * as house from "../js/components/house.js";
import * as name from "../js/components/name.js";
import * as nameList from "../js/components/nameList.js";
import * as select from "../js/components/select.js";
import * as resultsTable from "../js/components/resultsTable.js";
import * as controlStrip from "../js/components/controlStrip/controlStrip.js";
import * as nextStepButton from "../js/components/controlStrip/nextStepButton.js";
import * as addHouseButton from "../js/components/controlStrip/addHouseButton.js";
import * as generateButton from "../js/components/controlStrip/generateButton.js";
import * as instructions from "../js/components/instructions.js";
import * as emailTable from "../js/components/emailTable/emailTable.js";
import * as emailQuery from "../js/components/emailQuery.js";
import * as sendEmails from "../js/components/emailTable/sendEmails.js";
import * as snackbar from "../js/components/snackbar.js";
import * as layout from "../js/layout.js";

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
  layout.init();
  initDragDrop();
}
