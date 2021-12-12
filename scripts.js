const nameTemplate = '<input type="text" class="name" id="'
const h1div = document.getElementById("h1");
let house1 = [];

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

