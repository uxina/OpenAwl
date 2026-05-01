/**
 * Socket 事件名称常量定义
 * 统一管理客户端和服务器端的 Socket 事件名称，避免命名不匹配导致 bug
 */

const ClientToServer = {
  // 房间相关
  ROOM_CREATE: 'room-create',
  ROOM_JOIN: 'room-join',
  CONTROLLER_JOIN: 'join-controller',
  ROOM_STATUS: 'get-room-status',
  PLAYER_JOIN: 'player-join',
  PLAYER_REJOIN: 'player-rejoin',
  PLAYER_RECONNECT: 'player-reconnect',
  PLAYER_LEAVE: 'player-leave',
  CONTROLLER_RECONNECT: 'controller-reconnect',

  // 编号预选择相关
  PLAYER_ID_SELECT: 'player-id-select',
  PLAYER_ID_DESELECT: 'player-id-deselect',

  // 游戏流程
  START_GAME: 'start-game',
  REQUEST_GAME_STATE: 'request-game-state',
  NEXT_PHASE: 'next-phase',
  PREVIOUS_PHASE: 'previous-phase',
  RESET_GAME: 'reset-game',

  // 身份相关
  CONFIRM_ROLE: 'confirm-role',

  // 组队相关
  BUILD_TEAM: 'build-team',
  PROPOSE_TEAM: 'propose-team',

  // 投票相关
  VOTE_TEAM: 'vote-team',

  // 任务相关
  EXECUTE_MISSION: 'execute-mission',
  CONTROLLER_MISSION_RESULT: 'controller-mission-result',
  MISSION_COMPLETED_AUTO_ADVANCE: 'mission-completed-auto-advance',

  // 刺杀相关
  ASSASSINATE: 'assassinate'
};

const ServerToClient = {
  ROOM_CREATED: 'room-created',
  ROOM_UPDATED: 'room-updated',
  PLAYER_JOIN_SUCCESS: 'player-join-success',
  PLAYER_JOINED: 'player-joined',
  PLAYER_LEFT: 'player-left',
  PLAYER_OFFLINE: 'player-offline',
  PLAYER_RECONNECTED: 'player-reconnected',
  PLAYER_DISCONNECTED: 'player-disconnected',
  PLAYER_STATUS_CHANGED: 'player-status-changed',

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
  MISSION_VOTE_RECEIVED: 'mission-vote-received',

  ASSASSINATION_RESULT: 'assassination-result',
  ASSASSIN_COMPLETED: 'assassin-completed',

  GAME_ENDED: 'game-ended',
  GAME_RESET: 'game-reset',
  GAME_RESET_REJOINED: 'game-reset-rejoined',

  FORCE_DISCONNECT: 'force-disconnect',

  YOU_ARE_LEADER: 'you-are-leader',

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

module.exports = {
  ClientToServer,
  ServerToClient,
  GamePhases
};
