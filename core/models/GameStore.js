/**
 * 游戏数据存储管理类
 * 集中管理所有游戏相关的数据存储
 */

const config = require('../config');

class GameStore {
  constructor() {
    // 房间ID -> 游戏实例
    this.games = new Map();
    // 房间ID -> 创建时间戳
    this.roomCreationTime = new Map();
    // 房间ID -> 离线玩家ID集合
    this.offlinePlayers = new Map();
    // 玩家ID -> Socket ID
    this.playerSocketMap = new Map();
    // Socket ID -> 控制器信息
    this.controllers = new Map();
  }

  // ==================== 房间管理 ====================

  /**
   * 创建房间
   * @param {string} roomId - 房间ID
   * @param {Object} game - 游戏实例
   */
  createRoom(roomId, game) {
    this.games.set(roomId, game);
    this.roomCreationTime.set(roomId, Date.now());
    this.offlinePlayers.set(roomId, new Set());
  }

  /**
   * 获取房间
   * @param {string} roomId - 房间ID
   * @returns {Object|undefined} 游戏实例
   */
  getRoom(roomId) {
    return this.games.get(roomId);
  }

  /**
   * 检查房间是否存在
   * @param {string} roomId - 房间ID
   * @returns {boolean}
   */
  hasRoom(roomId) {
    return this.games.has(roomId);
  }

  /**
   * 删除房间
   * @param {string} roomId - 房间ID
   */
  deleteRoom(roomId) {
    this.games.delete(roomId);
    this.roomCreationTime.delete(roomId);
    this.offlinePlayers.delete(roomId);
  }

  /**
   * 获取所有房间ID
   * @returns {Iterator<string>}
   */
  getAllRoomIds() {
    return this.games.keys();
  }

  /**
   * 获取房间数量
   * @returns {number}
   */
  getRoomCount() {
    return this.games.size;
  }

  // ==================== 玩家Socket管理 ====================

  /**
   * 设置玩家Socket映射
   * @param {string} playerId - 玩家ID
   * @param {string} socketId - Socket ID
   */
  setPlayerSocket(playerId, socketId) {
    this.playerSocketMap.set(playerId, socketId);
  }

  /**
   * 获取玩家Socket ID
   * @param {string} playerId - 玩家ID
   * @returns {string|undefined} Socket ID
   */
  getPlayerSocket(playerId) {
    return this.playerSocketMap.get(playerId);
  }

  /**
   * 删除玩家Socket映射
   * @param {string} playerId - 玩家ID
   */
  deletePlayerSocket(playerId) {
    this.playerSocketMap.delete(playerId);
  }

  /**
   * 检查玩家是否有Socket连接
   * @param {string} playerId - 玩家ID
   * @returns {boolean}
   */
  hasPlayerSocket(playerId) {
    return this.playerSocketMap.has(playerId);
  }

  // ==================== 离线玩家管理 ====================

  /**
   * 添加离线玩家
   * @param {string} roomId - 房间ID
   * @param {string} playerId - 玩家ID
   */
  addOfflinePlayer(roomId, playerId) {
    const roomOfflinePlayers = this.offlinePlayers.get(roomId);
    if (roomOfflinePlayers) {
      roomOfflinePlayers.add(playerId);
    }
  }

  /**
   * 移除离线玩家
   * @param {string} roomId - 房间ID
   * @param {string} playerId - 玩家ID
   */
  removeOfflinePlayer(roomId, playerId) {
    const roomOfflinePlayers = this.offlinePlayers.get(roomId);
    if (roomOfflinePlayers) {
      roomOfflinePlayers.delete(playerId);
    }
  }

  /**
   * 检查玩家是否离线
   * @param {string} roomId - 房间ID
   * @param {string} playerId - 玩家ID
   * @returns {boolean}
   */
  isPlayerOffline(roomId, playerId) {
    const roomOfflinePlayers = this.offlinePlayers.get(roomId);
    return roomOfflinePlayers ? roomOfflinePlayers.has(playerId) : false;
  }

  /**
   * 获取房间离线玩家集合
   * @param {string} roomId - 房间ID
   * @returns {Set<string>}
   */
  getRoomOfflinePlayers(roomId) {
    return this.offlinePlayers.get(roomId) || new Set();
  }

  // ==================== 控制器管理 ====================

  /**
   * 设置控制器信息
   * @param {string} socketId - Socket ID
   * @param {Object} info - 控制器信息
   */
  setController(socketId, info) {
    this.controllers.set(socketId, info);
  }

  /**
   * 获取控制器信息
   * @param {string} socketId - Socket ID
   * @returns {Object|undefined}
   */
  getController(socketId) {
    return this.controllers.get(socketId);
  }

  /**
   * 删除控制器信息
   * @param {string} socketId - Socket ID
   */
  deleteController(socketId) {
    this.controllers.delete(socketId);
  }

  /**
   * 根据房间ID查找控制器Socket ID
   * @param {string} roomId - 房间ID
   * @returns {string|undefined}
   */
  findControllerByRoom(roomId) {
    for (const [socketId, info] of this.controllers.entries()) {
      if (info.roomId === roomId) {
        return socketId;
      }
    }
    return undefined;
  }

  // ==================== 房间清理 ====================

  /**
   * 清理过期房间
   * @returns {number} 清理的房间数量
   */
  cleanupExpiredRooms() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [roomId, creationTime] of this.roomCreationTime.entries()) {
      const age = now - creationTime;
      const game = this.games.get(roomId);

      // 房间超过最大存活时间，或游戏已结束超过10分钟
      if (age > config.ROOM_MAX_AGE || (game?.gamePhase === 'ended' && age > 10 * 60 * 1000)) {
        this.deleteRoom(roomId);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  /**
   * 获取房间年龄
   * @param {string} roomId - 房间ID
   * @returns {number} 房间存在时间（毫秒）
   */
  getRoomAge(roomId) {
    const creationTime = this.roomCreationTime.get(roomId);
    return creationTime ? Date.now() - creationTime : 0;
  }
}

// 导出单例实例
module.exports = new GameStore();
