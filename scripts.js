let givers = [];
let houses = [];
let houseID = 0;
let isMobile;
let nameNumber = 1;
let availRecipients = []; // for deleting names from the recipient pool
let duplicate;
let generated = false;
let introIndex = 0;
let secretSanta = false;

if (
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  )
) {
  isMobile = true;
} else {
  isMobile = false;
}

// event listener for enter key
function enterClick(evt) {
  if (evt.keyCode === 13) {
    evt.preventDefault();
    document.getElementById("b0").click();
  }
}
function enterAddHouse(evt) {
  if (evt.shiftKey && evt.keyCode === 13) {
    evt.preventDefault;
    document.getElementById("addHouse").click();
  }
}
function enterGenerate(evt) {
  if (evt.ctrlKey && evt.keyCode === 13) {
    evt.preventDefault;
    if (!secretSanta) {
      document.getElementById("generate").click();
    } else {
      document.getElementById("secretGenerate").click();
    }
  }
}
document.getElementById("input0").addEventListener("keyup", enterClick);
if (isMobile === false) {
  window.addEventListener("keyup", enterAddHouse);
  window.addEventListener("keyup", enterGenerate);
}

// object constructor function
function Giver(name, recipient, email) {
  this.name = name;
  this.email = email;
  this.recipient = recipient;
  this.date = String(new Date());
}

function addName(e) {
  let nameInput = e.previousElementSibling.value;
  if (nameInput !== "") {
    let capitalized = nameInput.charAt(0).toUpperCase() + nameInput.slice(1);
    nameInput = capitalized;
    document.getElementById("participants").insertAdjacentHTML(
      "beforeend",
      `<div class="name-wrapper" id="wrapper-${nameInput}" draggable="true" ondragstart="drag(event)">
        <button onclick="deleteName(this)" class="delete-name">X</button>
        <p class="name-entered" id="${nameInput}${nameNumber}">${nameInput}</p>
        <br id="br${nameInput}${nameNumber}">
      </div>`
    );
    givers.push(new Giver(nameInput, "", ""));
    nameNumber++;
    if (houseID > 0) {
      let selects = Array.from(document.getElementsByClassName("name-select"));
      selects.map((select) => {
        select.innerHTML = `
          <option disabled selected value="option${houseID}">-- Select a name --</option>
          ${givers.map((x) => `<option value="${x.name}">${x.name}</option>`)}
        `;
      });
    }
  }
  document.getElementById("input0").value = "";
}

function deleteName(e) {
  let nameWrapper = e.parentNode.id;
  let name = e.nextElementSibling.innerHTML;
  for (let i = 0; i < givers.length; i++) {
    if (givers[i].name === name) {
      givers.splice(i, 1);
    }
  }

  document.getElementById(nameWrapper).remove();
}

function addHouse() {
  let houseTemplate = `<div class="household" id="${houseID}">
      <h2 contenteditable="true">Household ${
        houseID + 1
      } <span class="edit-span">(Click here to edit)</span></h2>
      <div class="name-container" ondrop="drop(event)" ondragover="allowDrop(event)" ondragleave="dragLeave(event)"></div>
      <select class="name-select" name="${houseID}-select" id="${houseID}-select" onchange="insertName(event)">
        <option disabled selected value="option${houseID}">-- Select a name --</option>
        ${givers.map((x) => `<option value="${x.name}">${x.name}</option>`)}
      </select>
      <button class="button deleteHouse" onclick="deleteHouse(this)">Delete</button>
    </div>`;
  document
    .getElementById("left-container")
    .insertAdjacentHTML("beforeend", houseTemplate);
  houseID += 1;
}

function toggleInstructions() {
  let intro = document.getElementById("intro");
  if (intro.style.display === "none") {
    intro.style.display = "block";
    document.getElementById("instructions").innerHTML = "Hide Instructions";
  } else {
    intro.style.display = "none";
    document.getElementById("instructions").innerHTML = "Show Instructions";
  }
}

// insert name into div from select and remove from participant list
function insertName(e) {
  let firstName = e.target.value;
  let nameDiv = document.getElementById(`wrapper-${firstName}`);
  e.target.previousElementSibling.appendChild(nameDiv);

  // set select back to saying "select a name"
  label = e.target.firstElementChild.value;
  e.target.value = label;
}

function deleteHouse(e) {
  // find last household
  let houseDiv = e.parentNode;

  houseDiv.childNodes.forEach((x) => {
    // search inside last household for name container
    if (x.className === "name-container") {
      // grab name from each name wrapper div and put it back in the participants list
      Array.from(x.childNodes).forEach((y) => {
        document.getElementById("participants").appendChild(y);
      });
    }
  });
  // delete entire div from DOM
  houseDiv.remove();
}

function deepCopy(arr) {
  arr.forEach((x) => {
    availRecipients.push([]);
  });
  for (i = 0; i < arr.length; i++) {
    for (j = 0; j < arr[i].length; j++) {
      availRecipients[i].push(arr[i][j]);
    }
  }
}

function clearTable() {
  //clear table but keep header row
  let parentNode = document.getElementById("table-body");
  while (parentNode.firstChild) {
    parentNode.removeChild(parentNode.firstChild);
  }
}

function findDuplicate() {
  let searchNames = houses.flat();
  function hasDuplicates(arr) {
    return new Set(arr).size !== arr.length;
  }
  if (hasDuplicates(searchNames)) {
    duplicate = true;
  } else {
    duplicate = false;
  }
}

function fillHouses() {
  houses = [];

  // get names from all houses
  houseClass = document.getElementsByClassName("household");
  for (let i = 0; i < houseClass.length; i++) {
    let tempArr = [];
    houseClass[i].childNodes.forEach((x) => {
      if (x.className === "name-container") {
        x.childNodes.forEach((y) => {
          if (y.tagName === "DIV") {
            tempArr.push(y.id.slice(8));
          }
        });
      }
    });
    // don't push empty array
    if (tempArr.length > 0) {
      houses.push(tempArr);
    }
  }

  // get names from participants list if any
  let nameList = document.getElementById("name-list").childNodes;
  nameList.forEach((x) => {
    if (x.className === "name-container") {
      x.childNodes.forEach((y) => {
        if (y.tagName === "DIV") {
          // add them to their own array so they can be matched with anybody
          houses.push([y.id.slice(8)]);
        }
      });
    }
  });
}

function start() {
  let counter = 0;
  generateList();

  function generateList() {
    let recipient;
    let y;
    let x;
    let broken = false;
    fillHouses();
    deepCopy(houses);
    let numberOfHouses = houses.length;
    findDuplicate();
    if (houses.length < 1) {
      showSnackbar("Please enter participants' names.", "error");
    } else if (duplicate) {
      showSnackbar(
        "Duplicate name detected! Please delete the duplicate and re-enter it with a last initial or nickname.",
        "error"
      );
    } else if (counter >= 25) {
      showSnackbar(
        "No possible combinations! Please try a different configuration/number of names.",
        "error"
      );
      document.getElementById("table-body").insertAdjacentHTML(
        "beforeend",
        `<tr>
              <td></td>
              <td></td>
          </tr>
          <tr>
              <td></td>
              <td></td>
          </tr>
          <tr>
              <td></td>
              <td></td>
          </tr>
          <tr>
              <td></td>
              <td></td>
          </tr>`
      );
    } else {
      clearTable();
      // for (let i = 0; i < givers.length; i++)
      givers.forEach((a) => {
        //sequentially choose giver name and randomly choose which subArray for recipient
        let giverName = a.name;
        x = Math.floor(numberOfHouses * Math.random());
        // randomly choose name inside
        y = Math.floor(availRecipients[x].length * Math.random());
        recipient = availRecipients[x][y];
        // check if name is in giver's household
        let prevX = x;
        for (let j = 0; j < houses.length; j++) {
          if (houses[j].includes(recipient)) {
            if (houses[j].includes(giverName)) {
              // uh-oh are we out of options?
              if (numberOfHouses <= 1) {
                broken = true;
                counter++;
                break;
              }
              // find new array and make sure it's not the same one as before
              while (x === prevX) {
                x = Math.floor(numberOfHouses * Math.random());
              }
              // choose new recipient from new array
              y = Math.floor(availRecipients[x].length * Math.random());
              recipient = availRecipients[x][y];
            }
          }
        }
        // assign recipient in giver's object
        a.recipient = recipient;

        availRecipients[x].splice(y, 1); //remove name from possible options

        if (availRecipients[x].length === 0) {
          availRecipients.splice(x, 1); //check if that leaves an empty array and remove if so
          numberOfHouses - 1 > -1 ? numberOfHouses-- : (numberOfHouses = 0); //decrement number of houses to prevent undefined when randomly selecting next array. don't let it fall under zero
        }
        generated = true;
        if(!secretSanta){
          document.getElementById("table-body").insertAdjacentHTML(
            "beforeend",
            `<tr>
                <td>${giverName}</td>
                <td>${a.recipient}</td>
            </tr>`
          );
        }
      });

      if (broken === true) {
        generated = false;
        generateList();
      }
    }
  }
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
  }, 8000);
  // give the keyframes animation time to run before changing classes
  setTimeout(() => {
    bar.classList.replace("show", "hidden");
    bar.classList.remove("hide");
  }, 8500);
}

// collect emails
function showEmailTable() {
  if (!generated) {
    showSnackbar(
      `Please click "Generate List" before entering emails.`,
      "error"
    );
  } else {
    const table = document.getElementById("emailTable");
    const body = document.getElementById("emailTableBody");
    // use a for loop instead of forEach to get access to the index -- this will be used later for adding the emails to the giver objects
    for (let i = 0; i < givers.length; i++) {
      body.insertAdjacentHTML(
        "afterbegin",
        `<tr>
            <td>${givers[i].name}</td>
            <td><input type="email" required class="emailInput" name=${givers[i].name} id=${i}></td>
        </tr>`
      );
    }
    table.classList.replace("hidden", "show");
    if(!secretSanta){
      document.getElementById('hideEmails').style.display="block";
    }
  }
}

function hideEmailTable(){
  const table = document.getElementById("emailTable");
  document.getElementById('hideEmails').style.display="none";
  document.getElementById('confirmEmails').style.display="none";
  table.classList.replace('show', 'hide');
  setTimeout(() => {
    table.classList.replace("hide", "hidden");
  }, 500);
}

function confirmEmails(e) {
  e.preventDefault;
  document.getElementById("btnRow").innerHTML = `
    <td style="color:#b31e20">Please verify that all email addresses entered are correct.</td>
    <td><button type="submit" class="button" id="submitEmails" onclick="submitEmails(this)">All emails are correct!</button></td>
  `;
}

function submitEmails(e) {
  e.preventDefault;
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

  // update each giver array with the matching email
  emails.forEach((obj) => {
    let i = parseInt(obj.index);
    givers[i].email = obj.email;
  });

  postToDb();
}

// send emails

function batchEmails() {
  const btn = document.getElementById("sendEmails");
  btn.innerHTML = "Loading...";
  btn.style.color = "#808080";

  let i = 0;
  let count = 0;
  let promises = givers.map(async (giver) => {
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
      console.log(response.status === 200);
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
      `Sent ${count} of ${givers.length} emails successfully!`,
      "success"
    );
  });
}

async function postToDb() {
  const options = {
    method: "POST", // *GET, POST, PUT, DELETE, etc.
    mode: "cors",
    body: JSON.stringify(givers), // GET requests can't have a body
  };

  let results = await fetch("/.netlify/functions/postToDb", options).then(
    (response) => {
      if (response.status === 200) {
        const sendDiv = document.getElementById("sendEmails");
        sendDiv.innerHTML = `
          <p>${givers.length} email addresses added successfully!</p>
          <p>Now let's send out those emails:</p>
          <button class="button" id="sendEmails" onclick="batchEmails()">Send Emails</button>
        `;
        sendDiv.classList.replace("hidden", "show");

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
    console.log(date.toDateString(), results.recipient);
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

function conditionalRender() {
  console.log(introIndex);
  let next = document.getElementById('nextStep');
  let addHouse = document.getElementById("addHouse");
  let generate = document.getElementById("generate");
  let secretGenerate = document.getElementById("secretGenerate");
  let enterEmails = document.getElementById("enterEmails");

  switch (introIndex) {
    case 0:
      break;
    case 1:
      addHouse.style.display = "none";
      break;
    case 2:
      addHouse.style.display = "block";
      secretGenerate.style.display = "none";
      generate.style.display = "none";
      break;
    case 3:
      addHouse.style.display = "none";

      if (secretSanta) {
        secretGenerate.style.display = "block";
        generate.style.display = "none";
        next.style.display = "none";
      } else {
        generate.style.display = "block";
      }
      break;
    case 4:
      generate.style.display = "none";
      secretGenerate.style.display = "none";
      break;
  }
}

function stepOne() {
  document.getElementById("name-list").style.display = "block";
  if (!secretSanta) {
    document.getElementById("results-table").style.display = "table";
  }
  document.getElementById("nextStep").style.display = "block";
  introNext();
}

function introNext() {
  if (givers.length < 1 && introIndex === 1) {
    showSnackbar("Please add participant names", "error");
    return;
  }
  if (introIndex === 3 && !generated) {
    showSnackbar(`Please click "Generate List"`, "error");
    return;
  }
  if (introIndex === 3 && generated) {
    showEmailTable();
    document.getElementById("nextStep").style.display = "none";
  }
  introIndex + 1 > introArr.length ? (introIndex = 0) : introIndex++;
  const introDiv = document.getElementById("intro");
  if(introIndex<introArr.length){
    introDiv.innerHTML = `<p>${introArr[introIndex]}</p>`;
  }
  conditionalRender();
}

let introArr = [
  ``,

  `<span style="font-weight:bold">Step 1 / 4:</span> Enter the names of everyone participating in the gift exchange. Make sure all names are unique. If two people have the same name, please add a last initial or nickname.`,

  `<span style="font-weight:bold">Step 2 / 4</span> (optional): Who should NOT get who? <br><br>For example, a couple may not want to be able get each others' names at the family gift exchange because they will already be getting each other gifts outside of the exchange. <br><br> In that case, you can put them in an exclusion group together. Names in the same group will not get each other as recipients.<br><br> Click "Add Group." Then,  you can drag and drop to move people around or select their name from the drop down in each box.`,

  `<span style="font-weight:bold">Step 3 / 4:</span> Click "Generate List!"`,
];

function secretSantaMode() {
  secretSanta = true;
  document.getElementById("left-container").classList.add("secret");
  document.getElementById("name-list").style.paddingBottom = "30px";
  stepOne();
}

function secretSantaStart() {
  start();
  showEmailTable();
  document.getElementById("secretGenerate").style.display = "none";
  document.getElementById("nextStep").style.display = "none";
}
