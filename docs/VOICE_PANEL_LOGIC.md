# 语音面板推进逻辑文档

## 概述

语音面板是一个用于阿瓦隆游戏主持人的快捷控制界面，通过预录制的音频指令来推进游戏流程。它既可以独立使用，也可以与游戏服务器联动。

---

## 文件位置

- **语音面板HTML**: `public/voice-panel.html`
- **语音管理器**: `device/src/core/voice-manager.js`
- **语音桥接客户端**: `device/src/core/voice-bridge-client.js`
- **语音播报器**: `device/src/audio/voice-announcer.js`
- **配置文件**: `device/config/voice-config.js`

---

## 核心组件关系

```
┌─────────────────────────────────────────────────────────────────┐
│                      语音面板架构                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐      ┌──────────────────┐                │
│  │  voice-panel.html │      │  游戏服务器       │                │
│  │  (前端控制面板)   │◄────►│  (server.js)     │                │
│  └────────┬─────────┘      └──────────────────┘                │
│           │                                                     │
│           │ Socket.IO 事件                                      │
│           ▼                                                     │
│  ┌──────────────────┐                                          │
│  │ voice-bridge-    │  文件桥接: /tmp/voice_commands.json      │
│  │ client.js        │                                          │
│  └────────┬─────────┘                                          │
│           │                                                     │
│           ▼                                                     │
│  ┌──────────────────┐      ┌──────────────────┐                │
│  │ voice-manager.js │◄────►│ voice-announcer.js              │
│  │ (语音管理核心)   │      │ (音频片段拼接)   │                │
│  └────────┬─────────┘      └──────────────────┘                │
│           │                                                     │
│           ▼                                                     │
│  ┌──────────────────┐      ┌──────────────────┐                │
│  │ TTS引擎          │      │ ASR引擎          │                │
│  │ (MeloTTS)        │      │ (faster-whisper) │                │
│  └──────────────────┘      └──────────────────┘                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 游戏阶段定义

```javascript
const GAME_PHASES = {
    WAITING: 'waiting',                 // 等待创建房间
    OPENING: 'opening',                 // 开场阶段
    ROLE_ASSIGN: 'role-assign',         // 身份分发
    NIGHT: 'night',                     // 夜间行动
    DAY: 'day',                         // 白天开始
    TEAM_BUILDING: 'team-building',     // 队长组队
    DISCUSSION: 'discussion',           // 讨论阶段
    VOTING: 'voting',                   // 投票阶段
    MISSION: 'mission',                 // 任务执行
    MISSION_RESULT: 'mission-result',   // 任务结果
    ASSASSINATION: 'assassination',     // 刺杀阶段
    ENDED: 'ended'                      // 游戏结束
};
```

---

## 推进逻辑详解

### 1. 智能推进决策表 (SMART_ANNOUNCEMENTS)

语音面板的核心推进逻辑由 `SMART_ANNOUNCEMENTS` 对象定义，它是一个状态机，根据当前游戏状态决定下一步该播报什么。

#### 1.1 等待阶段 → 开场阶段
```javascript
[GAME_PHASES.WAITING]: {
    check: () => !gameState.roomId,
    announce: () => createRoom(),
    hint: '点击"创建房间"开始游戏'
}
```
**触发条件**: 没有房间号
**执行动作**: 创建房间
**提示信息**: 点击"创建房间"开始游戏

#### 1.2 开场阶段 → 身份分发
```javascript
[GAME_PHASES.OPENING]: {
    check: () => gameState.phase === GAME_PHASES.OPENING,
    announce: () => {
        playAudio('opening/CMD-003.mp3', '欢迎词');
        gameState.phase = GAME_PHASES.ROLE_ASSIGN;
    },
    hint: '播报欢迎词，然后分发身份'
}
```
**触发条件**: 当前阶段为 OPENING
**执行动作**: 
1. 播放欢迎词音频 (CMD-003.mp3)
2. 自动切换到 ROLE_ASSIGN 阶段
**音频文件**: `opening/CMD-003.mp3`

#### 1.3 身份分发 → 夜间行动
```javascript
[GAME_PHASES.ROLE_ASSIGN]: {
    check: () => gameState.phase === GAME_PHASES.ROLE_ASSIGN,
    announce: () => {
        playAudio('opening/CMD-009.mp3', '分发身份');
        gameState.phase = GAME_PHASES.NIGHT;
        gameState.nightStep = 0;
    },
    hint: '分发身份牌给玩家，然后进入夜间行动'
}
```
**触发条件**: 当前阶段为 ROLE_ASSIGN
**执行动作**:
1. 播放分发身份音频 (CMD-009.mp3)
2. 自动切换到 NIGHT 阶段
3. 重置夜间步骤索引为 0
**音频文件**: `opening/CMD-009.mp3`

#### 1.4 夜间行动阶段
```javascript
[GAME_PHASES.NIGHT]: {
    check: () => gameState.phase === GAME_PHASES.NIGHT,
    announce: () => {
        const step = NIGHT_STEPS[gameState.nightStep];
        if (step) {
            playAudio(step.audio, step.name);
            gameState.nightStep++;
            if (gameState.nightStep >= NIGHT_STEPS.length) {
                gameState.phase = GAME_PHASES.DAY;
                gameState.nightStep = 0;
            }
        }
    },
    hint: () => {
        const step = NIGHT_STEPS[gameState.nightStep];
        return step ? `播报"${step.name}"，然后"${step.next}"` : '夜间行动完成';
    }
}
```

**夜间行动步骤序列** (NIGHT_STEPS):
| 步骤索引 | 名称 | 音频文件 | 下一步 |
|---------|------|----------|--------|
| 0 | 闭眼 | opening/CMD-011.mp3 | 坏人睁眼 |
| 1 | 坏人睁眼 | night/CMD-044.mp3 | 坏人闭眼 |
| 2 | 坏人闭眼 | night/CMD-045.mp3 | 梅林睁眼 |
| 3 | 梅林睁眼 | night/CMD-050.mp3 | 梅林闭眼 |
| 4 | 梅林闭眼 | night/CMD-051.mp3 | 派西睁眼 |
| 5 | 派西睁眼 | night/CMD-053.mp3 | 派西闭眼 |
| 6 | 派西闭眼 | night/CMD-054.mp3 | 天亮了 |
| 7 | 天亮了 | night/CMD-022.mp3 | 白天开始 |

**推进逻辑**:
1. 每次点击"智能下一环节"，播报当前步骤的音频
2. 步骤索引 +1
3. 如果步骤索引 >= 8，自动切换到 DAY 阶段

#### 1.5 白天开始 → 队长组队
```javascript
[GAME_PHASES.DAY]: {
    check: () => gameState.phase === GAME_PHASES.DAY,
    announce: () => {
        const queue = [
            { path: 'night/CMD-022.mp3', name: '天亮了' },
            { path: 'segments/SEG-COMMA.mp3', name: '停顿' },
            { path: 'numbers/NUM-' + gameState.round + '.mp3', name: `第${gameState.round}轮` }
        ];
        playAudioQueue(queue);
        gameState.phase = GAME_PHASES.TEAM_BUILDING;
    },
    hint: '天亮了，开始第N轮'
}
```
**触发条件**: 当前阶段为 DAY
**执行动作**:
1. 拼接播放音频序列：天亮了 → 停顿 → 第N轮
2. 自动切换到 TEAM_BUILDING 阶段
**音频序列**: 
- `night/CMD-022.mp3` (天亮了)
- `segments/SEG-COMMA.mp3` (停顿)
- `numbers/NUM-{round}.mp3` (第N轮，动态数字)

#### 1.6 队长组队 → 讨论阶段
```javascript
[GAME_PHASES.TEAM_BUILDING]: {
    check: () => gameState.phase === GAME_PHASES.TEAM_BUILDING,
    announce: () => {
        const config = missionConfig[gameState.playerCount] || missionConfig[5];
        const requiredSize = config[gameState.round - 1] || 2;
        const leaderNum = (gameState.currentLeaderIndex % gameState.playerCount) + 1;
        
        const queue = [
            { path: 'day/CMD-042.mp3', name: '任命队长' },
            ...numberToAudioQueue(leaderNum),
            { path: 'segments/SEG-PERSON.mp3', name: '人' },
            { path: 'segments/SEG-COMMA.mp3', name: '停顿' },
            { path: 'day/CMD-044.mp3', name: '选择队员' },
            ...numberToAudioQueue(requiredSize),
            { path: 'segments/SEG-PERSON.mp3', name: '人' }
        ];
        playAudioQueue(queue);
        gameState.phase = GAME_PHASES.DISCUSSION;
    },
    hint: '任命队长，宣布队伍人数'
}
```
**触发条件**: 当前阶段为 TEAM_BUILDING
**执行动作**:
1. 获取任务配置（根据玩家人数）
2. 计算当前队长编号（轮询制）
3. 获取本轮需要的队伍人数
4. 拼接播放音频序列：任命队长 → {队长编号} → 人 → 停顿 → 选择队员 → {队伍人数} → 人
5. 自动切换到 DISCUSSION 阶段

**音频序列**:
- `day/CMD-042.mp3` (任命队长)
- `numbers/NUM-{leaderNum}.mp3` (队长编号)
- `segments/SEG-PERSON.mp3` (人)
- `segments/SEG-COMMA.mp3` (停顿)
- `day/CMD-044.mp3` (选择队员)
- `numbers/NUM-{requiredSize}.mp3` (队伍人数)
- `segments/SEG-PERSON.mp3` (人)

#### 1.7 讨论阶段 → 投票阶段
```javascript
[GAME_PHASES.DISCUSSION]: {
    check: () => gameState.phase === GAME_PHASES.DISCUSSION && !gameState.isVoting,
    announce: () => playAudio('day/CMD-048.mp3', '讨论时间'),
    hint: '给玩家时间讨论组队方案'
}
```
**触发条件**: 当前阶段为 DISCUSSION 且不在投票中
**执行动作**: 播放讨论时间音频
**音频文件**: `day/CMD-048.mp3`

#### 1.8 投票阶段
```javascript
[GAME_PHASES.VOTING]: {
    check: () => gameState.phase === GAME_PHASES.VOTING || gameState.isVoting,
    announce: () => playAudio('voting/CMD-071.mp3', '投票开始'),
    hint: '玩家投票是否同意该队伍'
}
```
**触发条件**: 当前阶段为 VOTING 或在投票中
**执行动作**: 播放投票开始音频
**音频文件**: `voting/CMD-071.mp3`

#### 1.9 投票通过
```javascript
VOTE_PASSED: {
    check: () => gameState.isVoting && gameState.voteResult === 'passed',
    announce: () => {
        playAudio('voting/CMD-074.mp3', '投票通过');
        gameState.isVoting = false;
        gameState.phase = GAME_PHASES.MISSION;
        gameState.consecutiveRejections = 0;
    },
    hint: '队伍通过，进入任务执行'
}
```
**触发条件**: 在投票中且投票结果为 passed
**执行动作**:
1. 播放投票通过音频
2. 清除投票状态
3. 切换到 MISSION 阶段
4. 重置连续否决次数
**音频文件**: `voting/CMD-074.mp3`

#### 1.10 投票否决
```javascript
VOTE_REJECTED: {
    check: () => gameState.isVoting && gameState.voteResult === 'rejected',
    announce: () => {
        playAudio('voting/CMD-075.mp3', '投票否决');
        gameState.isVoting = false;
        gameState.consecutiveRejections++;
        
        if (gameState.consecutiveRejections >= 5) {
            gameState.phase = GAME_PHASES.ENDED;
            gameState.badWins = 3;
        } else {
            gameState.currentLeaderIndex++;
            gameState.phase = GAME_PHASES.TEAM_BUILDING;
        }
    },
    hint: '队伍被否决，换下一个队长'
}
```
**触发条件**: 在投票中且投票结果为 rejected
**执行动作**:
1. 播放投票否决音频
2. 清除投票状态
3. 连续否决次数 +1
4. 如果连续否决 >= 5 次，坏人直接胜利
5. 否则，队长索引 +1（换下一个队长），回到 TEAM_BUILDING 阶段
**音频文件**: `voting/CMD-075.mp3`

#### 1.11 任务执行阶段
```javascript
[GAME_PHASES.MISSION]: {
    check: () => gameState.phase === GAME_PHASES.MISSION && !gameState.isMission,
    announce: () => {
        playAudio('mission/CMD-091.mp3', '任务开始');
        gameState.isMission = true;
    },
    hint: '队员执行任务，选择成功或失败'
}
```
**触发条件**: 当前阶段为 MISSION 且不在任务执行中
**执行动作**:
1. 播放任务开始音频
2. 设置任务执行状态为 true
**音频文件**: `mission/CMD-091.mp3`

#### 1.12 任务成功
```javascript
MISSION_SUCCESS: {
    check: () => gameState.isMission && gameState.lastMissionSuccess === true,
    announce: () => {
        playAudio('mission/CMD-094.mp3', '任务成功');
        gameState.isMission = false;
        gameState.missionResults.push(true);
        gameState.goodWins++;
        checkGameEnd();
    },
    hint: '任务成功，好人+1分'
}
```
**触发条件**: 在任务执行中且任务结果为成功
**执行动作**:
1. 播放任务成功音频
2. 清除任务执行状态
3. 记录任务结果
4. 好人胜利次数 +1
5. 检查游戏是否结束
**音频文件**: `mission/CMD-094.mp3`

#### 1.13 任务失败
```javascript
MISSION_FAIL: {
    check: () => gameState.isMission && gameState.lastMissionSuccess === false,
    announce: () => {
        playAudio('mission/CMD-095.mp3', '任务失败');
        gameState.isMission = false;
        gameState.missionResults.push(false);
        gameState.badWins++;
        checkGameEnd();
    },
    hint: '任务失败，坏人+1分'
}
```
**触发条件**: 在任务执行中且任务结果为失败
**执行动作**:
1. 播放任务失败音频
2. 清除任务执行状态
3. 记录任务结果
4. 坏人胜利次数 +1
5. 检查游戏是否结束
**音频文件**: `mission/CMD-095.mp3`

#### 1.14 刺杀阶段
```javascript
[GAME_PHASES.ASSASSINATION]: {
    check: () => gameState.phase === GAME_PHASES.ASSASSINATION,
    announce: () => playAudio('assassination/CMD-111.mp3', '刺杀阶段'),
    hint: '坏人讨论刺杀梅林'
}
```
**触发条件**: 当前阶段为 ASSASSINATION
**执行动作**: 播放刺杀阶段音频
**音频文件**: `assassination/CMD-111.mp3`

---

## 关键函数说明

### 1. 智能推进主函数
```javascript
function smartNextStep() {
    // 遍历 SMART_ANNOUNCEMENTS 中的所有规则
    for (const [key, config] of Object.entries(SMART_ANNOUNCEMENTS)) {
        // 检查当前状态是否匹配规则
        if (config.check()) {
            // 执行对应的播报动作
            config.announce();
            // 更新提示信息
            updateHint(config.hint);
            return;
        }
    }
}
```

### 2. 音频播放函数
```javascript
function playAudio(audioPath, name) {
    const fullPath = `${AUDIO_BASE_PATH}/${audioPath}`;
    // 发送播放请求到语音桥接器
    socket.emit('play-audio', { path: fullPath, name });
    // 更新UI显示
    updateNowPlaying(name, fullPath);
}
```

### 3. 音频队列播放
```javascript
function playAudioQueue(queue) {
    // 将音频队列发送到语音桥接器顺序播放
    socket.emit('play-audio-queue', { queue });
}
```

### 4. 数字转音频队列
```javascript
function numberToAudioQueue(number) {
    const num = parseInt(number);
    if (num >= 0 && num <= 10) {
        return [{ path: `numbers/NUM-${num}.mp3`, name: `${num}` }];
    }
    // 大于10的数字逐位播报
    const digits = num.toString().split('');
    return digits.map(d => ({ 
        path: `numbers/NUM-${d}.mp3`, 
        name: d 
    }));
}
```

### 5. 游戏结束检查
```javascript
function checkGameEnd() {
    // 好人胜利条件：3次任务成功
    if (gameState.goodWins >= 3) {
        gameState.phase = GAME_PHASES.ASSASSINATION;
        return;
    }
    
    // 坏人胜利条件：3次任务失败
    if (gameState.badWins >= 3) {
        gameState.phase = GAME_PHASES.ENDED;
        playAudio('ending/CMD-127.mp3', '坏人胜利');
        return;
    }
    
    // 继续下一轮
    gameState.round++;
    gameState.currentLeaderIndex++;
    gameState.phase = GAME_PHASES.TEAM_BUILDING;
}
```

---

## 与游戏服务器的联动

### 1. 状态同步事件

语音面板通过 Socket.IO 与游戏服务器通信：

```javascript
// 监听游戏状态更新
socket.on('game-state-update', (state) => {
    gameState.phase = state.phase;
    gameState.round = state.currentRound;
    gameState.playerCount = state.players.length;
    gameState.currentLeaderIndex = state.currentLeaderIndex;
    updateUI();
});

// 监听队长变更
socket.on('leader-changed', (data) => {
    gameState.currentLeaderIndex = data.leaderIndex;
    playCurrentLeader();
});

// 监听投票结果
socket.on('vote-result', (result) => {
    gameState.voteResult = result.passed ? 'passed' : 'rejected';
    gameState.isVoting = false;
});

// 监听任务结果
socket.on('mission-result', (result) => {
    gameState.lastMissionSuccess = result.success;
    gameState.isMission = false;
});
```

### 2. 发送控制命令

```javascript
// 推进到下一阶段
function nextPhase() {
    socket.emit('next-phase', { roomId: gameState.roomId });
}

// 提交投票结果
function submitVoteResult(passed) {
    socket.emit('vote-result', { 
        roomId: gameState.roomId, 
        passed 
    });
}

// 提交任务结果
function submitMissionResult(success) {
    socket.emit('mission-result', { 
        roomId: gameState.roomId, 
        success 
    });
}
```

---

## 任务配置

```javascript
const missionConfig = {
    5:  [2, 3, 2, 3, 3],  // 5人: 第1轮2人, 第2轮3人...
    6:  [2, 3, 4, 3, 4],  // 6人
    7:  [2, 3, 3, 4, 4],  // 7人
    8:  [3, 4, 4, 5, 5],  // 8人
    9:  [3, 4, 4, 5, 5],  // 9人
    10: [3, 4, 4, 5, 5]   // 10人
};
```

---

## 音频文件目录结构

```
device/assets/audio/commands/
├── opening/              # 开场阶段
│   ├── CMD-003.mp3      # 欢迎词
│   ├── CMD-009.mp3      # 分发身份
│   └── CMD-011.mp3      # 闭眼
├── night/                # 夜间行动
│   ├── CMD-022.mp3      # 天亮了
│   ├── CMD-044.mp3      # 坏人睁眼
│   ├── CMD-045.mp3      # 坏人闭眼
│   ├── CMD-050.mp3      # 梅林睁眼
│   ├── CMD-051.mp3      # 梅林闭眼
│   ├── CMD-053.mp3      # 派西睁眼
│   └── CMD-054.mp3      # 派西闭眼
├── day/                  # 白天阶段
│   ├── CMD-041.mp3      # 白天开始
│   ├── CMD-042.mp3      # 任命队长
│   ├── CMD-044.mp3      # 选择队员
│   └── CMD-048.mp3      # 讨论时间
├── voting/               # 投票阶段
│   ├── CMD-071.mp3      # 投票开始
│   ├── CMD-074.mp3      # 投票通过
│   └── CMD-075.mp3      # 投票否决
├── mission/              # 任务阶段
│   ├── CMD-091.mp3      # 任务开始
│   ├── CMD-094.mp3      # 任务成功
│   └── CMD-095.mp3      # 任务失败
├── assassination/        # 刺杀阶段
│   └── CMD-111.mp3      # 刺杀阶段
├── ending/               # 游戏结束
│   ├── CMD-126.mp3      # 好人胜利
│   └── CMD-127.mp3      # 坏人胜利
├── numbers/              # 数字音频
│   ├── NUM-0.mp3
│   ├── NUM-1.mp3
│   └── ...
└── segments/             # 音频片段
    ├── SEG-ROOM-CREATED.mp3
    ├── SEG-PERSON.mp3
    ├── SEG-ROOM.mp3
    └── SEG-COMMA.mp3
```

---

## 常见问题排查

### 问题1: 点击"智能下一环节"没有反应
**检查点**:
1. 检查 `gameState.phase` 当前值
2. 检查 SMART_ANNOUNCEMENTS 中对应阶段的 `check()` 条件
3. 检查音频文件是否存在

### 问题2: 音频播放顺序错误
**检查点**:
1. 检查 `playAudioQueue()` 函数是否正确拼接队列
2. 检查语音桥接器是否正确按顺序播放
3. 检查音频文件路径是否正确

### 问题3: 队长编号不正确
**检查点**:
1. 检查 `gameState.currentLeaderIndex` 是否正确更新
2. 检查 `numberToAudioQueue()` 是否正确转换数字
3. 检查取模运算 `(gameState.currentLeaderIndex % gameState.playerCount) + 1`

### 问题4: 与游戏服务器不同步
**检查点**:
1. 检查 Socket.IO 连接状态
2. 检查是否正确监听 `game-state-update` 事件
3. 检查是否正确发送控制命令到服务器

---

## 扩展开发指南

### 添加新的游戏阶段

1. 在 `GAME_PHASES` 中添加新阶段
2. 在 `SMART_ANNOUNCEMENTS` 中添加推进规则
3. 准备对应的音频文件
4. 更新 UI 显示

### 修改夜间行动顺序

1. 修改 `NIGHT_STEPS` 数组
2. 准备新的音频文件
3. 更新步骤提示信息

### 添加自定义音频指令

1. 在 HTML 中添加新的按钮
2. 在 `playAudio()` 中调用新的音频路径
3. 确保音频文件存在于对应目录

---

## 总结

语音面板的推进逻辑基于状态机模式，通过 `SMART_ANNOUNCEMENTS` 定义了从游戏开始到结束的所有阶段和转换规则。每个阶段都有对应的检查条件、播报动作和提示信息，实现了自动化的游戏流程推进。
