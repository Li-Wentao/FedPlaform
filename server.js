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
let var_names;
let checkOutput = [];
let G = [];
let XY = [];

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// // test py
// let spawn = require('child_process').spawn,
// py    = spawn('python', ['server_py/compute_input.py']),
// // data  = ans,
// dataString = '';

// py.stdout.on('data', function(data){
//   dataString += data.toString();
// });
// py.stdout.on('end', function(){
//   console.log('Sum of numbers=',dataString); //JSON.parse
// });
// py.stdin.write(ans1);
// py.stdin.end();






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
  socket.on('status', () => {
    const user = getCurrentUser(socket.id);
    GetReady.push(user.username);
    GetReady = GetReady.filter(onlyUnique);

    console.log(`Client ${user.username} agreed to start!`);
    console.log(`${GetReady.length} out of ${getRoomUsers(user.room).length} clients are ready to start.`);
    io.to(user.room).emit('message', formatMessage(user.username, `Ready to start (${GetReady.length}/${getRoomUsers(user.room).length})`));
    
    // Notify all clients that the FL is starting
    if (GetReady.length == getRoomUsers(user.room).length) {
      StartRunning = true;
      io.to(user.room).emit('start', true);
      io.to(user.room).emit('message', formatMessage(botName, `All users agreed to start, and the federated learning project \[${user.room}\] starts initiating.`));
      console.log('Send out starting message to all clients.')
      
      // reset GetReady list to empty
      GetReady = []
    }
  });

  // Listen to the varibles names from each clients
  socket.on('variableNames', (msg) => {
    const user = getCurrentUser(socket.id);
    var_names = msg;
    console.log(`Get the variable names from user ${user.username}:\n${var_names}`);
    io.to(user.room).emit('message', formatMessage(botName, `There are ${var_names.length} variables detected from trainer 
    ${user.username}:\n\n-${var_names.toString().replaceAll(',','\n-')}`));
    io.to(user.id).emit('confirmOutput')
  });

  // // Check both output from clients are the same
  socket.on('output', (msg) => {
    const user = getCurrentUser(socket.id);
    console.log(`Get output from user ${user.username}: ${msg}`)
    checkOutput.push(msg)
    // console.log(`checkOutput: ${checkOutput}`)
    if (checkOutput.length == getRoomUsers(user.room).length) {
      if (checkOutput.filter(onlyUnique).length == 1){
        io.to(user.room).emit('message', formatMessage(botName, `All trainers agreed on variable ${msg} as 
        output label.\nTraning initiating...`));
        io.to(user.room).emit('startTraining');
      } else {
        io.to(user.room).emit('message', formatMessage(botName, `There are more than one output label 
        have been designated:\n${checkOutput.filter(onlyUnique)}\nTo continue, please restart the training.`));
      }
      // resset checkOutput to empty
      checkOutput = [];
    }
  });

  // Listen to LR model update
  socket.on('LRmodelUpdate', ({ gram, xy }) => {
    const user = getCurrentUser(socket.id);
    G.push(gram);
    XY.push(xy);
    // console.log(`Get the XY matrix from user ${user.username}:\n${xy}`)
    
    if (G.length == getRoomUsers(user.room).length) {
      G = G.join('\n');
      XY = XY.join('\n');

      // Run python here (for G)
      let spawn = require('child_process').spawn,
      py1    = spawn('python', ['server_py/sum.py']),
      G_sum = '';
      py1.stdout.on('data', function(data){
        G_sum += data.toString();
      });
      py1.stdout.on('end', function(){
        console.log('Sum of G=\n'); //JSON.parse
      });
      py1.stdin.write(G);
      py1.stdin.end();
      
      // Run python here (for XY)
      let py2 = spawn('python', ['server_py/sum.py']);
      let XY_sum = '';
      py2.stdout.on('data', function(data){
        XY_sum += data.toString();
      });
      py2.stdout.on('end', function(){
        console.log('Sum of XY=\n'); //JSON.parse
      });
      py2.stdin.write(XY);
      py2.stdin.end();

      // [G_sum, XY_sum] = getData(G, XY)

      // Run when G and XY are summed
      // await G_sum;
      console.log('G summed:\n',G_sum);
      // console.log('XY summed:\n',XY_sum);
        // let spawn = require('child_process').spawn;
        // let py3 = spawn('python', ['server_py/inverse.py']);
        // let beta = '';
        // py3.stdout.on('data', function(data){
        //   beta += data.toString();
        // });
        // py3.stdout.on('end', function(){
        //   console.log('Get the beta=\n',beta); //JSON.parse
        // });
        // py3.stdin.write(G_sum+'\n'+XY_sum);
        // py3.stdin.end();
     
  }
    // python`sorted(${gram})`.then(x => console.log(x));
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
