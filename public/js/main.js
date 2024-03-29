const chatForm = document.getElementById('chat-form');
const chatMessages = document.querySelector('.chat-messages');
const roomName = document.getElementById('room-name');
const userList = document.getElementById('users');
let dropArea = document.getElementById('drop-area');
let data;
let r_data;
let start;
let var_names;
let out;
let test = JSON.stringify([[1,3,5,7], [2,4,6,8]]);
let initPyodide = loadPyodide()

// Define a sleep time function to avoid traffic jam
function delay(n){
  return new Promise(function(resolve){
      setTimeout(resolve,n*1000);
  });
}

// // Load csv file to array
// const csv2json = (str, delimiter = ',') => {
//   const titles = str.slice(0, str.indexOf('\n')).split(delimiter);
//   const rows = str.slice(str.indexOf('\n') + 1).split('\n');
//   return rows.map(row => {
//     const values = row.split(delimiter);
//     return titles.reduce((object, curr, i) => (object[curr] = values[i], object), {})
//   });
// };

//var csv is the CSV file with headers
function csvJSON(csv){
  var lines=csv.split("\n");
  var result = [];

  // NOTE: If your columns contain commas in their values, you'll need
  // to deal with those before doing the next step 
  // (you might convert them to &&& or something, then covert them back later)
  // jsfiddle showing the issue https://jsfiddle.net/
  var headers=lines[0].split(",");

  for(var i=1;i<lines.length;i++){

      var obj = {};
      var currentline=lines[i].split(",");

      for(var j=0;j<headers.length;j++){
          obj[headers[j]] = currentline[j];
      }

      result.push(obj);

  }

  //return result; //JavaScript object
  return JSON.stringify(result); //JSON
}

// Load Dropped data
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
  dropArea.addEventListener(eventName, preventDefaults, false)
})

function preventDefaults(e) {
  e.preventDefault()
  e.stopPropagation()
}

['dragenter', 'dragover'].forEach(eventName => {
  dropArea.addEventListener(eventName, highlight, false)
});

['dragleave', 'drop'].forEach(eventName => {
  dropArea.addEventListener(eventName, unhighlight, false)
});

function highlight(e) {
  dropArea.classList.add('highlight')
}

function unhighlight(e) {
  dropArea.classList.remove('highlight')
}

dropArea.addEventListener('drop', handleDrop, false)

function handleDrop(e) {
  let dt = e.dataTransfer
  let files = dt.files

  handleFiles(files)
}

function handleFiles(files) {
  files = [...files]
  
  files.forEach(previewFile)
  files.forEach(ExtractData)
}

function previewFile(file) {
  let reader = new FileReader()
  reader.readAsDataURL(file)
  reader.onloadend = function () {
    // Add notification that data was loaded
    let node = document.createElement("h");
    let textnode = document.createTextNode("Data imported!");
    node.appendChild(textnode)
    document.getElementById('Imported').appendChild(node)
  }
};

function ExtractData(file) {
  let extractor = new FileReader();
 
  extractor.onload = function (event) {
    data = event.target.result;
    console.log('Got the data!');
    // data = csv2json(data);
    // data = JSON.stringify(data);
    data = csvJSON(data)
  };
  extractor.onerror = function (event) {
    console.error("File could not be read! Code " + event.target.error.code);
  };
  extractor.readAsBinaryString(file);
};
// console.log(`We got the data: ${data}`)

// Get username and room from URL
const { username, room } = Qs.parse(location.search, {
  ignoreQueryPrefix: true,
});

const socket = io();

// Join chatroom
socket.emit('joinRoom', { username, room });

// Start training botton
let btn = document.createElement("startButton");
btn.innerHTML = '<input type="button" id="start-btn" class="button button1" value="Start Training">';
document.getElementById('start').appendChild(btn)

// The start training button
let start_btn = document.getElementById('start-btn');
start_btn.addEventListener('click', () => {
  const result = confirm('Are you sure you want to start federated project?');
  if (result) {
    console.log('Agree to start');
    socket.emit('status');
  } else {
    console.log('Refuse to start');
  }
});



// Get room and users
socket.on('roomUsers', ({ room, users }) => {
  outputRoomName(room);
  outputUsers(users);
});

// Message from server
socket.on('message', (message) => {
  console.log(message);
  outputMessage(message);

// Listen to the starting status
socket.off('start').on('start', msg => {
  if (msg) {
    console.log('Begin initializting data in local...');
    console.log('msg:', msg);
    start = true;
    async function PythonScript(){
      let pyodide = await initPyodide;
      await pyodide.loadPackage(["pandas"]);
      // Load and pass variable to python
      pyodide.runPython(`data=${data}`);
      // Run initialization python script
      pyodide.runPython(
        await (await fetch("py/initiate.py")).text()
      );
      var_names = pyodide.globals.get('var_names').toJs();
      r_data = pyodide.globals.get('df');
      let null_idx = pyodide.globals.get('null_idx');
      if (null_idx.length){
        socket.emit('chatMessage', `Detected ${null_idx.length} entries contain null, now removing...`)
      };
      socket.emit('variableNames', var_names);
    }
    PythonScript();
  } 
});

// Listen to confrim output message
socket.off('confirmOutput').on('confirmOutput', () => {
  while (true) {
    out = prompt(`Please state your output varible from your uploaded file:
    \n-${var_names.toString().replaceAll(',','\n-')}`, var_names[var_names.length-1]);
    // check if the value exists
    if (Boolean(var_names.indexOf(out) !== -1)) {
      console.log(`The user choose output as: ${out}`);
      socket.emit('output', out);
      break;
    };
  }  
});

// Listen to training start message
socket.off('startTraining').on('startTraining', () => {
  async function Train(){
    let pyodide = await initPyodide;
    // await pyodide.loadPackage(["pandas"]);
    // Load and pass variable to python
    pyodide.runPython(`
    data = ${r_data}
    out = ${JSON.stringify(out)}
    `);
    // Run initialization python script
    pyodide.runPython(
      await (await fetch("py/LR.py")).text()
    );
    gram = pyodide.globals.get('gram');
    xy = pyodide.globals.get('xy');
    socket.emit('LRmodelUpdate', { gram, xy });
  }
  Train();
})


  // Scroll down
  chatMessages.scrollTop = chatMessages.scrollHeight;
});

// Message submit
chatForm.addEventListener('submit', (e) => {
  e.preventDefault();

  // Get message text
  let msg = e.target.elements.msg.value;

  msg = msg.trim();

  if (!msg) {
    return false;
  }

  // Emit message to server
  socket.emit('chatMessage', msg);

  // Clear input
  e.target.elements.msg.value = '';
  e.target.elements.msg.focus();
});

// Output message to DOM
function outputMessage(message) {
  const div = document.createElement('div');
  div.classList.add('message');
  const p = document.createElement('p');
  p.classList.add('meta');
  p.innerText = message.username;
  p.innerHTML += `<span>${message.time}</span>`;
  div.appendChild(p);
  const para = document.createElement('p');
  para.classList.add('text');
  para.innerText = message.text;
  div.appendChild(para);
  document.querySelector('.chat-messages').appendChild(div);
}

// Add room name to DOM
function outputRoomName(room) {
  roomName.innerText = room;
}

// Add users to DOM
function outputUsers(users) {
  userList.innerHTML = '';
  users.forEach((user) => {
    const li = document.createElement('li');
    li.innerText = user.username;
    userList.appendChild(li);
  });
}

//Prompt the user before leave chat room
document.getElementById('leave-btn').addEventListener('click', () => {
  const leaveRoom = confirm('Are you sure you want to leave current federated project?');
  if (leaveRoom) {
    window.location = '../index.html';
  } else {
  }
});

