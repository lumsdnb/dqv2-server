const express = require('express');
const http = require('http');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

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
  } else return;
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
  socket.on('clear table', () => {
    game.cardList = [];
    io.emit('game', game);
  });
  socket.on('request topic', (t) => {
    io.emit('requested topic change', t);
  });
  socket.on('accept topic change', () => {
    console.log(`${socket.id} has accepted new topic`);
  });
  socket.on('rate card', (msg) => {
    if (msg.rating === 1) {
      console.log(`player upvoted card`);
      game.cardList[msg.index].upVotes += 1;
    }
    if (msg.rating === -1) {
      console.log(`player downvoted card`);
      game.cardList[msg.index].downVotes -= 1;
    }

    if (msg.rating === 3) {
      console.log(`player doesnt understand card`);
      game.cardList[msg.index].numberOfQuestions += 1;
    }
    console.log(game.cardList);
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
        pushToUserArray(game.spectators, {
          name: user.name,
          id: socket.id,
          avi: user.avi,
        });
        const joinedChatMsg = {
          name: user.name,
          body: 'ist dem Chat beigetreten',
          id: socket.id,
        };
        game.chatList.push(joinedChatMsg);
        io.emit('chat messages', game.chatList);
        break;
      default:
        break;
    }

    console.log(game);
    io.emit('game', game);
    console.log('user ' + socket.id + ' has set their role to ' + user.role);
    if (game.affirmativeID && game.negativeID && game.judgeID) {
      io.emit('get ready');
    }
  });

  socket.on('start round', (users) => {
    io.emit('');
  });
  socket.on('start timer', () => {
    io.emit('start round timer');
  });
  socket.on('topic number', (id) => {
    game.topicID = id;
    io.emit('topic id', id);
  });
  socket.on('send message', (msg) => {
    msg.id = uuidv4();
    game.cardList.push(msg);
    io.emit('message', game.cardList);
    io.emit('latest card', msg);

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
    io.emit('game reset');
    io.emit('game', game);
  });

  socket.on('final ruling', (e) => {
    io.emit('final ruling', e);
  });

  socket.on('chat message', (msg) => {
    const msgObj = {
      name: msg.name,
      body: msg.body,
      id: socket.id,
    };
    game.chatList.push(msg);
    console.log(game.chatList);
    io.emit('chat messages', game.chatList);
  });

  socket.on('end game', (msg) => {
    io.emit('finish game', msg);
  });

  socket.on('silence chat', () => {
    if (socket.id == game.judgeID) {
      const msgObj = {
        name: game.judgeName,
        body: 'ruhe!',
        id: game.judgeID,
        type: 'notification',
      };
      game.chatList.push(msgObj);
      io.emit('chat messages', game.chatList);
      io.emit('play sound', 'gavel');
    }
  });

  socket.on('emit sound', (sound) => {
    io.emit('play sound', sound);
  });

  socket.on('disconnect', () => {
    console.log('user has disconnected');
    //todo: reimplement this
    //var i = allClients.findIndex((x) => x.ID === socket.id);
    //console.log(allClients);
    //allClients.splice(i, 1);
  });
});

server.listen(port, () => console.log(`Listening on port ${port}`));
