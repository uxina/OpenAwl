/**
 * Player Handlers - 玩家相关事件处理
 * Events: player-join, player-rejoin, player-reconnect, confirm-role, player-id-select, player-id-deselect
 */

const { ClientToServer, ServerToClient, GamePhases } = require('../config/socket-events');
const { generatePlayerId, getRequiredTeamSize } = require('../utils/helpers');
const AvalonGame = require('../game-logic');
const gameStore = require('../models/GameStore');

/**
 * Handle player-id-select event - 玩家选择编号后立即广播（预选择）
 */
function handlePlayerIdSelect(socket, io, data, callback) {
  const { roomId, playerNumber } = data;

  const game = gameStore.getRoom(roomId);
  if (!game) {
    socket.emit(ServerToClient.ERROR, { message: 'Room not found' });
    if (typeof callback === 'function') callback({ success: false, message: 'Room not found' });
    return;
  }

  // 初始化预选择编号集合（如果还没有）
  if (!game.preSelectedNumbers) {
    game.preSelectedNumbers = {}; // socketId -> playerNumber
  }

  // 检查该编号是否已被正式占用
  const roomOfflinePlayers = gameStore.getRoomOfflinePlayers(roomId) || new Set();
  const existingPlayer = game.players.find(p => p.playerNumber === playerNumber && !roomOfflinePlayers.has(p.id));
  if (existingPlayer) {
    socket.emit(ServerToClient.ERROR, { message: '该编号已被其他玩家选择' });
    if (typeof callback === 'function') callback({ success: false, message: '该编号已被其他玩家选择' });
    return;
  }

  // 检查该编号是否已被其他socket预选择
  const preSelectedByOther = Object.entries(game.preSelectedNumbers).find(([sid, num]) => 
    sid !== socket.id && num === playerNumber
  );
  if (preSelectedByOther) {
    socket.emit(ServerToClient.ERROR, { message: '该编号已被其他玩家暂选' });
    if (typeof callback === 'function') callback({ success: false, message: '该编号已被其他玩家暂选' });
    return;
  }

  // 记录预选择
  game.preSelectedNumbers[socket.id] = playerNumber;

  // 广播更新后的已选编号列表（包含正式加入的和预选择的）
  const formalTakenNumbers = game.players
    .filter(p => !roomOfflinePlayers.has(p.id) && p.playerNumber)
    .map(p => p.playerNumber);
  const preTakenNumbers = Object.values(game.preSelectedNumbers);
  const allTakenNumbers = [...new Set([...formalTakenNumbers, ...preTakenNumbers])];

  io.to(roomId).emit('player-numbers-updated', { 
    takenNumbers: allTakenNumbers,
    preSelectedNumbers: game.preSelectedNumbers
  });

  console.log(`[Socket] Player pre-selected number ${playerNumber} in room ${roomId}`);

  if (typeof callback === 'function') {
    callback({ success: true, playerNumber });
  }
}

/**
 * Handle player-id-deselect event - 玩家取消/切换编号时释放预选择
 */
function handlePlayerIdDeselect(socket, io, data, callback) {
  const { roomId } = data;

  const game = gameStore.getRoom(roomId);
  if (!game) {
    if (typeof callback === 'function') callback({ success: false, message: 'Room not found' });
    return;
  }

  if (!game.preSelectedNumbers) {
    if (typeof callback === 'function') callback({ success: true });
    return;
  }

  // 删除该socket的预选择
  delete game.preSelectedNumbers[socket.id];

  // 广播更新后的已选编号列表
  const roomOfflinePlayers = gameStore.getRoomOfflinePlayers(roomId) || new Set();
  const formalTakenNumbers = game.players
    .filter(p => !roomOfflinePlayers.has(p.id) && p.playerNumber)
    .map(p => p.playerNumber);
  const preTakenNumbers = Object.values(game.preSelectedNumbers);
  const allTakenNumbers = [...new Set([...formalTakenNumbers, ...preTakenNumbers])];

  io.to(roomId).emit('player-numbers-updated', { 
    takenNumbers: allTakenNumbers,
    preSelectedNumbers: game.preSelectedNumbers
  });

  if (typeof callback === 'function') {
    callback({ success: true });
  }
}

/**
 * Handle player-join event
 */
function handlePlayerJoin(socket, io, data, callback) {
  const { roomId, playerName, playerNumber } = data;

  const game = gameStore.getRoom(roomId);
  if (!game) {
    socket.emit(ServerToClient.ERROR, { message: 'Room not found' });
    if (typeof callback === 'function') callback({ success: false, message: 'Room not found' });
    return;
  }

  const roomOfflinePlayers = gameStore.getRoomOfflinePlayers(roomId) || new Set();
  const onlinePlayers = game.players.filter(p => !roomOfflinePlayers.has(p.id));
  const isRoomFull = onlinePlayers.length >= game.configuredPlayerCount;

  if (isRoomFull) {
    socket.emit(ServerToClient.ERROR, { message: 'Room is full' });
    if (typeof callback === 'function') callback({ success: false, message: 'Room is full' });
    return;
  }

  // 检查相同编号是否已被占用
  if (playerNumber) {
    const existingPlayer = game.players.find(p => p.playerNumber === playerNumber && !roomOfflinePlayers.has(p.id));
    if (existingPlayer) {
      socket.emit(ServerToClient.ERROR, { message: '该编号已被其他玩家选择' });
      if (typeof callback === 'function') callback({ success: false, message: '该编号已被其他玩家选择' });
      return;
    }
  }

  const playerId = generatePlayerId();
  const isLeader = game.players.length === 0;
  const player = {
    id: playerId,
    name: playerName,
    playerNumber,
    role: null,
    side: null,
    isLeader,
    hasVoted: false,
    vote: null,
    roleConfirmed: false
  };

  game.players.push(player);
  gameStore.setPlayerSocket(playerId, socket.id);
  socket.playerId = playerId;
  socket.roomId = roomId;
  socket.join(roomId);

  const updatedPlayers = game.players.map(p => ({
    ...p,
    isOffline: roomOfflinePlayers.has(p.id)
  }));

  io.to(roomId).emit(ServerToClient.PLAYER_JOINED, {
    playerId,
    playerName,
    playerNumber,
    players: updatedPlayers,
    configuredCount: game.configuredPlayerCount
  });

  // 发送玩家编号更新事件
  const takenNumbers = game.players
    .filter(p => !roomOfflinePlayers.has(p.id) && p.playerNumber)
    .map(p => p.playerNumber);
  io.to(roomId).emit('player-numbers-updated', { takenNumbers });

  io.to(roomId).emit('controller-player-joined', {
    playerName,
    playerCount: updatedPlayers.length,
    configuredCount: game.configuredPlayerCount
  });

  console.log('[Socket] Player ' + playerName + ' joined room ' + roomId);

  if (typeof callback === 'function') {
    callback({
      success: true,
      playerId,
      isLeader,
      gamePhase: game.gamePhase,
      players: updatedPlayers
    });
  }
}

/**
 * Handle player-rejoin event
 */
function handlePlayerRejoin(socket, io, data, callback) {
  const { roomId, playerId } = data;

  const game = gameStore.getRoom(roomId);
  if (!game) {
    if (typeof callback === 'function') callback({ success: false, message: 'Room not found' });
    return;
  }

  const player = game.players.find(p => p.id === playerId);
  if (!player) {
    if (typeof callback === 'function') callback({ success: false, message: 'Player not found' });
    return;
  }

  gameStore.setPlayerSocket(playerId, socket.id);
  socket.playerId = playerId;
  socket.roomId = roomId;
  socket.join(roomId);

  gameStore.removeOfflinePlayer(roomId, playerId);

  io.to(roomId).emit(ServerToClient.PLAYER_JOINED, {
    playerId,
    playerName: player.name,
    players: game.players,
    configuredCount: game.configuredPlayerCount
  });

  console.log('[Socket] Player ' + player.name + ' reconnected to room ' + roomId);

  if (typeof callback === 'function') {
    callback({
      success: true,
      playerId,
      isLeader: player.isLeader,
      gamePhase: game.gamePhase,
      players: game.players
    });
  }
}

/**
 * Handle player-reconnect event
 */
function handlePlayerReconnect(socket, io, data, callback) {
  const { roomId, playerId: dataPlayerId } = data;

  const game = gameStore.getRoom(roomId);
  if (!game) {
    if (typeof callback === 'function') callback({ success: false, message: 'Room not found' });
    return;
  }

  // 优先使用 socket.playerId，如果没有则使用客户端发送的 playerId
  const playerId = socket.playerId || dataPlayerId;
  if (!playerId) {
    if (typeof callback === 'function') callback({ success: false, message: 'Not authenticated' });
    return;
  }
  
  // 设置 socket.playerId，确保后续事件能正确处理
  if (!socket.playerId) {
    socket.playerId = playerId;
  }

  const player = game.players.find(p => p.id === playerId);
  if (!player) {
    if (typeof callback === 'function') callback({ success: false, message: 'Player not found' });
    return;
  }

  gameStore.setPlayerSocket(playerId, socket.id);
  socket.join(roomId);

  gameStore.removeOfflinePlayer(roomId, playerId);

  io.to(roomId).emit(ServerToClient.PLAYER_STATUS_CHANGED, {
    playerId,
    isOnline: true
  });

  console.log('[Socket] Player reconnected: ' + player.name + ' in room ' + roomId);

  if (typeof callback === 'function') {
    callback({
      success: true,
      gameState: game.getGameState()
    });
  }
}

/**
 * Handle confirm-role event
 */
function handleConfirmRole(socket, io, data, callback) {
  const { roomId } = data;

  const game = gameStore.getRoom(roomId);
  if (!game) {
    if (typeof callback === 'function') callback({ success: false, message: 'Room not found' });
    return;
  }

  const playerId = socket.playerId;
  const player = game.players.find(p => p.id === playerId);

  if (!player) {
    if (typeof callback === 'function') callback({ success: false, message: 'Player not found' });
    return;
  }

  player.roleConfirmed = true;
  console.log('[Socket] Player ' + player.name + ' confirmed role');

  const allConfirmed = game.players.every(p => p.roleConfirmed);
  if (allConfirmed) {
    game.gamePhase = 'team-building';
    game.currentLeaderIndex = 0;
    game.currentLeader = game.players[0].id;

    io.to(roomId).emit(ServerToClient.PHASE_CHANGED, {
      phase: 'team-building',
      currentLeader: game.currentLeader,
      currentLeaderName: game.players[0]?.name || null,
      currentRound: game.currentRound
    });

    console.log('[Socket] All roles confirmed, game starting: ' + roomId);
  }

  if (typeof callback === 'function') {
    callback({
      success: true,
      allConfirmed,
      gamePhase: game.gamePhase
    });
  }
}

module.exports = {
  handlePlayerJoin,
  handlePlayerRejoin,
  handlePlayerReconnect,
  handleConfirmRole,
  handlePlayerIdSelect,
  handlePlayerIdDeselect
};
