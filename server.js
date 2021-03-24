const express = require('express');
const http = require('http');
const fs = require('fs');


// ----------------- SERVER SETUP ----------------- 
const port = process.env.PORT || 4000;
const index = require('./routes/index');

const app = express();
app.use(index);


const server = http.createServer(app);
const io = require('socket.io')(server,{
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    optionsSuccessStatus: 200
  }
});


// ----------------- GAME LOGIC ----------------- 
let cardDeckOPNV = [];

fs.readFile('./decks.json', 'utf8', (err, data) => {
  if (err) {
    console.log(`Error reading file from disk: ${err}`);
  } else {
    cardDeckOPNV = JSON.parse(data);
    // print all databases
    //databases.forEach((db) => {
    //  console.log(`${db}`);
    //});
  }
});
let allClients = [];

let game = {
  claim: '',
  affirmativeID: '',
  affirmativeName: '',
  negativeID: '',
  negativeName: '',
  judgeID: '',
  judgeName: '',
  spectatorID: [],
  round: 1,
  cardList: [],
  chatList: [],
  preparedDeck: cardDeckOPNV
};

//  {
  //    body: 'fuk u',
  //    role: 'affirmative',
  //    judgeRating: 0,
  //    spectatorRating: 0,
  //  }
  
  function pushToUserArray(arr, obj) {
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

function pushToCardList(arr, obj) {}

io.on('connection', (socket) => {
  socket.emit('your id', socket.id);
  socket.emit('game', game);
  console.log(socket.id + ' has connected');

  socket.on('set topic', (topic) => {
    game.claim = topic;
    console.log(game);
    io.emit('topic', topic);
  });
  socket.on('rate card', (msg) => {
    if (game.judgeID == socket.id)
      game.cardList[msg.index].judgeRating += msg.rating;
    if (game.spectatorID == socket.id)
      game.cardList[msg.index].spectatorRating += msg.rating;
    io.emit('game', game);
  });

  socket.on('set user', (user) => {
    switch (user.role) {
      case 'affirmative':
        game.affirmativeID = socket.id;
        game.affirmativeName = user.name;
        break;
      case 'negative':
        game.negativeID = socket.id;
        game.negativeName = user.name;
        break;
      case 'judge':
        game.judgeID = socket.id;
        game.judgeName = user.name;
        break;
      case 'spectator':
        game.spectatorID.push = socket.id;
      default:
        break;
    }
    console.log('user ' + socket.id + ' has set their role to ' + user.role);
    io.emit('game', game);
    if (game.affirmativeID && game.negativeID && game.judgeID) {
      io.emit('get ready');
    }
    //io.emit('user list', allClients);
  });

  socket.on('start round', (users) => {
    io.emit('');
  });
  socket.on('send message', (msg) => {
    if (game.judgeID != socket.id) {
      game.cardList.push(msg);
      io.emit('message', game.cardList);
    }
    if (game.judgeID == socket.id) {
      io.emit('judge ruling', msg.body);
    }
    //io.emit('message', body);
    console.log(game.cardList);
  });
  socket.on('next round', () => {
    if (game.judgeID == socket.id) {
      game.round += 1;
      game.cardList = [];
      io.emit('game', game);
    }
  });

  socket.on('chat message', (msg) => {
    const msgObj = {
      name: msg.name,
      body: msg.body,
    };
    game.chatList.push(msg);
    io.emit('chat messages', game.chatList);
  });

  socket.on("end game",(msg)=>{
    io.emit("finish game",msg)
  });

  socket.on('disconnect', () => {
    //todo: reimplement this
    var i = allClients.findIndex((x) => x.ID === socket.id);
    console.log(allClients);
    allClients.splice(i, 1);
  });
});

server.listen(port, () => console.log(`Listening on port ${port}`));
