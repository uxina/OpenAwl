# 阿瓦隆·智能主持人游戏系统 v2.0

基于WebSocket的实时阿瓦隆游戏系统，支持语音控制，完全替代真人主持人。

## 快速开始

```bash
# 安装依赖
npm install

# 启动游戏服务器
npm start

# 访问 http://localhost:3000
```

## 项目结构

```
optimized/
├── core/               # 核心游戏功能
│   ├── server.js       # 主服务器
│   ├── game-logic.js   # 游戏逻辑
│   └── public/         # 前端页面
│       ├── index.html      # 主控端
│       ├── player.html     # 玩家端
│       └── voice-panel.html # 语音面板
├── device/             # 设备控制（语音主控）
│   ├── src/
│   │   ├── audio/      # TTS/ASR引擎
│   │   ├── core/       # 语音管理核心
│   │   └── connectors/ # 连接模块
│   └── config/
├── voice/              # 语音资产
│   ├── assets/         # 预生成音频文件
│   └── scripts/        # 音频生成脚本
├── tests/              # 测试
│   ├── unit/           # 单元测试
│   └── e2e/            # 端到端测试
├── docs/               # 文档
└── scripts/            # 部署脚本
```

## 功能特点

- 🎮 **完全替代主持人**：自动处理游戏流程
- 📱 **手机网页版**：无需安装APP
- 🔊 **语音控制**：支持语音命令控制游戏
- 🔒 **隐私保护**：角色信息私密发送
- ⚡ **实时通信**：WebSocket低延迟

## 文档

- [游戏规则](docs/rules.md)
- [部署指南](docs/deploy.md)
- [API文档](docs/api.md)
- [语音指令](docs/voice-commands.md)

## 许可证

MIT License
