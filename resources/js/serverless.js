import {showSnackbar} from "./scripts.js";
import state from "./state.js";
import {emailQueryError, emailQueryInit, emailQueryResult} from "./htmlComponents";

function setLoadingState(thing) {
    const btn = document.getElementById(thing);
    btn.innerHTML = "Loading...";
    btn.style.color = "#808080";
}

export function getEmails() {
    const emailInputs = Array.from(document.getElementsByClassName("emailInput"));
    return emailInputs.map((input) => {
        return {
            name: input.name,
            email: input.value.trim(),
            index: input.id
        };
    });
}

export function displaySendEmails() {
    const sendDiv = document.getElementById("sendEmails");
    sendDiv.innerHTML = `
          <p>${state.givers.length} email addresses added successfully!</p>
          <p>Now let's send out those emails:</p>
          <button class="button" id="sendEmailsBtn">Send Emails</button>
        `;
    sendDiv.classList.replace("hidden", "show");
    document
        .getElementById("sendEmailsBtn")
        .addEventListener("click", batchEmails);
}

function hideEmailTable(thing) {
    const table = document.getElementById(thing);
    table.classList.add("hide");
    setTimeout(() => {
        table.classList.replace("show", "hidden");
        table.classList.remove("hide");
    }, 500);
}

function updateStateWithEmails(emails) {
    let random = Math.random().toString(20);
    let date = new Date().toISOString();
    emails.forEach((obj) => {
        let i = parseInt(obj.index);
        state.givers[i].email = obj.email;
        state.givers[i].id = `${state.givers.length}_${random}_${date}`;
        state.givers[i].date = date;
    });
}

export function submitEmails(event) {
    event.preventDefault();
    setLoadingState("submitEmails");
    const emails = getEmails();
    updateStateWithEmails(emails);

    postToServer().then(
        (response) => {
            if (response.status === 200) {
                displaySendEmails();
                hideEmailTable("emailTable");
            } else {
                console.log(response.body);
            }
        }
    );

    return false;
}

document
    .getElementById("emailTableBody")
    .addEventListener("submit", (event) => submitEmails(event));

export async function postToServer() {
    const options = {
        method: "POST", // *GET, POST, PUT, DELETE, etc.
        mode: "cors",
        body: JSON.stringify(state.givers), // GET requests can't have a body
    };
    return await fetch("/.netlify/functions/postToDb", options)
}

function batchEmails() {
    setLoadingState("sendEmailsBtn");

    let i = 0;
    let count = 0;
    let promises = state.givers.map(async (giver) => {
        i++;
        await fetch("/.netlify/functions/dispatchEmail", {
            method: "POST",
            mode: "cors",
            body: JSON.stringify({
                name: giver.name,
                recipient: giver.recipient,
                email: giver.email,
            }),
        }).then((response) => {
            if (response.status === 200) {
                count++;
            }
        });
    });
    Promise.all(promises).then(() => {
        hideEmailTable("sendEmails");
        showSnackbar(
            `Sent ${count} of ${state.givers.length} emails successfully!`,
            "success"
        );
    });
}


document.getElementById("emailQueryBtn").addEventListener("click", getName);


async function getName(e) {
    e.preventDefault;
    const email = document.getElementById("emailQuery").value;
    const queryDiv = document.getElementById("query");
    setLoadingState("emailQueryBtn");

    const options = {
        method: "POST", // *GET, POST, PUT, DELETE, etc.
        mode: "cors",
        body: email, // GET requests can't have a body
    };
    let errorMsg = "";
    let results = await fetch("/.netlify/functions/get_name", options)
        .then((response) => response.json())
        .catch((error) => (errorMsg = error));
    if (errorMsg !== "") {
        queryDiv.innerHTML = emailQueryError;
        setTimeout(() => {
            queryDiv.innerHTML = emailQueryInit;
        }, 2000);
    } else {
        let timestamp = Date.parse(results.date);
        let date = new Date(timestamp);
        queryDiv.innerHTML = emailQueryResult(date, results.recipient);
        document.getElementById("emailQueryBtn").addEventListener("click", getName);
    }
}
