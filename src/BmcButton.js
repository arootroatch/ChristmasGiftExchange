import {isBmcConsented} from "./CookieBanner.js";

const bmcContainerId = "bmc-button-container";
const bmcImageUrl = "https://img.buymeacoffee.com/button-api/?text=Buy me a coffee&emoji=☕&slug=arootroatch&button_colour=69292a&font_colour=ffffff&font_family=Arial&outline_colour=ffffff&coffee_colour=FFDD00";

export function bmcButtonHtml() {
  const hint = isBmcConsented()
    ? `<p class="bmc-hint">Or click the coffee cup in the bottom right to contribute without leaving the page.</p>`
    : "";
  return `<div id="${bmcContainerId}"><p>Love the site? Become a supporter! No account necessary.</p><a href="https://buymeacoffee.com/arootroatch" target="_blank"><img src="${bmcImageUrl}" alt="Buy Me A Coffee" style="height:60px;width:217px;"></a>${hint}</div>`;
}
