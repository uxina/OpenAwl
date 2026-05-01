/**
 * Room Handlers - 房间相关事件处理
 * Events: create-room, get-room-status
 */

const { ClientToServer, ServerToClient } = require('../config/socket-events');
const { generateRoomId } = require('../utils/helpers');
const AvalonGame = require('../game-logic');
const gameStore = require('../models/GameStore');

/**
 * Handle create-room event
 */
function handleCreateRoom(socket, io, data, callback) {
  const { playerName, configuredPlayerCount, playerCount } = data;
  const count = configuredPlayerCount || playerCount || 5;

  const roomId = generateRoomId((id) => gameStore.games.has(id));
  const game = new AvalonGame(roomId);
  game.configuredPlayerCount = count;
  gameStore.createRoom(roomId, game);

  // Make the creator join the room so they receive broadcasts
  socket.join(roomId);
  socket.roomId = roomId;

  // Track controller socket for direct emission
  gameStore.setController(socket.id, { roomId, playerName });
  console.log('[Socket] Controller socket tracked:', socket.id, 'for room', roomId);

  console.log('[Socket] Room created: ' + roomId + ', players: ' + count);

  socket.emit(ServerToClient.ROOM_CREATED, {
    success: true,
    roomId,
    configuredPlayerCount: count
  });

  if (typeof callback === 'function') {
    callback({ success: true, roomId });
  }
}

/**
 * Handle get-room-status event
 */
function handleGetRoomStatus(socket, data, callback) {
  const { roomId } = data;
  const game = gameStore.getRoom(roomId);

  if (!game) {
    console.log('[Socket] Room not found: ' + roomId);
    if (typeof callback === 'function') {
      callback({ success: false, message: 'Room not found' });
    }
    return;
  }

  const roomOfflinePlayers = gameStore.getRoomOfflinePlayers(roomId) || new Set();
  const players = game.players.map(p => ({
    ...p,
    isOffline: roomOfflinePlayers.has(p.id)
  }));

  // 获取已占用的玩家编号（在线玩家）
  const takenNumbers = game.players
    .filter(p => !roomOfflinePlayers.has(p.id) && p.playerNumber)
    .map(p => p.playerNumber);

  const response = {
    success: true,
    roomId,
    configuredCount: game.configuredPlayerCount,
    configuredPlayerCount: game.configuredPlayerCount,
    currentPlayers: players.length,
    players,
    gamePhase: game.gamePhase,
    takenNumbers
  };

  console.log('[Socket] Room status response for ' + roomId + ': configuredCount=' + game.configuredPlayerCount);

  if (typeof callback === 'function') {
    callback(response);
  }
}

/**
 * Handle join-controller event
 */
function handleControllerJoin(socket, io, data, callback) {
  const { roomId } = data;
  const game = gameStore.getRoom(roomId);

  if (!game) {
    console.log('[Socket] Controller join: Room not found:', roomId);
    if (typeof callback === 'function') {
      callback({ success: false, message: 'Room not found' });
    }
    return;
  }

  // Join the room
  socket.join(roomId);
  socket.roomId = roomId;

  // Track controller socket
  gameStore.setController(socket.id, { roomId, playerName: 'Host' });
  console.log('[Socket] Controller joined room:', roomId, 'socket:', socket.id);

  const roomOfflinePlayers = gameStore.getRoomOfflinePlayers(roomId) || new Set();
  const players = game.players.map(p => ({
    ...p,
    isOffline: roomOfflinePlayers.has(p.id)
  }));

  // Send current room state to controller
  socket.emit(ServerToClient.ROOM_CREATED, {
    success: true,
    roomId,
    playerCount: players.length,
    configuredCount: game.configuredPlayerCount,
    players,
    gamePhase: game.gamePhase,
    currentRound: game.currentRound,
    leader: game.currentLeader,
    missionResults: game.missionResults || []
  });

  if (typeof callback === 'function') {
    callback({ success: true, roomId });
  }
}

/**
 * Handle start-game event
 */
function handleStartGame(socket, io, data, callback) {
  const { roomId } = data;
  const game = gameStore.getRoom(roomId);

  if (!game) {
    console.log('[Socket] Start game: Room not found:', roomId);
    if (typeof callback === 'function') {
      callback({ success: false, message: 'Room not found' });
    }
    return;
  }

  if (game.players.length < 5) {
    console.log('[Socket] Start game: Not enough players:', game.players.length);
    socket.emit(ServerToClient.ERROR, { message: '至少需要5名玩家才能开始游戏' });
    if (typeof callback === 'function') {
      callback({ success: false, message: 'Not enough players' });
    }
    return;
  }

  try {
    game.startGame();
    console.log('[Socket] Game started in room:', roomId);

    // Broadcast to all in room
    io.to(roomId).emit(ServerToClient.GAME_STARTED, {
      success: true,
      roomId,
      players: game.players,
      gamePhase: game.gamePhase,
      currentRound: game.currentRound
    });

    if (typeof callback === 'function') {
      callback({ success: true });
    }
  } catch (error) {
    console.error('[Socket] Error starting game:', error);
    socket.emit(ServerToClient.ERROR, { message: error.message });
    if (typeof callback === 'function') {
      callback({ success: false, message: error.message });
    }
  }
}

/**
 * Handle controller-reconnect event
 */
function handleControllerReconnect(socket, io, data, callback) {
  try {
    const { roomId } = data;
    console.log(`[Socket] Controller reconnect: roomId=${roomId}`);

    const game = gameStore.getRoom(roomId);
    if (!game) {
      console.log(`[Socket] Room not found: ${roomId}`);
      return callback?.({ success: false, message: 'Room not found' });
    }

    socket.join(roomId);
    socket.roomId = roomId;

    // Update controller tracking with new socket ID
    gameStore.setController(socket.id, { roomId });
    console.log(`[Socket] Controller socket tracked: ${socket.id}`);

    console.log(`[Socket] Controller reconnected to room: ${roomId}`);

    // 立即发送当前玩家状态给语音面板
    const roomOfflinePlayers = gameStore.getRoomOfflinePlayers(roomId) || new Set();
    const onlinePlayers = game.players.filter(p => !roomOfflinePlayers.has(p.id));
    socket.emit('controller-player-joined', {
      playerName: '房间状态',
      playerCount: onlinePlayers.length,
      configuredCount: game.configuredPlayerCount,
      isFullState: true
    });
    console.log(`[Socket] 发送当前玩家状态: ${onlinePlayers.length}/${game.configuredPlayerCount}`);

    callback?.({
      success: true,
      gameState: game.getGameState()
    });
  } catch (error) {
    console.error('[Socket] Controller reconnect error:', error);
    callback?.({ success: false, message: error.message });
  }
}

module.exports = {
  handleCreateRoom,
  handleGetRoomStatus,
  handleControllerJoin,
  handleStartGame,
  handleControllerReconnect
};
