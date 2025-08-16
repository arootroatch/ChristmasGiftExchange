import state from "./state.js";
import {emailInput} from "./htmlComponents";
import {addEventListener, unshiftHTMl} from "./utils";

addEventListener("hideEmails", "click", hideEmailTable);


// collect emails
function showEmailTable() {
    if (!state.generated) {
        showSnackbar(
            `Please click "Generate List" before entering emails.`,
            "error"
        );
    } else {
        const table = document.getElementById("emailTable");
        const body = document.getElementById("emailTableBody");
        // use a for loop instead of forEach to get access to the index --
        // this will be used later for adding the emails to the giver objects
        for (let i = 0; i < state.givers.length; i++) {
            unshiftHTMl("emailTableBody", emailInput(i))
        }
        table.classList.replace("hidden", "show");
        if (!state.secretSanta) {
            document.getElementById("hideEmails").style.display = "block";
        }
    }
}

function hideEmailTable() {
    const table = document.getElementById("emailTable");
    document.getElementById("hideEmails").style.display = "none";
    table.classList.replace("show", "hide");
    setTimeout(() => {
        table.classList.replace("hide", "hidden");
    }, 500);
}

// snackbar
function showSnackbar(message, status) {
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

export {showEmailTable, showSnackbar};
