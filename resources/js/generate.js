import showSnackbar from "./components/snackbar"
import {showEmailTable} from "./components/emailTable"
import state from "./state.js";
import {pushHTMl} from "./utils";

document.getElementById("generate").addEventListener("click", start);
document
    .getElementById("secretGenerate")
    .addEventListener("click", secretSantaStart);

function clearTable() {
    //clear table but keep header row
    let parentNode = document.getElementById("table-body");
    while (parentNode.firstChild) {
        parentNode.removeChild(parentNode.firstChild);
    }
}

function emptyTable() {
    return `
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
    </tr>
    <tr>
      <td></td>
      <td></td>
    </tr>`
}

function findDuplicate() {
    let searchNames = state.houses.flat();

    function hasDuplicates(arr) {
        return new Set(arr).size !== arr.length;
    }

    state.duplicate = hasDuplicates(searchNames);
}

function fillHouses() {
    state.houses = [];

    // get names from all houses
    const houseClass = document.getElementsByClassName("household");
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
            state.houses.push(tempArr);
        }
    }

    // get names from participants list if any
    let nameList = document.getElementById("name-list").childNodes;
    nameList.forEach((x) => {
        if (x.className === "name-container") {
            x.childNodes.forEach((y) => {
                if (y.tagName === "DIV") {
                    // add them to their own array so they can be matched with anybody
                    state.houses.push([y.id.slice(8)]);
                }
            });
        }
    });
}

function deepCopy(arr) {
    state.availRecipients = [];
    arr.forEach(() => {
        state.availRecipients.push([]);
    });
    for (let i = 0; i < arr.length; i++) {
        for (let j = 0; j < arr[i].length; j++) {
            state.availRecipients[i].push(arr[i][j]);
        }
    }
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
        deepCopy(state.houses);
        let numberOfHouses = state.houses.length;
        findDuplicate();
        if (state.houses.length < 1) {
            showSnackbar("Please enter participants' names.", "error");
        } else if (state.duplicate) {
            showSnackbar(
                "Duplicate name detected! Please delete the duplicate and re-enter it with a last initial or nickname.",
                "error"
            );
        } else if (counter >= 25) {
            clearTable();
            pushHTMl("table-body", emptyTable());
            showSnackbar(
                "No possible combinations! Please try a different configuration/number of names.",
                "error"
            );
        } else {
            clearTable();
            // for (let i = 0; i < givers.length; i++)
            state.givers.forEach((giver) => {
                //sequentially choose giver name and randomly choose which subArray for recipient
                let giverName = giver.name;
                x = Math.floor(numberOfHouses * Math.random());
                // randomly choose name inside
                y = Math.floor(state.availRecipients[x].length * Math.random());
                recipient = state.availRecipients[x][y];
                // check if name is in giver's household
                let prevX = x;
                for (let j = 0; j < state.houses.length; j++) {
                    if (state.houses[j].includes(recipient)) {
                        if (state.houses[j].includes(giverName)) {
                            // uh-oh! are we out of options?
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
                            y = Math.floor(state.availRecipients[x].length * Math.random());
                            recipient = state.availRecipients[x][y];
                        }
                    }
                }
                // assign recipient in giver's object
                giver.recipient = recipient;

                state.availRecipients[x].splice(y, 1); //remove name from possible options

                if (state.availRecipients[x].length === 0) {
                    state.availRecipients.splice(x, 1); //check if that leaves an empty array and remove if so
                    numberOfHouses - 1 > -1 ? numberOfHouses-- : (numberOfHouses = 0); //decrement number of houses to prevent undefined when randomly selecting next array. don't let it fall under zero
                }
                state.generated = true;
                if (!state.secretSanta) {
                    document.getElementById("table-body").insertAdjacentHTML(
                        "beforeend",
                        `<tr>
                <td>${giverName}</td>
                <td>${giver.recipient}</td>
            </tr>`
                    );
                }
            });

            if (broken === true) {
                state.generated = false;
                generateList();
            }
        }
    }
}

function secretSantaStart() {
    start();
    showEmailTable();
    document.getElementById("secretGenerate").style.display = "none";
    document.getElementById("nextStep").style.display = "none";
}

