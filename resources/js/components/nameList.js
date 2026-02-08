import {addGiver} from "../state.js";
import {addEventListener, selectElement} from "../utils.js";

const b0Id = "b0";
const inputId = "input0";

export function init() {
  addEventListener(`#${b0Id}`, "click", () => {
    const nameInput = selectElement(`#${inputId}`);
    const name = nameInput.value;
    if (name !== "") {
      addGiver(name.charAt(0).toUpperCase() + name.slice(1));
      nameInput.value = "";
    }
  });
}
