let house1 = [];
let houseTemplate = `<div class="household">
    <input type="text" class="name">
    <button class="name-button" onclick="addName(this)">Add Name</button>
</div>`

function addName(e) {
    let parentDiv = e.parentNode.id;
    let nameInput = e.previousElementSibling.value;
    if (nameInput === ''){
        alert("Please enter a name in the input field");
    } else {
        document.getElementById(parentDiv).insertAdjacentHTML("afterbegin", `<span>${nameInput}</span>`);
        house1.push(nameInput);
        console.log(house1);
    }    
}

function addHouse(e) {
    e.insertAdjacentHTML("beforebegin", houseTemplate);
}
