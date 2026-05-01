/**
 * System Handlers - 系统相关事件处理
 * Events: reset-game, request-game-state, disconnect
 */

const { ServerToClient } = require('../config/socket-events');
const gameStore = require('../models/GameStore');

/**
 * Handle reset-game event
 */
function handleResetGame(socket, io, data, callback) {
  const { roomId } = data;

  const game = gameStore.getRoom(roomId);
  if (!game) {
    if (typeof callback === 'function') callback({ success: false, message: 'Room not found' });
    return;
  }

  game.reset();

  io.to(roomId).emit(ServerToClient.GAME_RESET, {
    roomId,
    message: 'Game has been reset'
  });

  console.log('[Socket] Game reset: ' + roomId);

  if (typeof callback === 'function') {
    callback({ success: true });
  }
}

/**
 * Handle request-game-state event
 */
function handleRequestGameState(socket, io, data, callback) {
  const { roomId } = data;

  const game = gameStore.getRoom(roomId);
  if (!game) {
    if (typeof callback === 'function') callback({ success: false, message: 'Room not found' });
    return;
  }

  const playerId = socket.playerId;
  const player = game.players.find(p => p.id === playerId);

  const roomOfflinePlayers = gameStore.getRoomOfflinePlayers(roomId) || new Set();

  const gameState = {
    roomId,
    configuredPlayerCount: game.configuredPlayerCount,
    gamePhase: game.gamePhase,
    currentRound: game.currentRound,
    currentLeader: game.currentLeader,
    players: game.players.map(p => ({
      ...p,
      isOffline: roomOfflinePlayers.has(p.id)
    })),
    missionResults: game.missionResults,
    currentTeam: game.currentTeam || [],
    teamVotes: game.teamVotes || {}
  };

  if (typeof callback === 'function') {
    callback({
      success: true,
      gameState,
      playerId: playerId,
      player: player ? { ...player } : null
    });
  }
}

/**
 * Handle disconnect event
 */
function handleDisconnect(socket, io) {
  console.log('[Socket] Disconnected: ' + socket.id);

  const playerId = socket.playerId;
  const roomId = socket.roomId;

  if (playerId && roomId) {
    const game = gameStore.getRoom(roomId);
    if (game) {
      const player = game.players.find(p => p.id === playerId);
      if (player) {
        gameStore.addOfflinePlayer(roomId, playerId);

        io.to(roomId).emit(ServerToClient.PLAYER_DISCONNECTED, {
          playerId,
          playerName: player.name
        });

        console.log('[Socket] Player ' + player.name + ' disconnected from room ' + roomId);
      }
    }
  }

  gameStore.deleteController(socket.id);
}

module.exports = {
  handleResetGame,
  handleRequestGameState,
  handleDisconnect
};
