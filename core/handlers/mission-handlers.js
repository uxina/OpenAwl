/**
 * Mission Handlers - 任务相关事件处理
 */

const { ClientToServer, ServerToClient, GamePhases } = require('../config/socket-events');
const gameStore = require('../models/GameStore');

function emitToRoom(io, roomId, eventName, data) {
  console.log('[emitToRoom] Emitting', eventName, 'to room', roomId);
  
  // Get all sockets actually in the Socket.IO room
  const room = io.sockets.adapter.rooms.get(roomId);
  const socketsInRoom = room ? room.size : 0;
  console.log('[emitToRoom] Sockets in Socket.IO room:', socketsInRoom);
  
  // Use Socket.IO's native room broadcast
  io.to(roomId).emit(eventName, data);
  console.log('[emitToRoom] Broadcast completed via Socket.IO room');
}

function handleExecuteMission(socket, io, data, callback) {
  const { roomId, missionVote } = data;

  const game = gameStore.getRoom(roomId);
  if (!game) {
    if (typeof callback === 'function') callback({ success: false, message: 'Room not found' });
    return;
  }

  const playerId = socket.playerId;
  const currentTeam = game.currentTeam || [];
  
  console.log('[handleExecuteMission] playerId:', playerId);
  console.log('[handleExecuteMission] currentTeam:', currentTeam);
  console.log('[handleExecuteMission] game.currentTeam:', game.currentTeam);

  if (!currentTeam.includes(playerId)) {
    console.log('[handleExecuteMission] ERROR: Player not in mission team');
    if (typeof callback === 'function') callback({ success: false, message: 'Not on mission team' });
    return;
  }

  try {
    const result = game.executeMission(playerId, missionVote);

    emitToRoom(io, roomId, ServerToClient.MISSION_VOTE_RECEIVED, {
      playerId,
      vote: missionVote
    });

    console.log('[Socket] Mission vote received: ' + Object.keys(game.missionVotes).length + '/' + currentTeam.length);
    console.log('[Socket] Mission result.completed:', result.completed);
    console.log('[Socket] Mission result.gamePhase:', result.gamePhase);

    if (!result.completed) {
      console.log('[Socket] Mission not completed yet, returning early');
      if (typeof callback === 'function') {
        callback({ success: true, voteCount: result.voted, requiredVotes: result.total });
      }
      return;
    }
    
    console.log('[Socket] Mission completed! Sending events...');

    emitToRoom(io, roomId, ServerToClient.MISSION_COMPLETED, {
      round: result.missionResult.round,
      result: result.missionResult.result,
      failCount: result.missionResult.failCount,
      successCount: result.missionResult.successCount,
      missionResults: result.missionResults,
      gamePhase: result.gamePhase,
      currentRound: result.currentRound,
      currentLeaderIndex: result.currentLeaderIndex,
      currentLeader: result.currentLeader,
      currentLeaderName: result.currentLeader,
      players: result.players,
      isGameEnded: result.gameEnded,
      winner: result.winner,
      myRole: undefined,
      mySide: undefined
    });

    if (result.gameEnded && result.winner === 'evil') {
      emitToRoom(io, roomId, ServerToClient.GAME_ENDED, {
        winner: 'evil',
        missionResults: game.missionResults,
        voteHistory: game.missionResults,
        gamePhase: 'ended'
      });
    } else if (result.gamePhase === 'assassination') {
      const currentLeader = game.players[result.currentLeaderIndex];
      emitToRoom(io, roomId, ServerToClient.PHASE_CHANGED, {
        phase: 'assassination',
        currentRound: result.currentRound,
        currentLeaderIndex: result.currentLeaderIndex,
        currentLeaderName: currentLeader?.name || null,
        playerCount: game.configuredPlayerCount || game.players.length,
        players: game.players.map(p => ({
          playerId: p.id,
          playerName: p.name,
          role: p.role,
          side: p.side
        }))
      });
    } else if (result.gamePhase === 'team-building') {
      console.log('[Socket] Sending PHASE_CHANGED to team-building');
      const currentLeader = game.players[result.currentLeaderIndex];
      const eventData = {
        phase: 'team-building',
        currentRound: result.currentRound,
        currentLeaderIndex: result.currentLeaderIndex,
        currentLeaderName: currentLeader?.name || null,
        playerCount: game.configuredPlayerCount || game.players.length,
        missionResults: game.missionResults,
        players: game.players.map(p => ({
          playerId: p.id,
          playerName: p.name,
          role: p.role,
          side: p.side
        }))
      };
      emitToRoom(io, roomId, ServerToClient.PHASE_CHANGED, eventData);
      console.log('[Socket] PHASE_CHANGED sent to room', roomId, 'with missionResults:', game.missionResults.length);
    }

    if (typeof callback === 'function') {
      callback({
        success: true,
        missionResult: result.missionResult,
        isGameEnded: result.gameEnded,
        winner: result.winner,
        gamePhase: result.gamePhase
      });
    }
  } catch (error) {
    if (typeof callback === 'function') callback({ success: false, message: error.message });
  }
}

function handleAssassinate(socket, io, data, callback) {
  const { roomId, targetPlayerId } = data;

  const game = gameStore.getRoom(roomId);
  if (!game) {
    if (typeof callback === 'function') callback({ success: false, message: 'Room not found' });
    return;
  }

  const assassin = game.players.find(p => p.id === socket.playerId);
  if (!assassin || assassin.role !== 'assassin') {
    if (typeof callback === 'function') callback({ success: false, message: 'Not the assassin' });
    return;
  }

  const target = game.players.find(p => p.id === targetPlayerId);
  if (!target) {
    if (typeof callback === 'function') callback({ success: false, message: 'Target not found' });
    return;
  }

  const isCorrect = target.role === 'merlin';
  game.assassinationResult = { assassinId: assassin.id, targetId: targetPlayerId, isCorrect };

  // 无论刺杀成功与否，都发送游戏结束事件
  game.gamePhase = GamePhases.GAME_ENDED;
  
  if (isCorrect) {
    // 刺杀成功 - 邪恶方胜利
    emitToRoom(io, roomId, ServerToClient.GAME_ENDED, {
      winner: 'evil',
      missionResults: game.missionResults,
      voteHistory: game.missionResults,
      players: game.players.map(p => ({
        id: p.id,
        name: p.name,
        role: p.role,
        side: p.side
      })),
      assassinationTarget: targetPlayerId,
      assassinationResult: {
        targetId: targetPlayerId,
        targetName: target.name,
        targetRole: target.role,
        isCorrect: true
      }
    });
  } else {
    // 刺杀失败 - 好人方胜利
    emitToRoom(io, roomId, ServerToClient.GAME_ENDED, {
      winner: 'good',
      missionResults: game.missionResults,
      voteHistory: game.missionResults,
      players: game.players.map(p => ({
        id: p.id,
        name: p.name,
        role: p.role,
        side: p.side
      })),
      assassinationTarget: targetPlayerId,
      assassinationResult: {
        targetId: targetPlayerId,
        targetName: target.name,
        targetRole: target.role,
        isCorrect: false
      }
    });
  }

  if (typeof callback === 'function') {
    callback({
      success: true,
      isCorrect,
      isGameEnded: isCorrect,
      gamePhase: game.gamePhase
    });
  }
}

module.exports = {
  handleExecuteMission,
  handleAssassinate
};
