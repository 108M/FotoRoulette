require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json());

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${req.body.roomId}-${req.body.socketId}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});
const upload = multer({ storage: storage });

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const rooms = {};

app.post('/upload', upload.array('photos', 10), (req, res) => {
  const { roomId, socketId } = req.body;
  console.log(`\n[UPLOAD] Intento de subida - Sala: ${roomId}, Socket: ${socketId}`);

  if (!rooms[roomId]) {
    console.log(`[UPLOAD][ERROR] Sala ${roomId} no encontrada`);
    return res.status(404).send('Room not found');
  }
  if (!rooms[roomId].players[socketId]) {
    console.log(`[UPLOAD][ERROR] Jugador ${socketId} no está en la sala`);
    return res.status(404).send('Player not found');
  }

  // --- FILTRO ANTI-TRAMPAS MODO HÍBRIDO ---
  const filePaths = req.files.map(f => `"${path.resolve(f.path)}"`).join(' ');
  const pythonScript = path.resolve(__dirname, 'clasificar.py');
  
  // Usamos 'python3' por si el Docker lo exige, o 'python' (Render / Local OS compatibility)
  const pyCmd = process.platform === "win32" ? "python" : "python3";
  const cmd = `${pyCmd} "${pythonScript}" ${filePaths}`;

  console.log(`[UPLOAD] IA Analizando ${req.files.length} fotos subidas...`);
  
  exec(cmd, { maxBuffer: 1024 * 1024 * 5 }, (error, stdout, stderr) => {
    let result = null;
    try {
      // Python devuelve el resultado en la última línea como JSON bruto
      const lines = stdout.trim().split("\n");
      result = JSON.parse(lines[lines.length - 1]);
    } catch (e) {
      console.error("[IA ERROR] Parse JSON:\n", stdout, "\n", stderr);
      // Fallback de emergencia: aceptamos todas para no bloquear el juego
      result = { accepted: req.files.map(f => f.path), rejected: [] };
    }

    if (result.error) {
       console.error(`[IA SCRIPT ERROR]: ${result.error}`);
       result = { accepted: req.files.map(f => f.path), rejected: [] };
    }

    const rechazadas = result.rejected || [];
    const aceptadas = result.accepted || [];

    // 1. Borrar Físicamente los Apuntes Tramposos
    rechazadas.forEach(rPath => {
       try { 
         fs.unlinkSync(rPath); 
         console.log(`[ANTI-TRAMPAS] Borrado apunte detectado: ${path.basename(rPath)}`);
       } catch (err) {}
    });

    // 2. Guardar en partida las Correctas
    const photoUrls = aceptadas.map(p => '/uploads/' + path.basename(p));
    // Inicializamos array si no existe, o adjuntamos las nuevas (Por si le estamos reponiendo fallos)
    rooms[roomId].players[socketId].photos = rooms[roomId].players[socketId].photos.concat(photoUrls);

    console.log(`[UPLOAD][OK] ${photoUrls.length} fotos validadas. ${rechazadas.length} APUNTES DESTRUIDOS 🔥`);
    
    // 3. Devolvemos resultados al Móvil para que rellene automáticamente
    res.json({ 
      success: true, 
      urls: photoUrls, 
      rejectedCount: rechazadas.length 
    });
  });
});

io.on('connection', (socket) => {
  console.log(`\n[SOCKET] Nueva conexión: ${socket.id}`);

  socket.on('createRoom', ({ name }) => {
    const roomId = Math.random().toString(36).substring(2, 6).toUpperCase();
    console.log(`[ROOM] Creando sala: ${roomId} por usuario: ${name}`);
    rooms[roomId] = {
      id: roomId,
      state: 'LOBBY',
      creator: socket.id,
      players: {},
      photosPool: [],
      currentRound: null,
      maxRounds: 10,
      gameMode: 'HARD'
    };
    joinRoom(socket, roomId, name);
  });

  socket.on('joinRoom', ({ roomId, name }) => {
    console.log(`[ROOM] Usuario ${name} intentando unirse a: ${roomId}`);
    const rId = roomId?.toUpperCase();
    if (!rooms[rId]) return socket.emit('error', 'Room not found');
    joinRoom(socket, rId, name);
  });

  function joinRoom(socket, roomId, name) {
    socket.join(roomId);
    socket.roomId = roomId;
    rooms[roomId].players[socket.id] = {
      id: socket.id,
      name: name || "Sin nombre", // Fallback para evitar el 'undefined'
      score: 0,
      photos: [],
      ready: false
    };
    console.log(`[JOIN] ${name} unido a ${roomId}. Total jugadores: ${Object.keys(rooms[roomId].players).length}`);
    io.to(roomId).emit('roomState', getSafeRoomState(roomId));
  }

  socket.on('startGame', () => {
    const room = rooms[socket.roomId];
    if (!room || room.creator !== socket.id) return;
    console.log(`[GAME] Iniciando selección de fotos en sala ${socket.roomId}`);
    room.state = 'PHOTO_SELECTION';
    io.to(socket.roomId).emit('roomState', getSafeRoomState(socket.roomId));
  });

  socket.on('updateSettings', ({ maxRounds, gameMode }) => {
    const room = rooms[socket.roomId];
    if (room && room.creator === socket.id && room.state === 'LOBBY') {
      if (maxRounds !== undefined) room.maxRounds = maxRounds;
      if (gameMode !== undefined) room.gameMode = gameMode;
      io.to(socket.roomId).emit('roomState', getSafeRoomState(socket.roomId));
    }
  });

  socket.on('playerReady', () => {
    const room = rooms[socket.roomId];
    if (!room || !room.players[socket.id]) return;

    room.players[socket.id].ready = true;
    console.log(`[READY] Jugador ${room.players[socket.id].name} listo.`);

    const playersArr = Object.values(room.players);
    const allReady = playersArr.every(p => p.ready);

    if (allReady && playersArr.length > 0) {
      console.log(`[GAME] Todos listos en ${socket.roomId}. Iniciando rondas...`);
      startRounds(socket.roomId);
    } else {
      io.to(socket.roomId).emit('roomState', getSafeRoomState(socket.roomId));
    }
  });

  socket.on('vote', ({ guessedSocketId }) => {
    const room = rooms[socket.roomId];
    if (!room || room.state !== 'PLAYING') return;
    room.currentRound.votes[socket.id] = { guessedId: guessedSocketId, timestamp: Date.now() };
    console.log(`[VOTE] ${room.players[socket.id].name} votó por ${room.players[guessedSocketId]?.name || '?'}`);

    const totalPlayers = Object.keys(room.players).length;
    const totalVotes = Object.keys(room.currentRound.votes).length;

    if (totalVotes >= totalPlayers) {
      console.log(`[GAME] Todos los jugadores han votado en la sala ${socket.roomId}. Terminado antes de tiempo.`);
      if (room.currentRound.timeoutId) clearTimeout(room.currentRound.timeoutId);
      endRound(socket.roomId);
    }
  });

  socket.on('disconnect', () => {
    console.log(`[SOCKET] Desconectado: ${socket.id}`);
    const roomId = socket.roomId;
    if (roomId && rooms[roomId]) {
      delete rooms[roomId].players[socket.id];
      if (Object.keys(rooms[roomId].players).length === 0) {
        console.log(`[CLEANUP] Sala ${roomId} vacía, eliminando...`);
        
        try {
          const files = fs.readdirSync(uploadsDir);
          let deleted = 0;
          for (const file of files) {
            if (file.startsWith(`${roomId}-`)) {
              fs.unlinkSync(path.join(uploadsDir, file));
              deleted++;
            }
          }
          if (deleted > 0) console.log(`[CLEANUP] ${deleted} ficheros huérfanos de ${roomId} borrados.`);
        } catch (error) {
          console.error(`[CLEANUP][ERROR] No se pudieron purgar archivos tras abandono:`, error);
        }

        delete rooms[roomId];
      } else {
        io.to(roomId).emit('roomState', getSafeRoomState(roomId));
      }
    }
  });
});

function startRounds(roomId) {
  const room = rooms[roomId];
  room.state = 'PLAYING';
  room.photosPool = [];

  Object.values(room.players).forEach(p => {
    p.photos.forEach(url => {
      room.photosPool.push({ url, owner: p.id, played: false });
    });
  });

  console.log(`[POOL] Total de fotos subidas: ${room.photosPool.length}`);
  room.photosPool.sort(() => Math.random() - 0.5);

  const maxRounds = room.maxRounds || (Object.keys(room.players).length * 3);
  if (room.photosPool.length > maxRounds) {
    room.photosPool = room.photosPool.slice(0, maxRounds);
    console.log(`[POOL] Fotos limitadas a ${maxRounds} para agilizar la partida.`);
  }

  startNextRound(roomId);
}

function startNextRound(roomId) {
  const room = rooms[roomId];
  const unplayed = room.photosPool.filter(p => !p.played);

  if (unplayed.length === 0) {
    console.log(`[GAME] Fin de fotos en ${roomId}. Yendo a Leaderboard.`);
    room.state = 'LEADERBOARD';
    io.to(roomId).emit('roomState', getSafeRoomState(roomId));
    
    // Autodestrucción de las imágenes tras la partida para preservar la privacidad y disco
    setTimeout(() => {
      try {
        const files = fs.readdirSync(uploadsDir);
        let deleted = 0;
        for (const file of files) {
          if (file.startsWith(`${roomId}-`)) {
             fs.unlinkSync(path.join(uploadsDir, file));
             deleted++;
          }
        }
        console.log(`[CLEANUP] Eliminadas ${deleted} fotos de la partida completada de ${roomId}.`);
      } catch (error) {
        console.error(`[CLEANUP][ERROR] Fallo al destruir fotos de ${roomId}:`, error);
      }
    }, 2000); // 2 segundos de buffer por si alguien está renderizando el último segundo de pantalla
    
    return;
  }

  const nextPhoto = unplayed[0];
  nextPhoto.played = true;

  const timeoutId = setTimeout(() => endRound(roomId), 15000);

  room.currentRound = {
    photoUrl: nextPhoto.url,
    owner: nextPhoto.owner,
    votes: {},
    startTime: Date.now(),
    endTime: Date.now() + 15000,
    timeoutId: timeoutId
  };

  const ownerName = room.players[nextPhoto.owner]?.name || 'Jugador Desconectado';
  console.log(`[ROUND] Nueva ronda. Foto de: ${ownerName}. URL: ${nextPhoto.url}`);
  io.to(roomId).emit('roomState', getSafeRoomState(roomId));
}

function endRound(roomId) {
  const room = rooms[roomId];
  if (!room || room.state !== 'PLAYING') return;

  if (room.currentRound.timeoutId) {
    clearTimeout(room.currentRound.timeoutId);
    room.currentRound.timeoutId = null;
  }

  const correctOwner = room.currentRound.owner;
  const results = {};

  Object.entries(room.currentRound.votes).forEach(([voterId, voteData]) => {
    const isCorrect = voteData.guessedId === correctOwner;
    results[voterId] = isCorrect;
    
    if (isCorrect && room.players[voterId]) {
      const timeTaken = voteData.timestamp - room.currentRound.startTime;
      const speedBonus = Math.floor(Math.max(0, 15000 - timeTaken) / 15000 * 100);
      const totalPoints = 100 + speedBonus;
      
      room.players[voterId].score += totalPoints;
      console.log(`[SCORE] ${room.players[voterId].name} ganó ${totalPoints} pts (100 base + ${speedBonus} vel)`);
    }
  });

  const ownerName = room.players[correctOwner]?.name || 'Jugador Desconectado';
  console.log(`[RESULT] Ronda terminada. Dueño era: ${ownerName}`);
  io.to(roomId).emit('roundResult', {
    owner: correctOwner,
    results: results,
    scores: Object.fromEntries(Object.values(room.players).map(p => [p.id, p.score]))
  });

  setTimeout(() => startNextRound(roomId), 5000);
}

function getSafeRoomState(roomId) {
  const room = rooms[roomId];
  if (!room) return null;
  return {
    id: room.id,
    state: room.state,
    creator: room.creator,
    maxRounds: room.maxRounds,
    gameMode: room.gameMode,
    players: Object.values(room.players).map(p => ({
      id: p.id,
      name: p.name, // Aseguramos que el nombre se envíe
      score: p.score,
      ready: p.ready
    })),
    currentRound: room.currentRound ? {
      photoUrl: room.currentRound.photoUrl,
      endTime: room.currentRound.endTime,
      current: room.photosPool.filter(p => p.played).length,
      total: room.photosPool.length
    } : null
  };
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`\n🚀 Servidor listo en puerto ${PORT}`));