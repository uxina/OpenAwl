/**
 * Team Handlers - 组队和投票相关事件处理
 * Events: build-team, vote-team
 */

const { ClientToServer, ServerToClient, GamePhases } = require('../config/socket-events');
const gameStore = require('../models/GameStore');
const { getRequiredTeamSize } = require('../utils/helpers');

/**
 * Handle build-team event
 */
function handleBuildTeam(socket, io, data, callback) {
  const { roomId, teamMembers } = data;

  const game = gameStore.getRoom(roomId);
  if (!game) {
    if (typeof callback === 'function') callback({ success: false, message: 'Room not found' });
    return;
  }

  const playerId = socket.playerId;
  const player = game.players.find(p => p.id === playerId);

  if (!player || !player.isLeader) {
    if (typeof callback === 'function') callback({ success: false, message: '只有队长可以组建队伍' });
    return;
  }

  try {
    game.selectTeam(playerId, teamMembers);

    const gameState = game.getGameState();

    io.to(roomId).emit(ServerToClient.TEAM_PROPOSED, gameState);
    io.to(roomId).emit(ServerToClient.PHASE_CHANGED, gameState);

    if (typeof callback === 'function') {
      callback({ success: true, gameState });
    }
  } catch (error) {
    if (typeof callback === 'function') callback({ success: false, message: error.message });
  }
}

/**
 * Handle vote-team event
 */
function handleVoteTeam(socket, io, data, callback) {
  const { roomId, vote } = data;

  const game = gameStore.getRoom(roomId);
  if (!game) {
    if (typeof callback === 'function') callback({ success: false, message: 'Room not found' });
    return;
  }

  const playerId = socket.playerId;

  try {
    const result = game.vote(playerId, vote);

    if (result.completed) {
      io.to(roomId).emit(ServerToClient.VOTE_COMPLETED, result);

      const gameState = game.getGameState();
      io.to(roomId).emit(ServerToClient.PHASE_CHANGED, gameState);
    } else {
      io.to(roomId).emit(ServerToClient.VOTE_UPDATE, result);
    }

    if (typeof callback === 'function') callback({ success: true, result });
  } catch (error) {
    if (typeof callback === 'function') callback({ success: false, message: error.message });
  }
}

module.exports = {
  handleBuildTeam,
  handleVoteTeam
};
