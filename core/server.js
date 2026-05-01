/**
 * Avalon Game Server - Refactored Version
 * Modular architecture with separated handlers
 * 
 * Backup location: server.js.backup
 * Handler modules: handlers/
 */

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json());
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: '*' },
  pingTimeout: 60000,
  pingInterval: 25000
});

const gameStore = require('./models/GameStore');
const { createServices } = require('./services');
const { ClientToServer } = require('./config/socket-events');
const handlers = require('./handlers');

const services = createServices(io);
const { roomService, playerService, gameService } = services;

const ROOM_MAX_AGE = 2 * 60 * 60 * 1000;
const CLEANUP_INTERVAL = 30 * 60 * 1000;

// 保存设备状态（蓝牙连接状态）
let deviceStatus = {
  bluetoothConnected: false,
  bluetoothSpeakerName: null,
  bluetoothSpeakerMac: null
};

// 自定义路由必须在静态中间件之前
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'voice-panel-v2.html'));
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: '2.0.0'
  });
});

// API endpoint for voice panel state polling
app.get('/api/room/:roomId/status', (req, res) => {
  try {
    const game = gameStore.getRoom(req.params.roomId);
    if (!game) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }
    res.json({
      success: true,
      gamePhase: game.gamePhase,
      currentRound: game.currentRound,
      currentLeaderIndex: game.currentLeaderIndex
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 静态文件中间件 - 放在自定义路由之后
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/rooms', (req, res) => {
  try {
    const { generateRoomId } = require('./utils/helpers');
    const roomId = generateRoomId((id) => gameStore.games.has(id));
    const playerCount = req.body.playerCount || 5;

    const AvalonGame = require('./game-logic');
    const game = new AvalonGame(roomId);
    game.configuredPlayerCount = playerCount;
    gameStore.createRoom(roomId, game);

    console.log('[API] Room created: ' + roomId + ', players: ' + playerCount);
    res.json({ success: true, data: { roomId, playerCount } });
  } catch (error) {
    console.error('[API] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/rooms', (req, res) => {
  const roomList = Array.from(gameStore.games.entries()).map(([roomId, game]) => ({
    roomId,
    playerCount: game.configuredPlayerCount,
    currentPlayers: game.players.length,
    gamePhase: game.gamePhase
  }));
  res.json({ success: true, data: roomList });
});

app.get('/api/rooms/:roomId', (req, res) => {
  const game = gameStore.getRoom(req.params.roomId);
  if (!game) {
    return res.status(404).json({ success: false, message: 'Room not found' });
  }
  res.json({
    success: true,
    data: {
      roomId: req.params.roomId,
      playerCount: game.configuredPlayerCount,
      currentPlayers: game.players.length,
      gamePhase: game.gamePhase,
      isActive: game.gamePhase !== 'ended'
    }
  });
});

io.on('connection', (socket) => {
  console.log('[Socket] Client connected: ' + socket.id);

  socket.on(ClientToServer.ROOM_CREATE, (data, callback) => {
    handlers.handleCreateRoom(socket, io, data, callback);
  });

  socket.on(ClientToServer.ROOM_STATUS, (data, callback) => {
    handlers.handleGetRoomStatus(socket, data, callback);
  });

  socket.on(ClientToServer.CONTROLLER_RECONNECT, (data, callback) => {
    handlers.handleControllerReconnect(socket, io, data, callback);
  });

  socket.on(ClientToServer.CONTROLLER_JOIN, (data, callback) => {
    handlers.handleControllerJoin(socket, io, data, callback);
  });

  socket.on(ClientToServer.START_GAME, (data, callback) => {
    handlers.handleStartGame(socket, io, data, callback);
  });

  socket.on(ClientToServer.PLAYER_JOIN, (data, callback) => {
    handlers.handlePlayerJoin(socket, io, data, callback);
  });

  socket.on(ClientToServer.PLAYER_REJOIN, (data, callback) => {
    handlers.handlePlayerRejoin(socket, io, data, callback);
  });

  socket.on(ClientToServer.PLAYER_RECONNECT, (data, callback) => {
    handlers.handlePlayerReconnect(socket, io, data, callback);
  });

  // 编号预选择相关事件
  socket.on(ClientToServer.PLAYER_ID_SELECT, (data, callback) => {
    handlers.handlePlayerIdSelect(socket, io, data, callback);
  });

  socket.on(ClientToServer.PLAYER_ID_DESELECT, (data, callback) => {
    handlers.handlePlayerIdDeselect(socket, io, data, callback);
  });

  socket.on(ClientToServer.CONFIRM_ROLE, (data, callback) => {
    handlers.handleConfirmRole(socket, io, data, callback);
  });

  socket.on(ClientToServer.BUILD_TEAM, (data, callback) => {
    handlers.handleBuildTeam(socket, io, data, callback);
  });

  socket.on(ClientToServer.VOTE_TEAM, (data, callback) => {
    handlers.handleVoteTeam(socket, io, data, callback);
  });

  socket.on(ClientToServer.NEXT_PHASE, (data, callback) => {
    handlers.handleNextPhase(socket, io, data, callback);
  });

  socket.on(ClientToServer.PREVIOUS_PHASE, (data, callback) => {
    handlers.handlePreviousPhase(socket, io, data, callback);
  });

  socket.on(ClientToServer.MISSION_COMPLETED_AUTO_ADVANCE, (data, callback) => {
    handlers.handleMissionCompletedAutoAdvance(socket, io, data, callback);
  });

  socket.on(ClientToServer.EXECUTE_MISSION, (data, callback) => {
    handlers.handleExecuteMission(socket, io, data, callback);
  });

  socket.on(ClientToServer.ASSASSINATE, (data, callback) => {
    handlers.handleAssassinate(socket, io, data, callback);
  });

  socket.on(ClientToServer.RESET_GAME, (data, callback) => {
    handlers.handleResetGame(socket, io, data, callback);
  });

  socket.on(ClientToServer.REQUEST_GAME_STATE, (data, callback) => {
    handlers.handleRequestGameState(socket, io, data, callback);
  });

  // 大厅相关事件
  socket.on('get-rooms-list', (callback) => {
    try {
      const roomList = Array.from(gameStore.games.entries()).map(([roomId, game]) => ({
        roomId,
        playerCount: game.players.length,
        configuredPlayerCount: game.configuredPlayerCount,
        gamePhase: game.gamePhase,
        currentRound: game.currentRound || 0,
        leader: game.players[game.currentLeaderIndex]?.name || null
      }));

      if (typeof callback === 'function') {
        callback({ success: true, rooms: roomList });
      }

      // 同时也广播给所有监听者
      io.emit('rooms-list', { success: true, rooms: roomList });
    } catch (error) {
      console.error('[Socket] Error getting rooms list:', error);
      if (typeof callback === 'function') {
        callback({ success: false, message: error.message });
      }
    }
  });

  socket.on('delete-room', (data) => {
    try {
      const { roomId } = data;
      if (gameStore.games.has(roomId)) {
        gameStore.deleteRoom(roomId);
        console.log('[Socket] Room deleted:', roomId);
        
        // 广播房间列表更新
        io.emit('rooms-list-updated');
      }
    } catch (error) {
      console.error('[Socket] Error deleting room:', error);
    }
  });

  socket.on('disconnect', () => {
    handlers.handleDisconnect(socket, io);
  });

  // 转发音频播放指令到设备端
  socket.on('play-audio-command', (data) => {
    console.log('[Socket] 转发音频指令到设备端:', data.commandId);
    io.emit('device-play-audio', { commandId: data.commandId });
  });

  // 接收设备状态（蓝牙连接状态）并保存，然后广播给所有客户端
  socket.on('device-status', (data) => {
    console.log('[Socket] 收到设备状态:', data);
    // 保存设备状态
    deviceStatus = data;
    // 广播设备状态给所有客户端
    io.emit('device-status-update', data);
  });

  // 新客户端连接时，发送当前设备状态
  socket.on('request-device-status', (callback) => {
    console.log('[Socket] 收到设备状态查询请求');
    if (callback) callback(deviceStatus);
    socket.emit('device-status-update', deviceStatus);
  });

  // 转发蓝牙连接指令到设备端
  socket.on('bluetooth-connect', (data, callback) => {
    console.log('[Socket] 转发蓝牙连接指令到设备端');

    // 监听设备端的响应
    const responseHandler = (response) => {
      console.log('[Socket] 收到设备端蓝牙连接响应:', response);
      if (callback) callback(response);
    };

    // 使用 socket.once 只监听一次响应（只监听当前客户端的响应）
    socket.once('bluetooth-connect-response', responseHandler);

    // 广播到设备端
    io.emit('device-bluetooth-connect', {});

    // 超时处理
    setTimeout(() => {
      socket.off('bluetooth-connect-response', responseHandler);
      if (callback) callback({ success: false, message: '连接超时，请检查设备端状态' });
    }, 30000);
  });
});

setInterval(() => {
  const now = Date.now();
  for (const [roomId, game] of gameStore.games.entries()) {
    const createdAt = gameStore.roomCreationTime.get(roomId);
    if (createdAt && (now - createdAt) > ROOM_MAX_AGE) {
      gameStore.deleteRoom(roomId);
      console.log('[Cleanup] Removed expired room: ' + roomId);
    }
  }
}, CLEANUP_INTERVAL);

server.listen(PORT, () => {
  console.log('v2.0                   : ' + PORT);
});