/**
 * ============================================================================
 * Socket.IO 事件处理器入口
 * ============================================================================
 * 
 * 集中注册所有 Socket 事件处理器
 * 每个事件处理器独立成文件，便于维护
 */

const roomHandlers = require('./roomHandlers');
const playerHandlers = require('./playerHandlers');
const gameHandlers = require('./gameHandlers');

/**
 * 设置所有 Socket 事件处理器
 * @param {Object} io - Socket.IO 实例
 * @param {Object} socket - 当前 socket 连接
 * @param {Object} context - 上下文对象 { games, roomCreationTime, controllers, playerSocketMap, offlinePlayers, ... }
 */
function setupSocketHandlers(io, socket, context) {
  const { games, roomCreationTime, controllers, playerSocketMap, offlinePlayers } = context;

  // 工具函数：验证房间存在
  const validateRoomExists = (roomId) => {
    const roomIdStr = String(roomId);
    const game = games.get(roomIdStr);
    if (!game) {
      console.log(`[验证] 房间不存在: ${roomIdStr}`);
      return null;
    }
    return game;
  };

  // 工具函数：检查房间是否已满
  const checkRoomFull = (game) => {
    const roomOfflinePlayers = offlinePlayers.get(game.roomId) || new Set();
    const onlinePlayers = game.players.filter(p => !roomOfflinePlayers.has(p.id)).length;
    if (onlinePlayers >= game.configuredPlayerCount) {
      console.log(`[验证] 房间已满: ${onlinePlayers}/${game.configuredPlayerCount}`);
      return true;
    }
    return false;
  };

  // 工具函数：验证玩家编号
  const validatePlayerNumber = (game, playerNumber) => {
    if (!playerNumber || playerNumber < 1 || playerNumber > game.configuredPlayerCount) {
      console.log(`[验证] 玩家编号无效: ${playerNumber}`);
      return false;
    }
    const roomOfflinePlayers = offlinePlayers.get(game.roomId) || new Set();
    const existingPlayer = game.players.find(p =>
      p.playerNumber === playerNumber && !roomOfflinePlayers.has(p.id)
    );
    if (existingPlayer) {
      console.log(`[验证] 玩家编号 ${playerNumber} 已被占用`);
      return false;
    }
    return true;
  };

  // 工具函数：检查重复加入
  const checkDuplicateJoin = (game, socketId) => {
    const roomOfflinePlayers = offlinePlayers.get(game.roomId) || new Set();
    const existingPlayer = game.players.find(p => {
      const playerSocketId = playerSocketMap.get(p.id);
      return playerSocketId === socketId && !roomOfflinePlayers.has(p.id);
    });
    if (existingPlayer) {
      console.log(`[验证] 玩家已在线: ${existingPlayer.name}`);
      return true;
    }
    return false;
  };

  // 创建服务上下文
  const services = {
    io,
    socket,
    games,
    roomCreationTime,
    controllers,
    playerSocketMap,
    offlinePlayers,
    validateRoomExists,
    checkRoomFull,
    validatePlayerNumber,
    checkDuplicateJoin
  };

  // 注册房间相关事件
  roomHandlers.register(socket, services);

  // 注册玩家相关事件
  playerHandlers.register(socket, services);

  // 注册游戏相关事件
  gameHandlers.register(socket, services);

  // 断开连接事件
  socket.on('disconnect', () => {
    console.log('[Socket] 断开连接:', socket.id);

    // 处理控制器断开
    const controllerInfo = controllers.get(socket.id);
    if (controllerInfo) {
      console.log(`[Socket] 控制器断开: ${controllerInfo.roomId}`);
      controllers.delete(socket.id);
      return;
    }

    // 处理玩家断开
    if (socket.playerId && socket.roomId) {
      const game = games.get(socket.roomId);
      if (game) {
        const player = game.players.find(p => p.id === socket.playerId);
        if (player) {
          offlinePlayers.get(socket.roomId).add(player.id);
          io.to(socket.roomId).emit('player-offline', {
            playerId: player.id,
            playerName: player.name
          });
          console.log(`[Socket] 玩家离线: ${player.name} -> ${socket.roomId}`);
        }
      }
      playerSocketMap.delete(socket.playerId);
    }
  });
}

module.exports = { setupSocketHandlers };
