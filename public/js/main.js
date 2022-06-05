const chatForm = document.getElementById('chat-form');
const chatMessages = document.querySelector('.chat-messages');
const roomName = document.getElementById('room-name');
const userList = document.getElementById('users');
let dropArea = document.getElementById('drop-area');
const pythonBridge = require('python-bridge');
const python = pythonBridge();

let data;
let start = false;

let list = [3, 4, 2, 1];
python`sorted(${list})`.then(x => console.log(x));


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
  };
  extractor.onerror = function (event) {
    console.error("File could not be read! Code " + event.target.error.code);
  };
  extractor.readAsBinaryString(file);
  // data = extractor;
  // console.log(`We got the data: ${data.result}`);
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
    let start = true
    console.log('Agree to start', start);
    socket.emit('status', start);
  } else {
    let start = false
    console.log('Refuse to start', start);
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
socket.on('start', () => {
  console.log('Begin initializting data in local...');
  console.log('Data loaded as', data);
  // // Save the data into a file locally
  // var hiddenElement = document.createElement('a');

  // hiddenElement.href = 'data:attachment/text,' + encodeURI(data);
  // hiddenElement.target = '_blank';
  // hiddenElement.download = 'data.csv';
  // hiddenElement.click();
});

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

