let houses = [[]];
let copyOfHouses;
let houseID = 1;
let recipients = [];
let counter;
let isMobile;
let empty;
let duplicate;
let nameNumber=1;

if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
    isMobile = true;
} else {
    isMobile=false;
}

// event listener for enter key
function enterClick(evt){
    if ( evt.keyCode === 13){
        evt.preventDefault();
        document.getElementById("b0").click();
    }
}
function enterAddHouse(evt){
    if (evt.shiftKey && evt.keyCode === 13){
        evt.preventDefault;
        document.getElementById("addHouse").click();
    }
}
function enterGenerate(evt){
    if (evt.ctrlKey && evt.keyCode === 13){
        evt.preventDefault;
        document.getElementById('generate').click();
    }
}
document.getElementById("input0").addEventListener('keyup', enterClick);
if (isMobile===false){
    window.addEventListener('keyup', enterAddHouse);
    window.addEventListener('keyup', enterGenerate);
}


function addName(e) {
    let parentDiv = e.parentNode.id;
    let nameInput = e.previousElementSibling.value;
    let inputID = e.previousElementSibling.id;
    if (nameInput !== ''){
        let capitalized = nameInput.charAt(0).toUpperCase() + nameInput.slice(1);
        nameInput = capitalized;
        document.getElementById(inputID).insertAdjacentHTML("beforebegin", `<button onclick="deleteName(this)" class="delete-name">X</button>
        <p class="name-entered" id="${nameInput}${nameNumber}">${nameInput}</p>
        <br id="br${nameInput}${nameNumber}">`);
        houses[parentDiv].push(nameInput);
        nameNumber++;
    }
    document.getElementById(inputID).value='';    
}

function deleteName(e){
    let parentDiv = e.parentNode.id;
    let name = e.nextElementSibling.id;
    let index = houses[parentDiv].indexOf(e.nextElementSibling.innerHTML);
    console.log(name);
    console.log(index);
    houses[parentDiv].splice(index, 1);
    document.getElementById(name).remove();
    document.getElementById(`br${name}`).remove();
    e.remove();
    console.log(houses);
}

function addHouse(e) {
    let houseTemplate = `<div class="household" id="${houseID}">
    <h2>Household ${houseID+1}</h2>
    <input type="text" class="name-input" id="input${houseID}">
    <button type="submit" class="name-button" onclick="addName(this)" id="b${houseID}">Add Name (Enter)</button>
    </div>`
    e.previousElementSibling.insertAdjacentHTML("beforebegin", houseTemplate);
    
    let btn = document.getElementById(`b${houseID}`);
    document.getElementById(`input${houseID}`).addEventListener('keyup', evt => {
        if (evt.keyCode == 13){
            evt.preventDefault();
            btn.click();
        }
    });
    document.getElementById(`input${houseID}`).focus();
    houseID++;
    houses.push([]);
    // copyOfHouses.push([]);

}

function deleteHouse(e){
    let houseDiv = e.previousElementSibling.id;
    houses.splice(houseDiv, 1);
    document.getElementById(houseDiv).remove();
    document.getElementById(`input${houseDiv-1}`).focus();
    houseID--;

}

function deepCopy(arr){
    for (x=0; x<arr.length-1; x++){
        copyOfHouses.push([]);
    }
    for (i=0; i<arr.length; i++){
        for (j=0; j<arr[i].length; j++){
            copyOfHouses[i].push(arr[i][j]);
        }
    }
}
function clearTable(){
    //clear table but keep header row
    let parentNode = document.getElementById('table-body');
    while (parentNode.firstChild){
        parentNode.removeChild(parentNode.firstChild);
    }
}
function findEmpty(){
    for (let i=0; i<houses.length; i++){
        if (houses[i].length<1){
            empty = true;
            break;
        } else {
            empty =false;
        }
    }
}

function findDuplicate(){
    let searchNames = houses.flat();
    function hasDuplicates(arr) {
        return new Set(arr).size !== arr.length;
    }
    console.log(hasDuplicates(searchNames));
    if (hasDuplicates(searchNames)){
        duplicate = true;
        console.log(duplicate);
    } else {
        duplicate=false;
        console.log(duplicate);
    }
}

function initCounter(){
    console.log(houses);
    counter = 0;
    findEmpty();
    findDuplicate();
    if (empty===false){
        if (duplicate===false){
            generateList();
        } else {
            alert('Please check that all names are unique and try again. Consider adding last initials, last names, or nicknames.')
        }
    } else {
        alert('Please delete the empty household and try again');
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
        
        clearTable();
        deepCopy(houses);
        if(counter>=25){
            alert("No possible combinations! Please try a different configuraion/number of names.")
        }else{
            for (let i=0; i<names.length; i++){ 
                //randomly choose giver name and which subArray for recipients
                let giverName = names[i];
                x = Math.floor(numberOfHouses * Math.random()); 
                //find chosen subArray in original Array
                let originalArray;
                function findOriginal(){
                    let searchElem = copyOfHouses[x][0];
                    let searched;
                    for (originalArray = 0; originalArray<houses.length; originalArray++){
                        searched=houses[originalArray].indexOf(searchElem);
                        if (searched>-1){
                            break;
                        }
                    }
                }
                findOriginal();

                if (houses[originalArray].includes(giverName) && numberOfHouses<=1){
                    broken = true;
                    counter++;
                    break;
                }

                while (houses[originalArray].includes(giverName)){
                    x = Math.floor(numberOfHouses * Math.random());
                    findOriginal();
                }
                
                //randomly choose name inside of recipient subArray and test if it has already been used (exists in recipients array)
                recipientArr = copyOfHouses[x];
                y = Math.floor(recipientArr.length * Math.random());
                recipient = recipientArr[y];
                
                recipientArr.splice(y, 1); //remove name from possible options
                
                if (recipientArr.length === 0){
                    copyOfHouses.splice(x, 1); //check if that leaves an empty array and remove if so
                    numberOfHouses--; //decrement number of houses to prevent undefined 
                }
                document.getElementById('table-body').insertAdjacentHTML("beforeend", `<tr>
                    <td>${giverName}</td>
                    <td>${recipient}</td>
                </tr>`);
            }
            if (broken===true){
                generateList();
            }
        }
    }
}

