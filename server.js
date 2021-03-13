const express = require('express');
const http = require('http');

const port = process.env.PORT || 4001;
const index = require('./routes/index');

const app = express();
app.use(index);

const server = http.createServer(app);

const options = {
  cors: true,
  origins: ['http://127.0.0.1:5347'],
};

const io = require('socket.io')(server, options);
io.on('connection', (socket) => {
  /* ... */
});

io.on('connection', (socket) => {
  socket.emit('your id', socket.id);
  console.log('New client connected');
  socket.on('send message', (body) => {
    io.emit('message', body);
    console.log(body);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

server.listen(port, () => console.log(`Listening on port ${port}`));
