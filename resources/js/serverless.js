import {showSnackbar} from "./scripts.js";
import state from "./state.js";

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

function displaySendEmails() {
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

function hideEmailTable() {
    const table = document.getElementById("emailTable");
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
                hideEmailTable();
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
    setLoadingState("sendEmails");

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
        const sendEmails = document.getElementById("sendEmails");
        sendEmails.classList.add("hide");
        setTimeout(() => {
            sendEmails.classList.replace("show", "hidden");
            sendEmails.classList.remove("hide");
        }, 500);
        showSnackbar(
            `Sent ${count} of ${state.givers.length} emails successfully!`,
            "success"
        );
    });
}


document.getElementById("emailQueryBtn").addEventListener("click", getName);

async function getName(e) {
    e.preventDefault;
    let email = document.getElementById("emailQuery").value;
    const btn = document.getElementById("emailQueryBtn");
    btn.innerHTML = "Loading...";
    btn.style.color = "#808080";

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
        document.getElementById("query").innerHTML = `
    <div style="color:#b31e20">
        Email address not found!
    </div>
    `;
        setTimeout(() => {
            document.getElementById("query").innerHTML = `
        <label for="emailQuery">
            Need to know who you're buying a gift for?
        </label>
        <div>
            <input
                type="email"
                maxlength="100"
                id="emailQuery"
                placeholder="Enter your email to search"
            />
            <button
                type="submit"
                class="button queryBtn"
                onclick="getName(this)"
                id="emailQueryBtn"
            >
            Search it!
            </button>
        </div>
      `;
        }, 2000);
    } else {
        let timestamp = Date.parse(results.date);
        let date = new Date(timestamp);
        document.getElementById("query").innerHTML = `
      <div>
          As of ${date.toDateString()}, you're buying a gift for  <span>${
            results.recipient
        }!</span>
    </div>
    <div>
            <input
                type="email"
                maxlength="100"
                id="emailQuery"
                placeholder="Enter your email to search"
            />
            <button
                type="submit"
                class="button queryBtn"
                onclick="getName(this)"
                id="emailQueryBtn"
            >
            Search it!
            </button>
        </div>
    `;
    }
}
