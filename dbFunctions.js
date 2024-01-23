

async function getName(){
  
  let email = document.getElementById('email-input').value;

  const options = {
    method: "POST", // *GET, POST, PUT, DELETE, etc.
    mode: "cors",
    body: email, // GET requests can't have a body
  }

  let results = await fetch("/.netlify/functions/get_name", options).then(response => response.json());
  console.log(results.recipient);
  // results.forEach(result => {
  //   const listItem = document.createElement("li");
  //   listItem.innerText = result.title;
  //   document.getElementById("names").appendChild(listItem);
  // });
};

async function postToDb(){

  const options = {
    method: "POST", // *GET, POST, PUT, DELETE, etc.
    mode: "cors",
    body: JSON.stringify(givers), // GET requests can't have a body
  }
  console.log(options.body);

  let results = await fetch("/.netlify/functions/postToDb", options).then(response =>{ 
    if(response.status === 200){
      alert(`${givers.length} emails added successfully!`);
    }
  });

};
