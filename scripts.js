let houses = [[]];
let houseID = 1;
let recipients = [];
let givers = [];

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
        if (evt.key === 'Enter'){
            evt.preventDefault();
            btn.click();
        }
    });
    houseID++;
    houses.push([]);

    console.log(houses.length);
}



function generateList() {
    // console.log('first', houses);
    let numberOfHouses = houses.length;
    let names = houses.flat();
    let recipientsToChoose = [...houses];
    let recipientArr;
    let recipient;
    let z;

    for (let i=names.length; i>1; i--){
        //randomly choose giver name and which subArray for recipients
        let x = Math.floor(i * Math.random());
        let y = Math.floor(numberOfHouses * Math.random());
        let giverName = names[x];
        givers.push(giverName); //add givername to givers array
        names.splice(x, 1); //remove giver name from names to choose from

        //test if giver name exists in chosen recipient subArray and change subArray if so
        if (houses[y].includes(giverName)){
            if (y === houses.length - 1){
                y--;
            } else {
                y++;
            }
        }

        recipientArr = recipientsToChoose[y];
        //randomly choose name inside of recipient subArray and test if it has already been used (exists in recipients array)
        z = Math.floor(recipientArr.length * Math.random());
        recipient = recipientArr[z];

        while (recipients.includes(recipient)) {
            z = Math.floor(recipientArr.length * Math.random());
            recipient = recipientArr[z];
        }

        recipients.push(recipient); //add recipient name to recipient array
        recipientArr.splice(z, 1); //remove recipient name from possibilities 
        
        if (recipientArr === []){
            recipientsToChoose.splice(y, 1); //check if that leaves an empty array and remove if so
            numberOfHouses--; //decrement number of houses to prevent undefined 
            console.log(recipientsToChoose);
        }
        document.getElementById('table').insertAdjacentHTML("beforeend", `<tr>
            <td>${giverName}</td>
            <td>${recipient}</td>
        </tr>`);
    }
    console.table(givers);
    console.table(recipients);
    // generateHTMLTable();
}

function generateHTMLTable() {
    for (let i = 0; i<givers.length; i++){
        document.getElementById('table').insertAdjacentHTML("beforeend", `<tr>
            <td>${givers[i]}</td>
            <td>${recipients[i]}</td>
        </tr>`);
    }
}