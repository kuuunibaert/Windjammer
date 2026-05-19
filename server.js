const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// ============================================================
// GAME STATE
// rooms[roomCode] = { players, status, deck, currentPlayerIndex, round, roundCards }
// ============================================================
const rooms = {};

// ============================================================
// DECK HELPERS
// Hier kannst du das Deck für Windjammers anpassen!
// ============================================================
function createDeck() {
  const suits = ['🪸', '🦐', '🐬', '☠️', '⛵', '🌊', '💨', '⚓'];
  const deck = [];
  let i = 0;
  for (const suit of suits) {
    if (i == 0){
      const values = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
      for (const value of values) {
        deck.push({ id: `${value}${suit}`, suit, value });
      }
      i = 1;
    }
    else if (i == 1){
      const values = ['11', '12', '13', '14', '15', '16', '17', '18', '19', '20'];
      for (const value of values) {
        deck.push({ id: `${value}${suit}`, suit, value });
      }
      i = 2;
    }
    else if (i == 2){
      const values = ['21', '22', '23', '24', '25', '26', '27', '28', '29'];
      for (const value of values) {
        deck.push({ id: `${value}${suit}`, suit, value });
      }
      i = 3;
    }
    else if (i == 3){
      const values = ['31', '32', '33', '34', '35', '36', '37', '38'];
      for (const value of values) {
        deck.push({ id: `${value}${suit}`, suit, value });
      }
      i = 4;
    }
    else if (i == 4){
      const values = ['41', '42', '43', '44', '45', '46', '47'];
      for (const value of values) {
        deck.push({ id: `${value}${suit}`, suit, value });
      }
      i = 5;
    }
    else if (i == 5){
      const values = ['51', '52', '53', '54', '55', '56'];
      for (const value of values) {
        deck.push({ id: `${value}${suit}`, suit, value });
      }
      i = 6;
    }
    else if (i == 6){
      const values = ['61', '62', '63', '64', '65'];
      for (const value of values) {
        deck.push({ id: `${value}${suit}`, suit, value });
      }
      i = 7;
    }
    else if (i == 7){
      const values = ['71', '72', '73', '74'];
      for (const value of values) {
        deck.push({ id: `${value}${suit}`, suit, value });
      }
      i = 0;
    }
  }
  return deck;
}

function shuffle(deck) {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

function getPublicPlayers(room) {
  return room.players.map((p) => ({
    id: p.id,
    name: p.name,
    isHost: p.isHost,
    cardCount: p.hand.length,
    score: p.score ?? 0,
  }));
}

// ============================================================
// SOCKET EVENTS
// ============================================================
io.on('connection', (socket) => {
  console.log(`[+] Verbunden: ${socket.id}`);

  // ----------------------------------------------------------
  // JOIN ROOM
  // ----------------------------------------------------------
  socket.on('join-room', ({ name, roomCode }) => {
    if (!name || !roomCode) return;

    const code = roomCode.toUpperCase().trim();

    if (!rooms[code]) {
      rooms[code] = {
        players: [],
        status: 'lobby',
        deck: [],
        currentPlayerIndex: 0,
        round: 0,
        roundCards: [],
      };
    }

    const room = rooms[code];

    if (room.status !== 'lobby') {
      socket.emit('error', { message: 'Das Spiel läuft bereits – du kannst nicht mehr beitreten.' });
      return;
    }

    const isHost = room.players.length === 0;
    const player = { id: socket.id, name: name.trim().substring(0, 20), isHost, hand: [] };
    room.players.push(player);

    socket.join(code);
    socket.data.roomCode = code;
    socket.data.playerName = player.name;

    console.log(`[LOBBY] ${player.name} ist Raum ${code} beigetreten (Host: ${isHost})`);

    // Dem neuen Spieler: seine eigenen Infos + alle Spieler
    socket.emit('joined', {
      player: { id: player.id, name: player.name, isHost },
      players: getPublicPlayers(room),
    });

    // Allen anderen: aktualisierte Spielerliste
    io.to(code).emit('lobby-update', { players: getPublicPlayers(room) });
  });

  // ----------------------------------------------------------
  // START GAME (nur Host)
  // ----------------------------------------------------------
  socket.on('start-game', () => {
    const code = socket.data.roomCode;
    const room = rooms[code];
    if (!room) return;

    const player = room.players.find((p) => p.id === socket.id);
    if (!player?.isHost) {
      socket.emit('error', { message: 'Nur der Kapitän kann das Spiel starten.' });
      return;
    }

    if (room.players.length < 2) {
      socket.emit('error', { message: 'Mindestens 2 Spieler werden benötigt.' });
      return;
    }

    // Deck mischen und austeilen
    const deck = shuffle(createDeck());
    const cardsPerPlayer = Math.floor(deck.length / room.players.length);

    room.players.forEach((p, i) => {
      p.hand = deck.slice(i * cardsPerPlayer, (i + 1) * cardsPerPlayer);
    });

    room.status = 'playing';
    room.currentPlayerIndex = 0;
    room.round = 1;
    room.roundCards = [];

    console.log(`[GAME] Spiel gestartet in Raum ${code} – ${room.players.length} Spieler, ${cardsPerPlayer} Karten/Spieler`);

    // Jedem Spieler seine Hand schicken
    room.players.forEach((p) => {
      io.to(p.id).emit('game-started', {
        hand: p.hand,
        currentPlayer: room.players[room.currentPlayerIndex].id,
        players: getPublicPlayers(room),
        round: room.round,
      });
    });
  });

  // ----------------------------------------------------------
  // PLAY CARD
  // ----------------------------------------------------------
  socket.on('play-card', ({ cardId }) => {
    const code = socket.data.roomCode;
    const room = rooms[code];
    if (!room || room.status !== 'playing') return;

    const currentPlayer = room.players[room.currentPlayerIndex];
    if (currentPlayer.id !== socket.id) {
      socket.emit('error', { message: 'Du bist nicht dran!' });
      return;
    }

    const cardIndex = currentPlayer.hand.findIndex((c) => c.id === cardId);
    if (cardIndex === -1) {
      socket.emit('error', { message: 'Karte nicht gefunden.' });
      return;
    }

    // Karte aus der Hand entfernen
    const [card] = currentPlayer.hand.splice(cardIndex, 1);
    room.roundCards.push({ playerId: socket.id, playerName: currentPlayer.name, card });

    console.log(`[CARD] ${currentPlayer.name} legt ${card.value}${card.suit} (Runde ${room.round})`);

    // Nächster Spieler
    room.currentPlayerIndex = (room.currentPlayerIndex + 1) % room.players.length;

    const roundComplete = room.roundCards.length === room.players.length;

    if (roundComplete) {
      const gewinnerId = evaluateRound(room.roundCards); // Runde beendet – hier kann deine Auswertungslogik rein!
      addScore(room, gewinnerId, 1);

      io.to(code).emit('round-complete', {
        roundCards: room.roundCards,
        round: room.round,
        scoreboard: getPublicPlayers(room)
      });

      const gameOver = room.players.every((p) => p.hand.length === 0);

      if (gameOver) {
        room.status = 'finished';
        io.to(code).emit('game-over', {
          message: 'Alle Karten gespielt – Spiel beendet!',
        });
        console.log(`[GAME] Spiel in Raum ${code} beendet.`);
      } else {
        // Neue Runde vorbereiten
        room.round++;
        room.roundCards = [];

        room.players.forEach((p) => {
          io.to(p.id).emit('new-round', {
            hand: p.hand,
            currentPlayer: room.players[room.currentPlayerIndex].id,
            players: getPublicPlayers(room),
            round: room.round,
          });
        });
      }
    } else {
      // Karte gespielt, Runde läuft noch
      io.to(code).emit('card-played', {
        playerId: socket.id,
        playerName: currentPlayer.name,
        card,
        currentPlayer: room.players[room.currentPlayerIndex].id,
        roundCards: room.roundCards,
      });

      // Dem Spieler seine aktualisierte Hand schicken
      socket.emit('hand-update', { hand: currentPlayer.hand });
    }
  });

  // Deine Funktion irgendwo in server.js:
  function evaluateRound(roundCards) {
    const VALUE_ORDER = { '0': 0, '1': 1, '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'11': 1,'12':2,'13':3,'14':4,'15':5,'16':6,'17':7,'18':8,'19':9,'20':10,'21': 1,'22':2,'23':3,'24':4,'25':5,'26':6,'27':7,'28':8,'29':9, '31': 1, '32':2,'33':3,'34':4,'35':5,'36':6,'37':7,'38':8, '41': 1, '42':2,'43':3,'44':4,'45':5,'46':6,'47':7,'51': 1,'52':2,'53':3,'54':4,'55':5,'56':6,'61': 1, '62':2,'63':3,'64':4,'65':5,'71': 1, '72':2,'73':3,'74':4};
    const SUIT_ORDER  = { '🪸':0, '🦐':1, '🐬':2, '☠️':3, '⛵':4, '🌊':5, '💨':6, '⚓':7 };
    // Beispiel: höchste Karte gewinnt
    const winner = roundCards.reduce((best, entry) => {
      return VALUE_ORDER[entry.card.value] > VALUE_ORDER[best.card.value] ? entry : best;
    });
    return winner.playerId;
  }

  function addScore(room, playerId, amount = 1) {
    const player = room.players.find((p) => p.id === playerId);
    console.log(`test ${player.playerName}`);
    if (player){
      player.score = (player.score ?? 0) + amount;
    } 
  }

  // ----------------------------------------------------------
  // DISCONNECT
  // ----------------------------------------------------------
  socket.on('disconnect', () => {
    const code = socket.data.roomCode;
    if (!code || !rooms[code]) return;

    const room = rooms[code];
    const idx = room.players.findIndex((p) => p.id === socket.id);
    if (idx === -1) return;

    const wasHost = room.players[idx].isHost;
    const playerName = room.players[idx].name;
    room.players.splice(idx, 1);

    console.log(`[-] ${playerName} hat Raum ${code} verlassen`);

    if (room.players.length === 0) {
      delete rooms[code];
      console.log(`[ROOM] Raum ${code} gelöscht (leer)`);
      return;
    }

    // Neuen Host bestimmen falls nötig
    if (wasHost) {
      room.players[0].isHost = true;
      console.log(`[HOST] ${room.players[0].name} ist neuer Kapitän in Raum ${code}`);
    }

    io.to(code).emit('player-left', {
      playerName,
      players: getPublicPlayers(room),
    });
  });
});

// ============================================================
// START SERVER
// ============================================================
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`\n🌊 Windjammers Server läuft auf Port ${PORT}\n`);
});
