const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const { createGame, placeTile, drawTile, hasValidMove } = require('./gameLogic');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());

// Serve React build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
}

// =============================================
// In-memory state
// =============================================
const rooms = {}; // roomId -> { players, gameState, settings, host }

function getRoomPublicState(room) {
  if (!room.gameState) return null;
  const gs = room.gameState;
  // Build per-player view: hide other players' hands (just count)
  const handCounts = {};
  for (const p of gs.players) {
    handCounts[p.id] = gs.hands[p.id].length;
  }
  return {
    chain: gs.chain,
    leftEnd: gs.leftEnd,
    rightEnd: gs.rightEnd,
    currentPlayerId: gs.players[gs.currentPlayerIndex]?.id,
    phase: gs.phase,
    winner: gs.winner,
    drawPileCount: gs.drawPile.length,
    handCounts,
    settings: gs.settings,
  };
}

// =============================================
// Socket.io events
// =============================================
io.on('connection', (socket) => {
  console.log(`[connect] ${socket.id}`);

  // --- Create or join room ---
  socket.on('joinRoom', ({ roomId, playerName }, cb) => {
    let room = rooms[roomId];

    if (!room) {
      // Create room
      room = {
        id: roomId,
        players: [],
        gameState: null,
        settings: { operations: ['+'], mode: 'easy' },
        host: null,
      };
      rooms[roomId] = room;
    }

    if (room.gameState && room.gameState.phase === 'playing') {
      // Check if reconnecting
      const existing = room.players.find(p => p.name === playerName);
      if (!existing) {
        cb({ error: 'Hra již probíhá.' });
        return;
      }
      // Reconnect
      existing.socketId = socket.id;
      socket.join(roomId);
      socket.emit('reconnected', {
        playerId: existing.id,
        hand: room.gameState.hands[existing.id],
        publicState: getRoomPublicState(room),
        players: room.players,
      });
      cb({ success: true, playerId: existing.id });
      return;
    }

    if (room.players.length >= 3) {
      cb({ error: 'Místnost je plná (max 3 hráči).' });
      return;
    }

    const player = { id: socket.id, name: playerName, socketId: socket.id };
    room.players.push(player);
    if (room.players.length === 1) room.host = socket.id;

    socket.join(roomId);

    // Notify all in room
    io.to(roomId).emit('roomUpdate', {
      players: room.players,
      host: room.host,
      settings: room.settings,
    });

    cb({ success: true, playerId: socket.id, isHost: room.host === socket.id });
    console.log(`[join] ${playerName} joined room ${roomId}`);
  });

  // --- Update settings (host only) ---
  socket.on('updateSettings', ({ roomId, settings }) => {
    const room = rooms[roomId];
    if (!room || room.host !== socket.id) return;
    room.settings = settings;
    io.to(roomId).emit('settingsUpdate', settings);
  });

  // --- Start game (host only) ---
  socket.on('startGame', ({ roomId }, cb) => {
    const room = rooms[roomId];
    if (!room) { cb({ error: 'Místnost neexistuje.' }); return; }
    if (room.host !== socket.id) { cb({ error: 'Pouze hostitel může spustit hru.' }); return; }
    if (room.players.length < 2) { cb({ error: 'Potřeba alespoň 2 hráče.' }); return; }

    room.gameState = createGame(roomId, room.players, room.settings);

    // Send each player their hand privately
    for (const player of room.players) {
      io.to(player.socketId).emit('gameStarted', {
        hand: room.gameState.hands[player.id],
        publicState: getRoomPublicState(room),
        players: room.players,
        playerId: player.id,
      });
    }

    cb({ success: true });
    console.log(`[start] Room ${roomId} game started with ${room.players.length} players`);
  });

  // --- Place tile ---
  socket.on('placeTile', ({ roomId, tileId, end, flipped }, cb) => {
    const room = rooms[roomId];
    if (!room || !room.gameState) { cb({ error: 'Hra neexistuje.' }); return; }

    const result = placeTile(room.gameState, socket.id, tileId, end, flipped);
    if (!result.success) { cb({ error: result.message }); return; }

    room.gameState = result.state;
    const publicState = getRoomPublicState(room);

    // Notify all players of board update
    io.to(roomId).emit('boardUpdate', { publicState });

    // Send updated hand to the player who placed
    io.to(socket.id).emit('handUpdate', { hand: room.gameState.hands[socket.id] });

    cb({ success: true });

    if (result.state.phase === 'finished') {
      const winner = room.players.find(p => p.id === result.state.winner);
      io.to(roomId).emit('gameOver', { winnerId: result.state.winner, winnerName: winner?.name });
      console.log(`[finish] Room ${roomId} winner: ${winner?.name}`);
    }
  });

  // --- Draw tile ---
  socket.on('drawTile', ({ roomId }, cb) => {
    const room = rooms[roomId];
    if (!room || !room.gameState) { cb({ error: 'Hra neexistuje.' }); return; }

    const result = drawTile(room.gameState, socket.id);
    if (!result.success) { cb({ error: result.message }); return; }

    room.gameState = result.state;
    const publicState = getRoomPublicState(room);

    io.to(roomId).emit('boardUpdate', { publicState });
    io.to(socket.id).emit('handUpdate', { hand: room.gameState.hands[socket.id] });

    if (result.message) {
      io.to(socket.id).emit('notification', { message: result.message });
    }

    cb({ success: true, drew: result.drew });

    if (result.state.phase === 'finished') {
      const winner = room.players.find(p => p.id === result.state.winner);
      io.to(roomId).emit('gameOver', { winnerId: result.state.winner, winnerName: winner?.name });
    }
  });

  // --- Restart game (host only) ---
  socket.on('restartGame', ({ roomId }, cb) => {
    const room = rooms[roomId];
    if (!room) { cb?.({ error: 'Místnost neexistuje.' }); return; }
    if (room.host !== socket.id) { cb?.({ error: 'Pouze hostitel.' }); return; }

    room.gameState = null;
    io.to(roomId).emit('gameReset', { players: room.players, host: room.host, settings: room.settings });
    cb?.({ success: true });
  });

  // --- Disconnect ---
  socket.on('disconnect', () => {
    console.log(`[disconnect] ${socket.id}`);
    for (const [roomId, room] of Object.entries(rooms)) {
      const idx = room.players.findIndex(p => p.socketId === socket.id);
      if (idx !== -1) {
        const player = room.players[idx];
        // If game not started, remove player
        if (!room.gameState || room.gameState.phase === 'finished') {
          room.players.splice(idx, 1);
          if (room.host === socket.id && room.players.length > 0) {
            room.host = room.players[0].socketId;
          }
          io.to(roomId).emit('roomUpdate', { players: room.players, host: room.host, settings: room.settings });
          if (room.players.length === 0) delete rooms[roomId];
        } else {
          // During game: notify but keep slot (allow reconnect)
          io.to(roomId).emit('playerDisconnected', { playerId: socket.id, playerName: player.name });
        }
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Math Domino server running on port ${PORT}`);
});
