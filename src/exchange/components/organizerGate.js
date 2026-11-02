import {selectElement} from "../../utils.js";
import {showError} from "../../Snackbar.js";
import {authGateTemplate, initAuthGate} from "../../authGate.js";
import btnStyles from '../../../assets/styles/exchange/components/buttons.module.css';
import dialogStyles from '../../../assets/styles/exchange/components/email-dialog.module.css';

const containerId = "organizerFormContainer";

export function removeOrganizerGate() {
  selectElement(`#${containerId}`)?.remove();
}

export function showOrganizerGate({heading, onSuccess}) {
  removeOrganizerGate();
  const html = `<div id="${containerId}" class="${dialogStyles.organizerFormContainer} show">${authGateTemplate({heading, showName: true, buttonClass: btnStyles.button})}</div>`;
  document.body.insertAdjacentHTML("beforeend", html);
  initAuthGate({
    onSuccess: () => {
      removeOrganizerGate();
      onSuccess();
    },
    onError: (msg) => showError(msg),
    showName: true,
  });
}
