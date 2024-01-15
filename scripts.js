let givers = [];
let houses = [[]];
let copyOfHouses;
let houseID = 0;
let recipients = [];
let counter;
let isMobile;
let empty;
let duplicate;
let nameNumber = 1;

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
function Giver(name, recipient) {
  this.name = name;
  this.recipient = recipient;
  this.selected = false;
}

function addName(e) {
  let parentDiv = e.parentNode.id;
  let nameInput = e.previousElementSibling.value;
  let inputID = e.previousElementSibling.id;
  if (nameInput !== "") {
    let capitalized = nameInput.charAt(0).toUpperCase() + nameInput.slice(1);
    nameInput = capitalized;
    document.getElementById(inputID).insertAdjacentHTML(
      "beforebegin",
      `<div class="name-wrapper" id="wrapper${nameNumber}" draggable="true" ondragstart="drag(event)">
        <button onclick="deleteName(this)" class="delete-name">X</button>
        <p class="name-entered" id="${nameInput}${nameNumber}">${nameInput}</p>
        <br id="br${nameInput}${nameNumber}">
      </div>`
    );
    givers.push(new Giver(nameInput, ""));
    // houses[parentDiv].push(nameInput);
    nameNumber++;
  }
  document.getElementById(inputID).value = "";
}

function deleteName(e) {
  let parentDiv = e.parentNode.id;
  let nameId = e.nextElementSibling.id;
  let name = e.nextElementSibling.innerHTML;
  let index;
  for (let i = 0; i < givers.length; i++) {
    if (Object.hasOwn(givers[i], name)) {
      index = i;
      return index;
    }
  }

  givers.splice(index, 1);
  document.getElementById(nameId).remove();
  document.getElementById(`br${nameId}`).remove();
  e.remove();
}

function addHouse(e) {
  let houseTemplate =(
    `<div class="household" id="${houseID}" ondrop="drop(event)" ondragover="allowDrop(event)">
      <h2 contenteditable="true">Household ${houseID + 1}</h2>
      <select name="${houseID}-select" id="${houseID}-select">
        <option disabled selected>--Select a name--</option>
        ${givers.map((x)=>`<option value="${x.name}" ${x.selected ? `disabled` : null}>${x.name}</option>`)}
      </select>
    </div>`);
  e.parentNode.insertAdjacentHTML("beforebegin", houseTemplate);
  houseID += 1;
  houses.push([]);
  // copyOfHouses.push([]);
}

function deleteHouse(e) {
  let btnDiv = e.parentNode;
  let houseDiv = btnDiv.previousElementSibling.id;

  if (houseDiv !== "name-list") {
    houses.splice(houseDiv, 1);
    document.getElementById(houseDiv).remove();
    houseID-1 < 0 ? (houseID = 0) : houseID--;
  }
}

function deepCopy(arr) {
  for (x = 0; x < arr.length - 1; x++) {
    copyOfHouses.push([]);
  }
  for (i = 0; i < arr.length; i++) {
    for (j = 0; j < arr[i].length; j++) {
      copyOfHouses[i].push(arr[i][j]);
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
function findEmpty() {
  for (let i = 0; i < houses.length; i++) {
    if (houses[i].length < 1) {
      empty = true;
      break;
    } else {
      empty = false;
    }
  }
}

function findDuplicate() {
  let searchNames = houses.flat();
  function hasDuplicates(arr) {
    return new Set(arr).size !== arr.length;
  }
  // console.log(hasDuplicates(searchNames));
  if (hasDuplicates(searchNames)) {
    duplicate = true;
  } else {
    duplicate = false;
  }
}

function initCounter() {
  counter = 0;
  findEmpty();
  findDuplicate();
  if (empty === false) {
    if (duplicate === false) {
      generateList();
    } else {
      alert(
        "Please check that all names are unique and try again. Consider adding last initials, last names, or nicknames."
      );
    }
  } else {
    alert("Please delete the empty household and try again");
  }
  function generateList() {
    let numberOfHouses = houses.length;
    let names = houses.flat();
    let recipientArr;
    let recipient;
    let y;
    let x;
    let broken = false;
    copyOfHouses = [[]];

    deepCopy(houses);
    if (counter >= 25) {
      alert(
        "No possible combinations! Please try a different configuraion/number of names."
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
      for (let i = 0; i < names.length; i++) {
        //randomly choose giver name and which subArray for recipients
        let giverName = names[i];
        x = Math.floor(numberOfHouses * Math.random());
        //find chosen subArray in original Array
        let originalArray;
        function findOriginal() {
          let searchElem = copyOfHouses[x][0];
          let searched;
          for (
            originalArray = 0;
            originalArray < houses.length;
            originalArray++
          ) {
            searched = houses[originalArray].indexOf(searchElem);
            if (searched > -1) {
              break;
            }
          }
        }
        findOriginal();

        if (houses[originalArray].includes(giverName) && numberOfHouses <= 1) {
          broken = true;
          counter++;
          break;
        }

        while (houses[originalArray].includes(giverName)) {
          x = Math.floor(numberOfHouses * Math.random());
          findOriginal();
        }

        //randomly choose name inside of recipient subArray and test if it has already been used (exists in recipients array)
        recipientArr = copyOfHouses[x];
        y = Math.floor(recipientArr.length * Math.random());
        recipient = recipientArr[y];

        recipientArr.splice(y, 1); //remove name from possible options

        if (recipientArr.length === 0) {
          copyOfHouses.splice(x, 1); //check if that leaves an empty array and remove if so
          numberOfHouses--; //decrement number of houses to prevent undefined
        }
        document.getElementById("table-body").insertAdjacentHTML(
          "beforeend",
          `<tr>
                    <td>${giverName}</td>
                    <td>${recipient}</td>
                </tr>`
        );
      }
      if (broken === true) {
        generateList();
      }
    }
  }
}

function anyToAny() {
  counter = 0;
  findEmpty();
  findDuplicate();
  if (empty === false) {
    if (duplicate === false) {
      generateListAny();
    } else {
      alert(
        "Please check that all names are unique and try again. Consider adding last initials, last names, or nicknames."
      );
    }
  } else {
    alert("Please delete the empty household and try again");
  }
  function generateListAny() {
    let names = houses.flat();
    let possibleRecipients = houses.flat();
    let recipient;
    let recipients = [];
    let x;
    let broken = false;
    let numberOfNames = possibleRecipients.length;
    // console.log(possibleRecipients);
    // console.log(counter);

    if (counter >= 25) {
      alert(
        "No possible combinations! Please try a different configuraion/number of names."
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
      for (let i = 0; i < names.length; i++) {
        //randomly choose giver name and which subArray for recipients
        let giverName = names[i];
        x = Math.floor(numberOfNames * Math.random());
        recipient = possibleRecipients[x];
        // console.log('giver', giverName);
        // console.log('recipient', recipient);

        while (possibleRecipients[x] === giverName) {
          x = Math.floor(numberOfNames * Math.random());
          recipient = possibleRecipients[x];
          if (possibleRecipients[x] === giverName && numberOfNames <= 1) {
            broken = true;
            counter++;
            break;
          }
        }
        while (recipients.includes(recipient)) {
          x = Math.floor(numberOfNames * Math.random());
          recipient = possibleRecipients[x];
          if (recipients.includes(recipient) && numberOfNames <= 1) {
            broken = true;
            counter++;
            break;
          }
        }
        recipients.push(recipient);
        possibleRecipients.splice(x, 1); //remove name from possible options
        numberOfNames--;
        // console.log(possibleRecipients);
        document.getElementById("table-body").insertAdjacentHTML(
          "beforeend",
          `<tr>
                    <td>${giverName}</td>
                    <td>${recipient}</td>
                </tr>`
        );
      }
      if (broken === true) {
        generateListAny();
      }
    }
  }
}
