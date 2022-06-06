const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const formatMessage = require('./utils/messages');
const {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers
} = require('./utils/users');
const pythonBridge = require('python-bridge');
const python = pythonBridge();

let list = [3, 4, 2, 1];
python`sorted(${list})`.then(x => console.log(x));


const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Set static folder
app.use(express.static(path.join(__dirname, 'public')));
// app.use(express.static(path.join(__dirname, 'utils')));
// app.use(express.static('utils'));

const botName = 'FedPlatform Bot';
let GetReady = [];
let StartRunning = false;

// Get unique elements in array
function onlyUnique(value, index, self) {
  return self.indexOf(value) === index;
};

// Run when client connects
io.on('connection', socket => {
  socket.on('joinRoom', ({ username, room }) => {
    const user = userJoin(socket.id, username, room);

    socket.join(user.room);

    // Welcome current user
    socket.emit('message', formatMessage(botName, `Welcome to FedPlatfrom! You are currently in Project \[${user.room}\].
    Your data will ALWAYS stay in LOCAL during the training.`));

    // Broadcast when a user connects
    socket.broadcast
      .to(user.room)
      .emit(
        'message',
        formatMessage(botName, `${user.username} has joined the project`)
      );

    // Send users and room info
    io.to(user.room).emit('roomUsers', {
      room: user.room,
      users: getRoomUsers(user.room)
    });
  });

  // Listen for chatMessage
  socket.on('chatMessage', msg => {
    const user = getCurrentUser(socket.id);

    io.to(user.room).emit('message', formatMessage(user.username, msg));
  });

  // Runs when all clients hit Start Training button
  socket.on('status', msg => {
    const user = getCurrentUser(socket.id);
    GetReady.push(user.username);
    GetReady = GetReady.filter(onlyUnique);

    console.log(`Client ${user.username} agreed to start!`);
    console.log(`${GetReady.length} out of ${getRoomUsers(user.room).length} clients are ready to start.`);
    io.to(user.room).emit('message', formatMessage(user.username, 'Ready to start'));
    
    // Notify all clients that the FL is starting
    if (GetReady.length == getRoomUsers(user.room).length) {
      StartRunning = true;
      io.to(user.room).emit('message', formatMessage(botName, `All users agreed to start, and the federated learning project \[${user.room}\] starts initiating.`));
      io.to(user.room).emit('start');
    }
  });

  // Runs when client disconnects
  socket.on('disconnect', () => {
    const user = userLeave(socket.id);

    if (user) {
      io.to(user.room).emit(
        'message',
        formatMessage(botName, `${user.username} has left the project`)
      );

      // Send users and room info
      io.to(user.room).emit('roomUsers', {
        room: user.room,
        users: getRoomUsers(user.room)
      });
    }
  });
});

const PORT = process.env.PORT || 8080;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
