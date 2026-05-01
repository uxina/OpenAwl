/**
 * 服务器配置
 */

module.exports = {
  // 服务器端口
  PORT: process.env.PORT || 3000,

  // Socket.IO 配置
  SOCKET_CONFIG: {
    cors: { origin: "*" },
    pingTimeout: 60000,
    pingInterval: 25000
  },

  // 房间配置
  ROOM_MAX_AGE: 2 * 60 * 60 * 1000,      // 房间最大存活时间：2小时
  CLEANUP_INTERVAL: 30 * 60 * 1000,      // 清理间隔：30分钟

  // 游戏配置
  MIN_PLAYERS: 5,                        // 最小玩家数
  MAX_PLAYERS: 10,                       // 最大玩家数

  // 版本号
  VERSION: process.env.npm_package_version || '2.0.0'
};
