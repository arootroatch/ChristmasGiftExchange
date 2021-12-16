let houses = [[]];
let copyOfHouses = [[]];
let houseID = 1;
let recipients = [];

// event listener for enter key
function enterClick(evt){
    if (!evt.shiftKey && !evt.ctrlKey && evt.key === 'Enter'){
        evt.preventDefault();
        document.getElementById("b0").click();
    }
}
function enterAddHouse(evt){
    if (evt.shiftKey && evt.key === 'Enter'){
        evt.preventDefault;
        document.getElementById("addHouse").click();
    }
}
function enterGenerate(evt){
    if (evt.ctrlKey && evt.key === 'Enter'){
        evt.preventDefault;
        document.getElementById('generate').click();
    }
}
window.addEventListener('keyup', enterAddHouse);
window.addEventListener('keyup', enterGenerate);
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
        copyOfHouses[parentDiv].push(nameInput);
    }
    e.previousElementSibling.value = '';    
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
        if (!evt.shiftKey && !evt.ctrlKey && evt.key === 'Enter'){
            evt.preventDefault();
            btn.click();
        }
    });
    houseID++;
    houses.push([]);
    copyOfHouses.push([]);

    console.log(houses.length);
}



function generateList() {
    // console.log('first', houses);
    let numberOfHouses = houses.length;
    let names = houses.flat();
    let recipientArr;
    let recipient;
    let z;
    for (let i=names.length; i>=1; i--){
        //randomly choose giver name and which subArray for recipients
        let x = Math.floor(i * Math.random());
        let y = Math.floor(numberOfHouses * Math.random());
        let giverName = names[x];
        names.splice(x, 1); //remove giver name from names to choose from

        //test if giver name exists in chosen recipient subArray and change subArray if so
        if (copyOfHouses[y].includes(giverName)){
            if (y === copyOfHouses.length - 1){
                y--;
            } else {
                y++;
            }
        }

        recipientArr = copyOfHouses[y];
        //randomly choose name inside of recipient subArray and test if it has already been used (exists in recipients array)
        z = Math.floor(recipientArr.length * Math.random());
        recipient = recipientArr[z];

        while (recipients.includes(recipient)) {
            z = Math.floor(recipientArr.length * Math.random());
            recipient = recipientArr[z];
        }

        recipients.push(recipient); //add recipient name to recipient array
        console.log(y, z);
        recipientArr.splice(z, 1); //remove name from possible options
        
        if (recipientArr.length === 0){
            copyOfHouses.splice(y, 1); //check if that leaves an empty array and remove if so
            numberOfHouses--; //decrement number of houses to prevent undefined 
            console.log('decrement houses', numberOfHouses);
        }
        document.getElementById('table').insertAdjacentHTML("beforeend", `<tr>
            <td>${giverName}</td>
            <td>${recipient}</td>
        </tr>`);
    }
}

