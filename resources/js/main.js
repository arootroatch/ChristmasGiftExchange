import * as generate from "../js/generate";
import {initDragDrop} from "./dragDrop";
import * as house from "../js/components/house";
import "../js/layout";
import "../js/keybindings"
import * as name from "../js/components/name";
import * as emailTable from "../js/components/emailTable";
import "../js/components/snackbar";
import "../js/components/emailQuery";

export default function main() {
  house.initEventListeners();
  generate.initEventListeners();
  name.initEventListeners();
  emailTable.initEventListeners();
  initDragDrop();
}

