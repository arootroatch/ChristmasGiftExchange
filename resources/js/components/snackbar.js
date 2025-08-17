export default function showSnackbar(message, status) {
    const bar = document.getElementById("snackbar");
    if (status === "error") {
        bar.style.color = "#b31e20";
        bar.style.border = "3px solid #b31e20";
    } else if (status === "success") {
        bar.style.color = "#198c0a";
        bar.style.border = "2px solid #198c0a";
    }
    bar.innerHTML = message;
    bar.classList.replace("hidden", "show");
    setTimeout(() => {
        bar.classList.add("hide");
    }, 5000);
    // give the keyframes animation time to run before changing classes
    setTimeout(() => {
        bar.classList.replace("show", "hidden");
        bar.classList.remove("hide");
    }, 5500);
}