let houses = [[]];
let houseID = 1;

// event listener for enter key
function enterClick(evt){
    if (evt.key === 'Enter'){
        evt.preventDefault();
        document.getElementById("b0").click();
    }
}
document.getElementById("input0").addEventListener('keyup', enterClick);


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
    <button class="name-button" onclick="addName(this)" id="b${houseID}">Add Name</button>
    </div>`
    e.insertAdjacentHTML("beforebegin", houseTemplate);
    
    let btn = document.getElementById(`b${houseID}`);
    document.getElementById(`input${houseID}`).addEventListener('keyup', evt => {
        if (evt.key === 'Enter'){
            evt.preventDefault();
            btn.click();
        }
    });
    console.log(document.getElementById(`b${houseID}`));
    houseID++;
    houses.push([]);


}
