let houses = [[]];
let houseID = 1;
let allNameInputs = document.getElementsByClassName("name-input");
let allNameButtons = document.getElementsByClassName("name-button");

//event listener for enter key
for (let i = 0; i<allNameInputs.length; i++){
    allNameInputs[i].addEventListener('keyup', function(e){
        if (e.keyCode === 13){
            e.preventDefault();
            allNameButtons[i].click();
        }
    })
}

function addName(e) {
    let parentDiv = e.parentNode.id;
    let nameInput = e.previousElementSibling.value;
    let inputID = e.previousElementSibling.id;
    if (nameInput === ''){
        alert("Please enter a name in the input field");
    } else {
        document.getElementById(inputID).insertAdjacentHTML("beforebegin", `<p class="name-entered">${nameInput}</p>`);
        houses[parentDiv].push(nameInput);
        console.log(houses);
        console.log(inputID);
    }    
}

function addHouse(e) {
    let houseTemplate = `<div class="household" id="${houseID}">
    <h2>Household Name: <input type="text" class="house-heading"></h2>
    <input type="text" class="name-input" id="input${houseID}">
    <button class="name-button" onclick="addName(this)">Add Name</button>
    </div>`
    e.insertAdjacentHTML("beforebegin", houseTemplate);
    houseID++;
    houses.push([]);

    //event listeners for enter key
    allNameInputs = document.getElementsByClassName("name-input");
    allNameButtons = document.getElementsByClassName("name-button");
    console.log(houses);
    for (let i = 0; i<allNameInputs.length; i++){
        allNameInputs[i].removeEventListener('keyup', function(e){
            if (e.keyCode === 13){
                e.preventDefault();
                allNameButtons[i].click();
            }
        })
    }
    for (let i = 0; i<allNameInputs.length; i++){
        allNameInputs[i].addEventListener('keyup', function(e){
            if (e.keyCode === 13){
                e.preventDefault();
                allNameButtons[i].click();
            }
        })
    }
}
