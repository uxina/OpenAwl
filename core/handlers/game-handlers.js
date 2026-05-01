/**
 * Game Handlers - 游戏进行相关事件处理
 * Events: previous-phase, next-phase, mission-completed-auto-advance
 */

const { ClientToServer, ServerToClient, GamePhases } = require('../config/socket-events');
const { getRequiredTeamSize } = require('../utils/helpers');
const gameStore = require('../models/GameStore');

/**
 * Assign roles and start the game
 */
function assignRolesAndStart(game, roomId, io) {
  // Use game's existing startGame method
  const gameState = game.startGame();

  // Notify each player of their role
  game.players.forEach(player => {
    const playerSocket = gameStore.getPlayerSocket(player.id);
    if (playerSocket) {
      io.to(playerSocket).emit('role-assigned', {
        playerId: player.id,
        playerName: player.name,
        role: player.role,
        side: player.side,
        isLeader: player.isLeader,
        gamePhase: gameState.gamePhase
      });
    }
  });

  // Notify voice panel
  io.to(roomId).emit('controller-roles-assigned', {
    gamePhase: gameState.gamePhase,
    players: game.players.map(p => ({
      playerId: p.id,
      playerName: p.name,
      role: p.role,
      side: p.side
    }))
  });

  io.to(roomId).emit(ServerToClient.PHASE_CHANGED, {
    phase: gameState.gamePhase,
    previousPhase: 'waiting'
  });

  console.log('[Socket] Roles assigned, game started: ' + roomId);
  return gameState;
}

/**
 * Handle next-phase event from VOICE PANEL
 * Voice panel can only advance NON-interactive phases
 * Player-interaction phases (team-building, voting, mission, assassination) are locked
 */
function handleNextPhase(socket, io, data, callback) {
  const { roomId } = data;

  const game = gameStore.getRoom(roomId);
  if (!game) {
    if (typeof callback === 'function') callback({ success: false, message: 'Room not found' });
    return;
  }

  console.log('[Socket] Next phase requested for room: ' + roomId);

  const currentPhase = game.gamePhase;

  // Player-interaction phases: voice panel CANNOT advance
  // These phases require actual player actions to progress
  const interactivePhases = ['team-building', 'voting', 'mission', 'assassination'];

  if (interactivePhases.includes(currentPhase)) {
    console.log(`[Socket] Voice panel blocked: ${currentPhase} requires player interaction`);
    if (typeof callback === 'function') {
      callback({ success: false, message: `等待玩家操作，当前阶段: ${currentPhase}` });
    }
    return;
  }

  switch (currentPhase) {
    case 'waiting':
      // Start the game - assign roles
      assignRolesAndStart(game, roomId, io);
      if (typeof callback === 'function') {
        callback({ success: true, phase: game.gamePhase });
      }
      return;
    default:
      // Use game's built-in nextPhase method
      try {
        const gameState = game.nextPhase();
        const payload = {
          phase: gameState.gamePhase,
          previousPhase: currentPhase,
          currentRound: game.currentRound,
          currentLeaderIndex: game.currentLeaderIndex,
          playerCount: game.configuredPlayerCount || game.players.length
        };
        if (gameState.gamePhase === 'team-building' || gameState.gamePhase === 'voting') {
          payload.players = game.players.map((p) => ({
            playerId: p.id,
            playerName: p.name,
            role: p.role,
            side: p.side
          }));
          // Add current leader's actual player name for voice panel
          const leader = game.getCurrentLeader();
          if (leader) {
            payload.currentLeaderName = leader.name;
          }
        }
        io.to(roomId).emit(ServerToClient.PHASE_CHANGED, payload);
        if (typeof callback === 'function') {
          callback({ success: true, phase: gameState.gamePhase });
        }
      } catch (error) {
        if (typeof callback === 'function') callback({ success: false, message: error.message });
      }
      return;
  }
}

/**
 * Handle previous-phase event
 */
function handlePreviousPhase(socket, io, data, callback) {
  const { roomId } = data;

  const game = gameStore.getRoom(roomId);
  if (!game) {
    if (typeof callback === 'function') callback({ success: false, message: 'Room not found' });
    return;
  }

  console.log('[Socket] Previous phase requested for room: ' + roomId);

  const currentPhase = game.gamePhase;
  let previousPhase = currentPhase;

  switch (currentPhase) {
    case GamePhases.TEAM_SELECTION:
      previousPhase = GamePhases.ROLE_REVEAL;
      break;
    case GamePhases.TEAM_VOTING:
      previousPhase = GamePhases.TEAM_SELECTION;
      break;
    case GamePhases.MISSION_EXECUTION:
      previousPhase = GamePhases.TEAM_VOTING;
      break;
    default:
      break;
  }

  if (previousPhase !== currentPhase) {
    game.gamePhase = previousPhase;
    io.to(roomId).emit(ServerToClient.PHASE_CHANGED, {
      phase: previousPhase,
      previousPhase: currentPhase
    });
  }

  if (typeof callback === 'function') {
    callback({
      success: true,
      previousPhase,
      currentPhase: game.gamePhase
    });
  }
}

/**
 * Handle mission-completed-auto-advance event
 */
function handleMissionCompletedAutoAdvance(socket, io, data, callback) {
  const { roomId } = data;

  const game = gameStore.getRoom(roomId);
  if (!game) {
    if (typeof callback === 'function') callback({ success: false, message: 'Room not found' });
    return;
  }

  console.log('[Socket] Mission auto-advance for room: ' + roomId);

  const missionResult = game.missionResults[game.missionResults.length - 1];
  if (!missionResult) {
    if (typeof callback === 'function') callback({ success: false, message: 'No mission result found' });
    return;
  }

  io.to(roomId).emit(ServerToClient.MISSION_COMPLETED, {
    round: missionResult.round,
    result: missionResult.result,
    failCount: missionResult.failCount,
    successCount: missionResult.successCount
  });

  const { isGameEnded, winner } = game.checkGameEnd();

  if (isGameEnded) {
    game.gamePhase = GamePhases.GAME_ENDED;

    io.to(roomId).emit(ServerToClient.GAME_ENDED, {
      winner,
      missionResults: game.missionResults
    });

    console.log('[Socket] Game ended: ' + winner + ' wins');
  } else {
    game.startNewRound();

    io.to(roomId).emit(ServerToClient.PHASE_CHANGED, {
      phase: GamePhases.TEAM_SELECTION,
      currentRound: game.currentRound,
      currentLeader: game.currentLeader,
      currentLeaderName: game.getCurrentLeader()?.name || null
    });
  }

  if (typeof callback === 'function') {
    callback({
      success: true,
      isGameEnded,
      winner,
      gamePhase: game.gamePhase
    });
  }
}

module.exports = {
  handleNextPhase,
  handlePreviousPhase,
  handleMissionCompletedAutoAdvance
};
