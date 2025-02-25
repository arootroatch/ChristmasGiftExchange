import { showSnackbar } from "./scripts.js";
import state from "./state.js";


document.getElementById("emailQueryBtn").addEventListener("click", getName);

export function submitEmails(event) {
  event.preventDefault();

  const btn = document.getElementById("submitEmails");
  btn.innerHTML = "Loading...";
  btn.style.color = "#808080";
  const emailInputs = Array.from(document.getElementsByClassName("emailInput"));
  // create an array of objects with names, emails, and which index in the givers array
  const emails = emailInputs.map((input) => {
    return {
      name: input.name,
      email: input.value.trim(),
      index: input.id,
    };
  });

  // update each giver object with the matching email
  let random = Math.random().toString(20);
  let date = new Date().toISOString();
  emails.forEach((obj) => {
    let i = parseInt(obj.index);
    state.givers[i].email = obj.email;
    state.givers[i].id = `${state.givers.length}_${random}_${date}`;
    state.givers[i].date = date;
  });

  postToServer();

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

  let results = await fetch("/.netlify/functions/postToDb", options).then(
    (response) => {
      if (response.status === 200) {
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

        // hide the emails table
        const table = document.getElementById("emailTable");
        table.classList.add("hide");
        setTimeout(() => {
          table.classList.replace("show", "hidden");
          table.classList.remove("hide");
        }, 500);
      } else {
        console.log(response.body);
      }
    }
  );
}

function batchEmails() {
  const btn = document.getElementById("sendEmails");
  btn.innerHTML = "Loading...";
  btn.style.color = "#808080";

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
