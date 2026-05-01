# Avalon Server 维护指南

> 本文档为维护人员提供代码维护、调试和扩展的实用指南。

## 🚀 快速开始

### 启动服务器

```bash
cd core
node server.js
```

服务器默认运行在 `http://localhost:3000`

### 运行测试

```bash
# 检查语法
node -c server.js

# 检查 handlers
node handlers/index.js
```

## 🔍 常见问题排查

### 1. 玩家无法加入房间

**排查步骤**:
1. 检查房间是否已满 (`configuredPlayerCount`)
2. 检查玩家是否已离线但未清理
3. 查看 `gameStore.offlinePlayers` 状态

```javascript
// 在 server.js 中添加调试
console.log('Room players:', game.players.length);
console.log('Offline players:', Array.from(offlinePlayers));
```

### 2. 投票事件不生效

**排查步骤**:
1. 确认客户端和服务端事件名匹配
2. 检查 `socket-events.js` 中的常量定义
3. 验证 callback 是否正确调用

```javascript
// 常见错误：事件名不匹配
// 客户端发送: 'vote-team'
// 服务器监听: 'VOTE_TEAM' (实际是 'vote-team')
```

### 3. 游戏阶段推进异常

**排查步骤**:
1. 检查 `game-phases-changed` 事件是否正确发送
2. 验证 `game.checkGameEnd()` 返回值
3. 查看 `missionResults` 数组状态

### 4. 断线重连失败

**排查步骤**:
1. 检查 `gameStore.playerSockets` 映射
2. 确认 `socket.id` 与 `playerId` 关联正确
3. 验证离线玩家标记是否正确清除

## 📊 监控和日志

### 关键日志点

| 位置 | 日志内容 | 重要性 |
|------|----------|--------|
| server.js:94 | `[Socket] Client connected` | 高 |
| player-handlers.js | `[Socket] Player joined` | 高 |
| mission-handlers.js | `[Socket] Mission vote received` | 高 |
| system-handlers.js | `[Socket] Player disconnected` | 中 |

### 性能监控

```javascript
// /health 端点返回
{
  status: 'healthy',
  uptime: seconds,
  memory: {
    heapUsed: bytes,
    heapTotal: bytes,
    external: bytes,
    rss: bytes
  }
}
```

## 🔧 代码修改 checklist

修改代码时请确保：

- [ ] 事件名称在 `socket-events.js` 中统一定义
- [ ] 新增 handler 在 `handlers/index.js` 中导出
- [ ] 新增事件在 `server.js` 的 `io.on('connection')` 中注册
- [ ] 添加适当的错误处理和日志
- [ ] 更新本文档的相关章节

## 📈 扩展游戏功能

### 添加新角色

1. **game-logic.js**: 在 `assignRoles()` 中添加角色逻辑

```javascript
// 示例：添加新角色
const newRole = {
  name: '新角色',
  side: 'good' | 'evil',
  abilities: []
};
```

2. **客户端**: 更新角色显示逻辑

### 添加新游戏阶段

1. **config/socket-events.js**: 在 `GamePhases` 中添加

```javascript
const GamePhases = {
  // ... 现有阶段
  NEW_PHASE: 'new-phase'
};
```

2. **game-logic.js**: 实现阶段转换逻辑

3. **handlers/**: 添加新阶段的处理函数

### 添加新投票类型

1. **mission-handlers.js**: 添加投票处理函数

```javascript
function handleNewVote(socket, io, data, callback) {
  const { roomId, vote } = data;
  // 处理投票逻辑
}
```

2. **server.js**: 注册新事件

```javascript
socket.on(ClientToServer.NEW_VOTE, (data, callback) => {
  handlers.handleNewVote(socket, io, data, callback);
});
```

## 🧪 测试要点

### 单元测试

- 测试 `game-logic.js` 的游戏逻辑
- 测试 `handlers/` 的各个函数
- 测试 `GameStore` 的状态管理

### 集成测试

- 测试 Socket 连接和事件流
- 测试房间创建和玩家加入流程
- 测试完整的游戏流程

### 压力测试

- 测试多房间并发
- 测试断线重连
- 测试大量玩家同时操作

## 📁 相关文档

- [ARCHITECTURE.md](./ARCHITECTURE.md) - 系统架构文档
- [.trae/bug-memory/index.json](../.trae/bug-memory/index.json) - Bug 追踪记录

---

*维护文档更新时间: 2026-04-18*