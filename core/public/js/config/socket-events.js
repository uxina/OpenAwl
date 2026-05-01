/**
 * Socket 事件名称常量定义 (客户端版本)
 * 统一管理客户端和服务器端的 Socket 事件名称，避免命名不匹配导致 bug
 *
 * 注意：此文件需要在浏览器环境中运行，不能使用 Node.js 的 module.exports
 * 使用 window.SocketEvents 全局变量导出
 */

(function(global) {
  'use strict';

  // 客户端 -> 服务器事件
  const ClientToServer = {
    ROOM_CREATE: 'room-create',
    ROOM_JOIN: 'room-join',
    ROOM_STATUS: 'get-room-status',
    PLAYER_JOIN: 'player-join',
    PLAYER_RECONNECT: 'player-reconnect',
    PLAYER_LEAVE: 'player-leave',
    CONTROLLER_RECONNECT: 'controller-reconnect',

    START_GAME: 'start-game',
    REQUEST_GAME_STATE: 'request-game-state',
    NEXT_PHASE: 'next-phase',
    PREVIOUS_PHASE: 'previous-phase',
    RESET_GAME: 'reset-game',

    CONFIRM_ROLE: 'confirm-role',

    BUILD_TEAM: 'build-team',
    PROPOSE_TEAM: 'propose-team',

    VOTE_TEAM: 'vote-team',

    EXECUTE_MISSION: 'execute-mission',
    CONTROLLER_MISSION_RESULT: 'controller-mission-result',
    MISSION_COMPLETED_AUTO_ADVANCE: 'mission-completed-auto-advance',

    ASSASSINATE: 'assassinate'
  };

  // 服务器 -> 客户端事件 (与实际代码中使用的事件名一致)
  const ServerToClient = {
    ROOM_CREATED: 'room-created',
    ROOM_UPDATED: 'room-updated',
    PLAYER_JOIN_SUCCESS: 'player-join-success',
    PLAYER_JOINED: 'player-joined',
    PLAYER_LEFT: 'player-left',
    PLAYER_OFFLINE: 'player-offline',
    PLAYER_RECONNECTED: 'player-reconnected',

    GAME_STATE: 'game-state',
    GAME_STARTED: 'game-started',
    PHASE_CHANGED: 'phase-changed',

    ROLE_ASSIGNED: 'role-assigned',

    VOTE_UPDATE: 'vote-update',
    VOTE_UPDATED: 'vote-updated',
    VOTE_COMPLETED: 'vote-completed',
    VOTE_RESULT: 'vote-result',

    TEAM_SELECTED: 'team-selected',
    TEAM_PROPOSED: 'team-proposed',

    MISSION_START: 'mission-start',
    MISSION_WAITING: 'mission-waiting',
    MISSION_PROGRESS: 'mission-progress',
    MISSION_COMPLETED: 'mission-completed',
    MISSION_UPDATED: 'mission-updated',
    MISSION_RESULT: 'mission-result',

    ASSASSINATION_RESULT: 'assassination-result',

    GAME_ENDED: 'game-ended',
    GAME_RESET: 'game-reset',
    GAME_RESET_REJOINED: 'game-reset-rejoined',

    FORCE_DISCONNECT: 'force-disconnect',

    YOU_ARE_LEADER: 'you-are-leader',
    LEADER_CHANGED: 'leader-changed',

    ERROR: 'error'
  };

  const GamePhases = {
    WAITING: 'waiting',
    OPENING: 'opening',
    ROLE_CONFIRM: 'role-confirm',
    NIGHT: 'night',
    DAY: 'day',
    TEAM_BUILDING: 'team-building',
    DISCUSSION: 'discussion',
    VOTING: 'voting',
    MISSION: 'mission',
    ASSASSINATION: 'assassination',
    ENDED: 'ended'
  };

  // 导出到全局
  global.SocketEvents = {
    ClientToServer,
    ServerToClient,
    GamePhases
  };

  // 支持 CommonJS 和 ES Module 的导出（用于测试）
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ClientToServer, ServerToClient, GamePhases };
  }

})(typeof window !== 'undefined' ? window : this);
