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
    houseID++;
    houses.push([]);

    console.log(houses.length);
}



function generateList() {
    let numberOfHouses = houses.length;
    let names = houses.flat();
    let numberOfNames = names.length;

    for (let i=numberOfNames; i>0; i--){
        let x = Math.floor(i * Math.random());
        let y = Math.floor(numberOfHouses * Math.random());
        let giverName = names[x];
        let recipientArr = houses[y];
        console.log(recipientArr.length);
        if (houses[y].includes(giverName)){
            if (y === houses.length - 1){
                y--;
                let z = Math.floor(recipientArr.length * Math.random());
                let recipient = recipientArr[z];
                document.getElementById('table').insertAdjacentHTML("beforeend", `<tr>
                    <td>${giverName}</td>
                    <td>${recipient}</td>
                </tr>`)
                // recipientArr.splice(z, 1);
                names.splice(x, 1);
                console.log(y, z, houses[y][z]);
            } else {
                y++
                let z = Math.floor(recipientArr.length * Math.random());
                let recipient = recipientArr[z];
                document.getElementById('table').insertAdjacentHTML("beforeend", `<tr>
                    <td>${giverName}</td>
                    <td>${recipient}</td>
                </tr>`)
                // recipientArr.splice(z, 1);
                names.splice(x, 1);
                console.log(y, z, houses[y][z]);

            }
        } else {
            let z = Math.floor(recipientArr.length * Math.random());
            let recipient = recipientArr[z];
                document.getElementById('table').insertAdjacentHTML("beforeend", `<tr>
                    <td>${giverName}</td>
                    <td>${recipient}</td>
                </tr>`)
                // recipientArr.splice(z, 1);
                names.splice(x, 1);
                console.log(y, z, houses[y][z]);

        }
    }
}