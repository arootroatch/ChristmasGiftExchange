import * as generate from "../js/generate.js";
import {initDragDrop} from "./dragDrop.js";
import * as house from "../js/components/house.js";
import * as name from "../js/components/name.js";
import * as select from "../js/components/select.js";
import * as emailTable from "../js/components/emailTable.js";
import * as emailQuery from "../js/components/emailQuery.js";
import { initRenderSubscriptions } from './render.js';
import "../js/layout.js";
import "../js/keybindings.js"
import "../js/components/snackbar.js";

export default function main() {
  house.init();
  name.init();
  select.init();

  initRenderSubscriptions();

  generate.initEventListeners();
  emailTable.initEventListeners();
  emailQuery.initEventListeners();
  initDragDrop();
}
