# Avalon Game Server - 项目架构文档

> 本文档描述重构后的服务器架构，适用于 AI 代码助手理解和维护此项目。

## 📁 项目结构

```
core/
├── server.js                    # 主入口 (162 行)
├── server.js.backup            # 原文件备份
├── game-logic.js              # 游戏逻辑核心
├── models/
│   └── GameStore.js           # 游戏状态存储
├── services/
│   └── index.js               # 服务层
├── config/
│   ├── socket-events.js       # Socket 事件常量
│   └── phaseRoutes.js         # 阶段路由配置
├── handlers/                   # Socket 事件处理器 ⬅️ 重构新增
│   ├── index.js              # 统一导出
│   ├── room-handlers.js      # 房间管理
│   ├── player-handlers.js    # 玩家管理
│   ├── game-handlers.js      # 游戏进程
│   ├── mission-handlers.js    # 任务执行
│   └── system-handlers.js    # 系统事件
└── utils/
    └── helpers.js             # 工具函数
```

## 🎮 Socket 事件流

### 客户端 → 服务器事件 (ClientToServer)

| 事件名 | 常量 | Handler 函数 | 描述 |
|--------|------|--------------|------|
| create-room | `ClientToServer.ROOM_CREATE` | handleCreateRoom | 创建房间 |
| get-room-status | `ClientToServer.GET_ROOM_STATUS` | handleGetRoomStatus | 获取房间状态 |
| player-join | `ClientToServer.PLAYER_JOIN` | handlePlayerJoin | 玩家加入 |
| player-rejoin | `ClientToServer.PLAYER_REJOIN` | handlePlayerRejoin | 玩家重连 |
| player-reconnect | `ClientToServer.PLAYER_RECONNECT` | handlePlayerReconnect | 玩家重新连接 |
| confirm-role | `ClientToServer.CONFIRM_ROLE` | handleConfirmRole | 确认角色 |
| previous-phase | `ClientToServer.PREVIOUS_PHASE` | handlePreviousPhase | 返回上一阶段 |
| mission-completed-auto-advance | `ClientToServer.MISSION_COMPLETED_AUTO_ADVANCE` | handleMissionCompletedAutoAdvance | 任务完成自动推进 |
| execute-mission | `ClientToServer.EXECUTE_MISSION` | handleExecuteMission | 执行任务 |
| assassinate | `ClientToServer.ASSASSINATE` | handleAssassinate | 刺杀梅林 |
| reset-game | `ClientToServer.RESET_GAME` | handleResetGame | 重置游戏 |
| request-game-state | `ClientToServer.REQUEST_GAME_STATE` | handleRequestGameState | 请求游戏状态 |

### 服务器 → 客户端事件 (ServerToClient)

| 事件名 | 常量 | 描述 |
|--------|------|------|
| room-created | `ServerToClient.ROOM_CREATED` | 房间创建成功 |
| player-joined | `ServerToClient.PLAYER_JOINED` | 玩家加入通知 |
| player-disconnected | `ServerToClient.PLAYER_DISCONNECTED` | 玩家断开连接 |
| player-reconnect-success | `ServerToClient.PLAYER_RECONNECT_SUCCESS` | 重连成功 |
| phase-changed | `ServerToClient.PHASE_CHANGED` | 阶段变化 |
| vote-update | `ServerToClient.VOTE_UPDATE` | 投票进度更新 |
| vote-completed | `ServerToClient.VOTE_COMPLETED` | 投票完成 |
| mission-vote-received | `ServerToClient.MISSION_VOTE_RECEIVED` | 任务投票收到 |
| mission-completed | `ServerToClient.MISSION_COMPLETED` | 任务完成 |
| assassin-completed | `ServerToClient.ASSASSIN_COMPLETED` | 刺杀完成 |
| game-ended | `ServerToClient.GAME_ENDED` | 游戏结束 |
| game-reset | `ServerToClient.GAME_RESET` | 游戏重置 |
| error | `ServerToClient.ERROR` | 错误通知 |

## 📂 Handler 模块详解

### 1. room-handlers.js - 房间管理

**职责**: 房间的创建和状态查询

```javascript
handleCreateRoom(socket, io, data, callback)
// - 生成房间 ID
// - 创建 AvalonGame 实例
// - 存储到 gameStore
// - 发送 room-created 事件

handleGetRoomStatus(socket, data, callback)
// - 验证房间存在
// - 返回房间状态、玩家列表、游戏阶段
```

### 2. player-handlers.js - 玩家管理

**职责**: 玩家的加入、重连、角色确认

```javascript
handlePlayerJoin(socket, io, data, callback)
// - 验证房间未满
// - 生成玩家 ID
// - 设置第一个玩家为队长
// - 广播 player-joined 事件

handlePlayerRejoin(socket, io, data, callback)
// - 恢复离线玩家的连接
// - 清除离线标记

handlePlayerReconnect(socket, io, data, callback)
// - 处理玩家断线重连
// - 更新 socket 与玩家 ID 的映射

handleConfirmRole(socket, io, data, callback)
// - 标记角色已确认
// - 所有玩家确认后，进入队伍选择阶段
```

### 3. game-handlers.js - 游戏进程

**职责**: 游戏阶段推进和控制

```javascript
handlePreviousPhase(socket, io, data, callback)
// - 返回上一游戏阶段
// - 用于语音控制回退

handleMissionCompletedAutoAdvance(socket, io, data, callback)
// - 任务完成后自动推进
// - 检查游戏是否结束
// - 启动新回合或结束游戏
```

### 4. mission-handlers.js - 任务执行

**职责**: 任务投票和执行

```javascript
handleExecuteMission(socket, io, data, callback)
// - 记录任务投票 (success/fail)
// - 投票达到所需人数时结算任务
// - 更新 missionResults
// - 检查游戏结束条件

handleAssassinate(socket, io, data, callback)
// - 刺客刺杀梅林
// - 刺杀成功则邪恶阵营获胜
```

### 5. system-handlers.js - 系统事件

**职责**: 游戏重置、状态查询、断线处理

```javascript
handleResetGame(socket, io, data, callback)
// - 重置游戏状态
// - 广播 game-reset 事件

handleRequestGameState(socket, io, data, callback)
// - 返回完整游戏状态
// - 包含当前阶段、玩家列表、任务历史等

handleDisconnect(socket, io)
// - 处理玩家断线
// - 标记玩家为离线状态
// - 通知房间内其他玩家
```

## 🔧 核心数据结构

### gameStore

```javascript
gameStore = {
  games: Map<roomId, AvalonGame>,           // 房间ID → 游戏实例
  controllers: Map<socketId, controllerInfo>, // 控制面板映射
  playerSockets: Map<playerId, socketId>,    // 玩家ID → socket ID
  offlinePlayers: Map<roomId, Set<playerId>>, // 离线玩家集合
  roomCreationTime: Map<roomId, {createdAt}> // 房间创建时间
}
```

### AvalonGame 核心属性

```javascript
{
  roomId: string,              // 房间ID
  configuredPlayerCount: number, // 配置玩家数
  players: Player[],          // 玩家列表
  gamePhase: GamePhases,      // 当前阶段
  currentRound: number,        // 当前回合
  currentLeader: playerId,     // 当前队长ID
  currentLeaderIndex: number,  // 队长索引
  currentTeam: playerId[],     // 当前任务队伍
  teamVotes: Map<playerId, vote>, // 队伍投票
  missionResults: MissionResult[], // 任务结果历史
  assassinationResult: object,    // 刺杀结果
  config: GameConfig          // 游戏配置
}
```

### MissionResult 结构

```javascript
{
  round: number,           // 回合数
  result: 'success' | 'fail', // 任务结果
  failCount: number,        // 失败票数
  successCount: number,     // 成功票数
  teamVotes: {},            // 队伍投票详情
  teamLeader: playerId      // 带队队长
}
```

## 🎯 游戏阶段 (GamePhases)

```javascript
const GamePhases = {
  WAITING: 'waiting',           // 等待玩家
  ROLE_REVEAL: 'role-reveal',   // 角色分发
  TEAM_SELECTION: 'team-selection', // 队伍选择
  TEAM_VOTING: 'team-voting',    // 队伍投票
  MISSION_EXECUTION: 'mission-execution', // 任务执行
  ASSASSINATION: 'assassination', // 刺杀阶段
  GAME_ENDED: 'game-ended'       // 游戏结束
};
```

## 🔌 API 端点

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /health | 健康检查 |
| POST | /api/rooms | 创建房间 |
| GET | /api/rooms | 获取房间列表 |
| GET | /api/rooms/:roomId | 获取特定房间状态 |

## 📝 开发指南

### 添加新的 Socket 事件处理器

1. 在对应的 handler 文件中添加函数：
```javascript
// handlers/xxx-handlers.js
function handleNewEvent(socket, io, data, callback) {
  // 处理逻辑
}

module.exports = {
  // ... 其他导出
  handleNewEvent
};
```

2. 在 `handlers/index.js` 中确保导出

3. 在 `server.js` 中注册事件：
```javascript
socket.on(ClientToServer.NEW_EVENT, (data, callback) => {
  handlers.handleNewEvent(socket, io, data, callback);
});
```

### 添加新的游戏阶段

1. 在 `config/socket-events.js` 的 `GamePhases` 中添加常量

2. 在 `game-logic.js` 中实现阶段的转换逻辑

3. 在对应的 handler 中处理新阶段的事件

## 🐛 调试技巧

### 查看活跃房间
```javascript
console.log('Active rooms:', Array.from(gameStore.games.keys()));
```

### 查看玩家映射
```javascript
console.log('Player sockets:', Array.from(gameStore.playerSockets.entries()));
```

### 模拟投票进度
```javascript
// 在 mission-handlers.js 中添加调试日志
console.log('[DEBUG] Vote count:', voteCount, '/', requiredVotes);
```

## 📄 文件索引

| 文件路径 | 行数 | 描述 |
|----------|------|------|
| core/server.js | 162 | 主入口，Socket 连接管理 |
| core/handlers/index.js | 18 | Handler 统一导出 |
| core/handlers/room-handlers.js | 72 | 房间管理 |
| core/handlers/player-handlers.js | 231 | 玩家管理 |
| core/handlers/game-handlers.js | 119 | 游戏进程 |
| core/handlers/mission-handlers.js | 162 | 任务执行 |
| core/handlers/system-handlers.js | 113 | 系统事件 |
| core/game-logic.js | - | 游戏逻辑核心 |
| core/models/GameStore.js | - | 状态存储 |
| core/config/socket-events.js | - | 事件常量定义 |

## 🔙 回滚指南

如需回滚到重构前版本：

```bash
# 1. 停止服务器
# 2. 恢复备份文件
copy core\server.js.backup core\server.js

# 3. 删除 handlers 目录（可选）
rmdir /s /q core\handlers

# 4. 重启服务器
node core/server.js
```

---

*文档生成时间: 2026-04-18*
*版本: v2.0 - 模块化重构版*