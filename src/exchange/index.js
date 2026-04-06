import '../../assets/styles/main.css';
import {initDragDrop} from "./dragDrop.js";
import * as house from "./components/House.js";
import * as name from "./components/Name.js";
import * as nameList from "./components/NameList.js";
import * as select from "./components/Select.js";
import * as resultsTable from "./components/ResultsTable.js";
import * as controlStrip from "./components/ControlStrip/ControlStrip.js";
import * as ghostHouse from "./components/GhostHouse.js";
import * as generateButton from "./components/ControlStrip/GenerateButton.js";
import * as instructions from "./components/Instructions.js";
import * as organizerForm from "./components/OrganizerForm.js";
import * as emailTable from "./components/EmailTable/EmailTable.js";
import * as dashboardLink from "./components/DashboardLink.js";
import * as completionModal from "./components/CompletionModal.js";
import * as snackbar from "../Snackbar.js";
import * as cookieBanner from "../CookieBanner.js";
import * as navbar from "./components/Navbar.js";
import {loadExchange} from "./state.js";
import {loadSession} from "../session.js";

export default async function main() {
  document.body.style.opacity = '1';
  try { await loadSession(); } catch { /* not authenticated or server error — organizer form will handle it */ }
  navbar.init();
  snackbar.init();
  cookieBanner.init();
  house.init();
  name.init();
  nameList.init();
  select.init();
  resultsTable.init();
  controlStrip.init();
  generateButton.init();
  ghostHouse.init();
  instructions.init();

  organizerForm.init();
  emailTable.init();
  completionModal.init();
  dashboardLink.init();

  initDragDrop();

  const reuseData = sessionStorage.getItem("reuseExchange");
  if (reuseData) {
    sessionStorage.removeItem("reuseExchange");
    loadExchange(JSON.parse(reuseData));
  }
}
