const bar = document.querySelector("#snackbar")

export function showError(message) {
  bar.style.color = "#b31e20";
  bar.style.border = "3px solid #b31e20";
  showMessage(message);
}

export function showSuccess(message) {
  bar.style.color = "#198c0a";
  bar.style.border = "2px solid #198c0a";
  showMessage(message);
}

function showMessage(message) {
  bar.innerHTML = message;
  bar.classList.replace("hidden", "show");

  setTimeout(() => {
    bar.classList.add("hide");
  }, 5000);

  setTimeout(() => {
    bar.classList.replace("show", "hidden");
    bar.classList.remove("hide");
  }, 5500);
}