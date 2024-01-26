let givers = [];
let houses = [];
let houseID = 0;
let isMobile;
let nameNumber = 1;
let availRecipients = []; // for deleting names from the recipient pool

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
    document.getElementById("generate").click();
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
    console.log(givers);
    nameNumber++;
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

function deleteHouse() {
  // find last household
  let container = document.getElementById("left-container");
  let houseDiv = container.lastChild;
  let name;

  houseDiv.childNodes.forEach((x) => {
    // search inside last household for name container
    if (x.className === "name-container") {
      // grab name from each name wrapper div
      x.childNodes.forEach((y) => {
        name = y.id.slice(8);
        // search the givers array for an object with that same name and delete it
        for (let i = 0; i < givers.length; i++) {
          if (givers[i].name === name) {
            givers.splice(i, 1);
          }
        }
      });
      // delete entire div from DOM
      houseDiv.remove();
    }
  });
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
    let duplicate;
    let recipient;
    let y;
    let x;
    let broken = false;
    fillHouses();
    deepCopy(houses);
    let numberOfHouses = houses.length;
    findDuplicate();

    if (duplicate) {
      alert(
        "Please check that all names are unique and try again. Consider adding last initials, last names, or nicknames."
      );
    } else if (counter >= 25) {
      alert(
        "No possible combinations! Please try a different configuration/number of names."
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
        document.getElementById("table-body").insertAdjacentHTML(
          "beforeend",
          `<tr>
              <td>${giverName}</td>
              <td>${a.recipient}</td>
          </tr>`
        );
      });

      if (broken === true) {
        generateList();
      }
    }
  }
}

// send emails

function batchEmails() {
  let i = 0;
  let count = 0;
  let promises = givers
    .map(async (giver) => {
      i++;
      await fetch("/.netlify/functions/dispatchEmail", {
        method: "POST",
        mode: "cors",
        body: JSON.stringify({
          name: giver.name,
          recipient: giver.recipient,
        }),
      }).then((response) => {
        console.log(response.status === 200);
        if (response.status === 200) {
          count++;
        }
      });
    })
    Promise.all(promises).then(()=>{
      alert(`Sent ${count} of ${givers.length} emails successfully!`)
    })
}
