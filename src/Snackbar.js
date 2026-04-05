import styles from '../assets/styles/components/snackbar.module.css';

let bar;

export function init() {
  if (!bar || !document.contains(bar)) {
    bar = document.createElement('div');
    bar.id = 'snackbar';
    bar.className = `${styles.snackbar} hidden`;
    document.body.appendChild(bar);
  }
  const snackbarError = sessionStorage.getItem("snackbarError");
  if (snackbarError) {
    sessionStorage.removeItem("snackbarError");
    showError(snackbarError);
  }
}

export function showError(message) {
  bar.style.color = "#fff";
  bar.style.border = "1px solid rgba(200, 60, 60, 0.4)";
  bar.style.background = "rgba(140, 30, 30, 0.9)";
  showMessage(message);
}

export function showSuccess(message) {
  bar.style.color = "#fff";
  bar.style.border = "1px solid rgba(44, 184, 24, 0.4)";
  bar.style.background = "rgba(25, 140, 10, 0.9)";
  showMessage(message);
}

function showMessage(message) {
  bar.textContent = message;
  bar.classList.replace("hidden", "show");

  setTimeout(() => {
    bar.classList.add("hide");
  }, 5000);

  setTimeout(() => {
    bar.classList.replace("show", "hidden");
    bar.classList.remove("hide");
  }, 5500);
}
