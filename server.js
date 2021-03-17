const express = require('express');
const http = require('http');

const port = process.env.PORT || 4001;
const index = require('./routes/index');

const app = express();
app.use(index);

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", '*');
    res.header("Access-Control-Allow-Credentials", true);
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header("Access-Control-Allow-Headers", 'Origin,X-Requested-With,Content-Type,Accept,content-type,application/json');
    next();
});

const server = http.createServer(app);

const options = {
  cors: true,
  origins: ['http://127.0.0.1:5347'],
};

const io = require('socket.io')(server, options);

io.on('connection', (socket) => {
  /* ... */
});

let allClients = [];

function pushToArray(arr, obj) {
  const index = arr.findIndex((e) => e.id === obj.id);
  console.log(index);
  if (index === -1) {
    console.log('new user, pushing to array');
    arr.push(obj);
  } else {
    console.log('overwriting role');
    arr[index] = obj;
  }
}

io.on('connection', (socket) => {
  socket.emit('your id', socket.id);
  socket.emit('user list', allClients);
  console.log(socket.id + ' has connected');

  socket.on('set user', (user) => {
    pushToArray(allClients, { id: user.id, name: user.name, role: user.role });

    console.log(user);
    io.emit('user list', allClients);
  });

  socket.on('send message', (body) => {
    io.emit('message', body);
    console.log(body);
  });

  socket.on('disconnect', () => {
    var i = allClients.findIndex((x) => x.ID === socket.id);

    console.log(allClients);
    allClients.splice(i, 1);
  });
});

server.listen(port, () => console.log(`Listening on port ${port}`));
