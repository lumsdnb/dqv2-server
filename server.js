const express = require('express');
const http = require('http');
const fs = require('fs');

// ----------------- SERVER SETUP -----------------
const port = process.env.PORT || 4000;
const index = require('./routes/index');

const app = express();
app.use(index);

const server = http.createServer(app);
const io = require('socket.io')(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    optionsSuccessStatus: 200,
  },
});

// ----------------- GAME LOGIC -----------------

let game = {
  claim: '',
  topicID: 0,
  debater1ID: '',
  debater1Name: '',
  debater1Avi: '-1',
  debater2ID: '',
  debater2Name: '',
  debater2Avi: '-1',
  affirmativeID: '',
  affirmativeName: '',
  affirmativeAvi: '',
  negativeID: '',
  negativeName: '',
  negativeAvi: '',
  judgeID: '',
  judgeName: '',
  judgeAvi: '-1',
  spectators: [],
  round: 1,
  cardList: [],
  chatList: [],
  pastRounds: [],
};

const finalVotes = {
  aff: '',
  neg: '',
  judge: '',
  spectator1: '',
};

//  {
//    body: 'fuk u',
//    role: 'affirmative',
//    judgeRating: 0,
//    spectatorRating: 0,
//    whoVoted []
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

io.on('connection', (socket) => {
  socket.emit('your id', socket.id);
  socket.emit('game', game);
  socket.emit('topic id', game.topicID);
  console.log(socket.id + ' has connected');

  socket.on('set topic', (topic) => {
    game.claim = topic;
    console.log(game);
    io.emit('topic', topic);
  });
  socket.on('rate card', (msg) => {
    if (game.judgeID == socket.id)
      game.cardList[msg.index].judgeRating += msg.rating;
    if (game.spectators.includes(socket.id)) {
      console.log('spec voting');
      game.cardList[msg.index].spectatorRating += msg.rating;
    }
    io.emit('game', game);
  });

  socket.on('set user', (user) => {
    switch (user.role) {
      case 'player1':
        if (!game.debater1ID) {
          game.debater1ID = socket.id;
          game.debater1Name = user.name;
        }
        if (game.debater1ID == socket.id) {
          game.debater1Avi = user.avi;
        }

        break;
      case 'player2':
        if (!game.debater2ID) {
          game.debater2ID = socket.id;
          game.debater2Name = user.name;
        }
        if (game.debater2ID == socket.id) {
          game.debater2Avi = user.avi;
        }
        break;
      case 'judge':
        game.judgeID = socket.id;
        game.judgeName = user.name;
        game.judgeAvi = user.avi;
        break;
      case 'spectator':
        game.spectators.push(user.name);
      default:
        break;
    }

    //if both players exist, decided what roles each get
    if (game.debater1ID != '' && game.debater2ID != '') {
      const rand = Math.random();
      console.log(rand);
      if (rand > 0.5) {
        game.affirmativeID = game.debater1ID;
        game.affirmativeName = game.debater1Name;
        game.affirmativeAvi = game.debater1Avi;
        game.negativeID = game.debater2ID;
        game.negativeName = game.debater2Name;
        game.negativeAvi = game.debater2Avi;
      }
      if (rand < 0.5) {
        game.negativeID = game.debater1ID;
        game.negativeName = game.debater1Name;
        game.negativeAvi = game.debater1Avi;
        game.affirmativeID = game.debater2ID;
        game.affirmativeName = game.debater2Name;
        game.affirmativeAvi = game.debater2Avi;
      }
    }
    io.emit('game', game);
    console.log(game);
    console.log('user ' + socket.id + ' has set their role to ' + user.role);
    if (game.affirmativeID && game.negativeID && game.judgeID) {
      io.emit('get ready');
    }
  });

  socket.on('start round', (users) => {
    io.emit('');
  });
  socket.on('topic number', (id) => {
    game.topicID = id;
    io.emit('topic id', id);
  });
  socket.on('send message', (msg) => {
    if (game.judgeID != socket.id) {
      game.cardList.push(msg);
      io.emit('message', game.cardList);
      io.emit('latest card', msg);
    }
    if (game.judgeID == socket.id) {
      io.emit('judge ruling', msg.body);
    }
    console.log(game.cardList);
  });
  socket.on('next round', () => {
    if (game.judgeID == socket.id) {
      game.pastRounds.push(game.cardList);
      console.log(`round ${game.round} - moving on..`);
      game.cardList = [];

      if (game.round <= 4) {
        game.round += 1;
        io.emit('game', game);
        io.emit('next round');
      }
      if (game.round > 4) {
        io.emit('game', game);
        io.emit('please vote');
      }
    }
  });

  socket.on('reset', () => {
    const resetGame = {
      claim: '',
      topicID: 0,
      debater1ID: '',
      debater1Name: '',
      debater2ID: '',
      debater1Avi: '-1',
      debater2Name: '',
      affirmativeID: '',
      debater2Avi: '-1',
      affirmativeName: '',
      affirmativeAvi: '',
      negativeID: '',
      negativeName: '',
      negativeAvi: '',
      judgeID: '',
      judgeName: '',
      judgeAvi: '-1',
      spectators: [],
      round: 1,
      cardList: [],
      chatList: [],
      pastRounds: [],
    };
    console.log('game has been reset');
    game = resetGame;
    io.emit('game', game);
  });
  socket.on('send final vote', (obj) => {
    switch (obj.role) {
      case 'affirmative':
        finalVotes.aff = obj.vote;
        break;
      case 'negative':
        finalVotes.neg = obj.vote;
      case 'judge':
        finalVotes.judge = obj.vote;
        break;
      case 'spectator':
        finalVotes.spectator = obj.vote;
        break;

      default:
        break;
    }
    console.log(finalVotes);
    io.emit('final votes', finalVotes);
  });

  socket.on('final ruling', (e) => {
    io.emit('final ruling', e);
  });

  socket.on('chat message', (msg) => {
    const msgObj = {
      name: msg.name,
      body: msg.body,
    };
    game.chatList.push(msg);
    console.log(game.chatList);
    io.emit('chat messages', game.chatList);
  });

  socket.on('end game', (msg) => {
    io.emit('finish game', msg);
  });

  socket.on('emit sound', (sound) => {
    io.emit('play sound', sound);
  });

  socket.on('disconnect', () => {
    //todo: reimplement this
    //var i = allClients.findIndex((x) => x.ID === socket.id);
    //console.log(allClients);
    //allClients.splice(i, 1);
  });
});

server.listen(port, () => console.log(`Listening on port ${port}`));
