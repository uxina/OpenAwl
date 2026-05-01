/**
 * 服务层入口
 * 整合所有服务模块
 */

const gameStore = require('../models/GameStore');
const { getRequiredTeamSize } = require('../utils/helpers');

/**
 * 创建服务实例
 * @param {Object} io - Socket.IO 实例
 * @returns {Object} 服务集合
 */
function createServices(io) {
  // 房间相关服务
  const roomService = {
    /**
     * 验证房间是否存在
     * @param {string} roomId - 房间ID
     * @returns {Object|null} 游戏实例或null
     */
    validateRoom(roomId) {
      const roomIdStr = String(roomId);
      const game = gameStore.getRoom(roomIdStr);
      if (!game) {
        console.log(`[验证] 房间不存在: ${roomIdStr}`);
        return null;
      }
      return game;
    },

    /**
     * 检查房间是否已满
     * @param {Object} game - 游戏实例
     * @returns {boolean}
     */
    isRoomFull(game) {
      const roomOfflinePlayers = gameStore.getRoomOfflinePlayers(game.roomId);
      const onlinePlayers = game.players.filter(p =>
        !roomOfflinePlayers.has(p.id)
      ).length;

      if (onlinePlayers >= game.configuredPlayerCount) {
        console.log(`[验证] 房间已满: ${onlinePlayers}/${game.configuredPlayerCount}`);
        return true;
      }
      return false;
    },

    /**
     * 向房间内所有玩家广播
     * @param {string} roomId - 房间ID
     * @param {string} event - 事件名
     * @param {*} data - 事件数据
     */
    broadcastToRoom(roomId, event, data) {
      io.to(String(roomId)).emit(event, data);
    },

    /**
     * 通知语音面板
     * @param {string} roomId - 房间ID
     * @param {string} event - 事件名
     * @param {*} data - 事件数据
     */
    notifyController(roomId, event, data) {
      io.to(String(roomId)).emit(event, data);
    },

    /**
     * 广播玩家重连事件
     * @param {string} roomId - 房间ID
     * @param {Object} game - 游戏实例
     * @param {string} playerId - 玩家ID
     * @param {string} playerName - 玩家名称
     */
    broadcastPlayerReconnected(roomId, game, playerId, playerName) {
      const roomIdStr = String(roomId);
      const roomOfflinePlayers = gameStore.getRoomOfflinePlayers(roomIdStr);

      io.to(roomIdStr).emit('player-reconnected', {
        playerId,
        playerName,
        players: game.players
      });

      io.to(roomIdStr).emit('controller-player-reconnected', {
        playerId,
        playerName,
        playerCount: game.players.filter(p =>
          !roomOfflinePlayers.has(p.id)
        ).length
      });
    }
  };

  // 玩家相关服务
  const playerService = {
    /**
     * 验证玩家编号是否有效
     * @param {Object} game - 游戏实例
     * @param {number} playerNumber - 玩家编号
     * @returns {boolean}
     */
    validatePlayerNumber(game, playerNumber) {
      if (!playerNumber || playerNumber < 1 || playerNumber > game.configuredPlayerCount) {
        console.log(`[验证] 玩家编号无效: ${playerNumber}`);
        return false;
      }

      const roomOfflinePlayers = gameStore.getRoomOfflinePlayers(game.roomId);
      const existingPlayer = game.players.find(p =>
        p.playerNumber === playerNumber && !roomOfflinePlayers.has(p.id)
      );

      if (existingPlayer) {
        console.log(`[验证] 玩家编号 ${playerNumber} 已被占用`);
        return false;
      }

      return true;
    },

    /**
     * 检查是否重复加入
     * @param {Object} game - 游戏实例
     * @param {string} socketId - Socket ID
     * @returns {boolean}
     */
    isDuplicateJoin(game, socketId) {
      const roomOfflinePlayers = gameStore.getRoomOfflinePlayers(game.roomId);
      const existingPlayer = game.players.find(p => {
        const playerSocketId = gameStore.getPlayerSocket(p.id);
        return playerSocketId === socketId && !roomOfflinePlayers.has(p.id);
      });

      if (existingPlayer) {
        console.log(`[验证] 玩家已在线: ${existingPlayer.name}`);
        return true;
      }
      return false;
    },

    /**
     * 获取玩家Socket
     * @param {string} playerId - 玩家ID
     * @returns {Object|null} Socket实例
     */
    getPlayerSocket(playerId) {
      const socketId = gameStore.getPlayerSocket(playerId);
      if (!socketId) return null;
      return io.sockets.sockets.get(socketId);
    },

    /**
     * 发送给指定玩家
     * @param {string} playerId - 玩家ID
     * @param {string} event - 事件名
     * @param {*} data - 事件数据
     * @returns {boolean} 是否发送成功
     */
    emitToPlayer(playerId, event, data) {
      const socket = this.getPlayerSocket(playerId);
      if (socket) {
        socket.emit(event, data);
        return true;
      }
      return false;
    }
  };

  // 游戏流程服务
  const gameService = {
    /**
     * 发送队长通知
     * @param {Object} game - 游戏实例
     * @param {Object} socket - Socket实例
     * @param {Object} player - 玩家对象
     */
    sendLeaderNotification(game, socket, player) {
      if (player.isLeader) {
        socket.emit('you-are-leader', {
          round: game.currentRound,
          requiredTeamSize: getRequiredTeamSize(game.currentRound, game.players.length),
          currentLeaderIndex: game.currentLeaderIndex
        });
      }
    },

    /**
     * 广播角色分配
     * @param {string} roomId - 房间ID
     * @param {Object} game - 游戏实例
     */
    broadcastRoleAssignment(roomId, game) {
      // 给语音面板发送角色信息
      io.to(String(roomId)).emit('controller-roles-assigned', {
        players: game.players.map(p => ({
          id: p.id,
          name: p.name,
          role: p.role,
          side: p.side
        })),
        gamePhase: game.gamePhase,
        currentRound: game.currentRound,
        currentLeaderIndex: game.currentLeaderIndex
      });

      // 给每个玩家发送自己的角色
      game.players.forEach(player => {
        playerService.emitToPlayer(player.id, 'role-assigned', {
          role: player.role,
          side: player.side,
          vision: game.getPlayerVision(player.id)
        });

        // 如果是队长，发送队长通知
        if (player.isLeader) {
          const socket = playerService.getPlayerSocket(player.id);
          if (socket) {
            this.sendLeaderNotification(game, socket, player);
          }
        }
      });
    }
  };

  return {
    gameStore,
    roomService,
    playerService,
    gameService,
    io
  };
}

module.exports = { createServices };
