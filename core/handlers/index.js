/**
 * Handlers Index - 统一导出所有 handler
 */

const roomHandlers = require('./room-handlers');
const playerHandlers = require('./player-handlers');
const gameHandlers = require('./game-handlers');
const teamHandlers = require('./team-handlers');
const missionHandlers = require('./mission-handlers');
const systemHandlers = require('./system-handlers');

module.exports = {
  ...roomHandlers,
  ...playerHandlers,
  ...gameHandlers,
  ...teamHandlers,
  ...missionHandlers,
  ...systemHandlers
};
