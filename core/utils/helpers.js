/**
 * 工具函数集合
 */

const AvalonGame = require('../game-logic');

/**
 * 生成唯一房间ID (4位数字)
 * @param {Function} existsCheck - 检查ID是否存在的函数
 * @returns {string} 房间ID
 */
function generateRoomId(existsCheck) {
  let roomId;
  do {
    roomId = Math.floor(1000 + Math.random() * 9000).toString();
  } while (existsCheck(roomId));
  return roomId;
}

/**
 * 生成唯一玩家ID
 * @returns {string} 玩家ID
 */
function generatePlayerId() {
  return 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * 获取任务所需队伍大小
 * @param {number} round - 当前轮次
 * @param {number} playerCount - 玩家总数
 * @returns {number} 所需队伍大小
 */
function getRequiredTeamSize(round, playerCount) {
  const missionConfig = AvalonGame.getMissionConfig(playerCount);
  return missionConfig[round - 1] || 2;
}

/**
 * 格式化房间信息
 * @param {string} roomId - 房间ID
 * @param {Object} game - 游戏实例
 * @returns {Object} 格式化后的房间信息
 */
function formatRoomInfo(roomId, game) {
  return {
    roomId,
    playerCount: game.configuredPlayerCount,
    currentPlayers: game.players.length,
    gamePhase: game.gamePhase
  };
}

/**
 * 格式化玩家信息
 * @param {Object} player - 玩家对象
 * @returns {Object} 格式化后的玩家信息
 */
function formatPlayerInfo(player) {
  return {
    id: player.id,
    name: player.name,
    number: player.number,
    role: player.role,
    side: player.side,
    isLeader: player.isLeader,
    isOnline: player.isOnline !== false
  };
}

/**
 * 延迟函数
 * @param {number} ms - 毫秒数
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 安全的JSON解析
 * @param {string} str - JSON字符串
 * @param {*} defaultValue - 默认值
 * @returns {*} 解析结果或默认值
 */
function safeJsonParse(str, defaultValue = null) {
  try {
    return JSON.parse(str);
  } catch {
    return defaultValue;
  }
}

/**
 * 验证玩家编号是否有效
 * @param {number} number - 玩家编号
 * @returns {boolean}
 */
function isValidPlayerNumber(number) {
  return Number.isInteger(number) && number >= 1 && number <= 10;
}

module.exports = {
  generateRoomId,
  generatePlayerId,
  getRequiredTeamSize,
  formatRoomInfo,
  formatPlayerInfo,
  sleep,
  safeJsonParse,
  isValidPlayerNumber
};
