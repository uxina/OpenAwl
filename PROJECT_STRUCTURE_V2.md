# 阿瓦隆游戏 - 项目目录结构 V2

## 📁 目录结构总览

```
optimized/
├── 📦 Docker 部署文件
│   ├── Dockerfile              # Docker 镜像构建文件
│   ├── .dockerignore           # Docker 忽略文件
│   └── build-docker-proxy.sh   # 构建脚本（带代理）
│
├── 🎯 核心应用 (core/)
│   ├── server.js               # 服务器入口（转发到 core/server.js）
│   ├── 📁 服务器逻辑 (core/)
│   │   ├── server.js           # 主服务器（Express + Socket.io）
│   │   └── game-logic.js       # 游戏逻辑
│   │
│   └── 📁 前端资源 (public/)
│       ├── 🏠 主控端
│       │   ├── index.html              # 主控页面（智能主持人）
│       │   ├── styles/
│       │   │   └── controller-ux.css   # 主控样式
│       │   └── js/
│       │       └── controller-ux.js    # 主控逻辑
│       │
│       ├── 🎮 玩家端
│       │   ├── player-modular.html     # 玩家页面（模块化）
│       │   ├── player.html             # 玩家页面（旧版）
│       │   └── js/
│       │       ├── main.js             # 玩家端主逻辑
│       │       └── modules/
│       │           ├── game-core.js    # 游戏核心
│       │           ├── ui-manager.js   # UI管理
│       │           ├── socket-handlers.js  # Socket事件
│       │           └── team-builder.js # 队伍组建
│       │
│       ├── 🎙️ 语音面板
│       │   ├── voice-panel-v2.html     # 语音面板 V2（推荐）
│       │   ├── voice-panel.html        # 语音面板 V1
│       │   └── js/
│       │       └── voice-panel-config.js   # 语音配置
│       │
│       ├── 🏛️ 大厅
│       │   └── lobby.html              # 游戏大厅
│       │
│       └── 🔊 语音资产 (audio/)
│           ├── commands/               # 游戏语音指令
│           │   ├── opening/            # 开场语音
│           │   ├── night/              # 夜间阶段
│           │   ├── day/                # 白天阶段
│           │   ├── voting/             # 投票阶段
│           │   ├── mission/            # 任务阶段
│           │   ├── assassination/      # 刺杀阶段
│           │   ├── ending/             # 结束阶段
│           │   ├── numbers/            # 数字语音
│           │   └── segments/           # 语音片段
│           ├── cache/                  # 缓存音频
│           └── prebuild/               # 预构建音频
│
├── 📱 设备控制 (device/)       # 蓝牙设备控制（可选）
│   └── assets/
│       └── audio/              # 设备端音频（副本）
│
├── 🧪 测试 (tests/)
│   └── e2e/
│       └── *.spec.js           # Playwright E2E 测试
│
├── 📚 文档 (docs/)
│   └── *.md                    # 项目文档
│
└── ⚙️ 配置文件
    ├── package.json            # Node.js 依赖
    ├── playwright.config.js    # Playwright 配置
    └── README.md               # 项目说明
```

## 🚀 功能模块说明

### 1. 主控端 (Host)
- **入口**: `/index.html`
- **功能**: 创建房间、控制游戏流程、查看游戏状态
- **特色**: 智能推进按钮、语音面板入口

### 2. 玩家端 (Player)
- **入口**: `/player-modular.html?roomId=XXXX`
- **功能**: 加入房间、查看角色、投票、执行任务
- **特色**: 模块化设计、断线重连

### 3. 语音面板 (Voice)
- **入口**: `/voice-panel-v2.html`
- **功能**: 语音播报、游戏流程控制
- **特色**: 预生成音频、支持数字拼接

### 4. 大厅 (Lobby)
- **入口**: `/lobby.html`
- **功能**: 房间列表、快速加入

## 🎵 语音资产说明

语音文件位于 `core/public/audio/commands/`，按游戏阶段分类：

| 目录 | 说明 | 示例 |
|------|------|------|
| `opening/` | 开场语音 | CMD-001.mp3 (开场致辞) |
| `night/` | 夜间阶段 | CMD-044.mp3 (坏人睁眼) |
| `day/` | 白天阶段 | CMD-062.mp3 (天亮了) |
| `voting/` | 投票阶段 | CMD-071.mp3 (投票开始) |
| `mission/` | 任务阶段 | CMD-101.mp3 (任务执行) |
| `assassination/` | 刺杀阶段 | CMD-111.mp3 (刺杀开始) |
| `ending/` | 结束阶段 | CMD-126.mp3 (好人获胜) |
| `numbers/` | 数字语音 | NUM-1.mp3 ~ NUM-10.mp3 |
| `segments/` | 语音片段 | SEG-ROOM.mp3 (房间号) |

## 🐳 Docker 部署

### 构建镜像
```bash
cd /home/orangepi/games/zy/optimized
sudo docker build -t avalon-game:2.1.0 .
```

### 运行容器
```bash
sudo docker run -d -p 3000:3000 --name avalon avalon-game:2.1.0
```

### 访问地址
- 主控端: http://localhost:3000
- 玩家端: http://localhost:3000/player-modular.html?roomId=1234
- 语音面板: http://localhost:3000/voice-panel-v2.html
- 大厅: http://localhost:3000/lobby.html

## 📦 发布文件清单

发布时只需以下文件/目录：

```
optimized/
├── Dockerfile
├── .dockerignore
├── package.json
├── server.js
├── core/
│   ├── server.js
│   ├── game-logic.js
│   └── public/           # 前端资源和语音资产
└── docs/                 # 可选：文档
```

总大小约 150MB（包含语音资产）
