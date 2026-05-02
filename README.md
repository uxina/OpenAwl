# 阿瓦隆·智能主持人游戏系统 v2.0

> 开源「阿瓦隆・智能主持人」系统，完全替代真人主持人，支持 5-10 人通过手机网页参与游戏。项目包含实时游戏服务器（Node.js + Socket.IO）、语音控制面板（14 阶段智能播报决策表）、离线语音助手（Orange Pi + Sherpa-ONNX + MeloTTS），以及完整的自动化测试框架。

---

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
│       ── voice-panel.html # 语音面板
── device/             # 设备控制（语音主控）
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

## 文档导航

### 核心文档

| 文档 | 说明 |
|------|------|
|  [游戏规则](docs/rules.md) | 阿瓦隆游戏规则与角色能力说明 |
| 🏗️ [系统架构](docs/ARCHITECTURE.md) | 服务器架构、Socket 事件流、Handler 模块详解 |
| 🔧 [维护指南](docs/MAINTENANCE.md) | 常见问题排查、调试技巧、扩展开发指南 |
| 🚀 [部署指南](docs/deploy.md) | 系统要求与快速部署步骤 |
| 📊 [测试报告](docs/TEST-REPORT.md) | 测试覆盖率与重构前后对比 |

### 语音相关文档

| 文档 | 说明 |
|------|------|
| 🎙️ [语音面板操作指南](docs/VOICE_PANEL_OPERATION_GUIDE.md) | 语音面板使用场景、阶段对应关系 |
| 📋 [语音面板逻辑](docs/VOICE_PANEL_LOGIC.md) | 语音面板核心逻辑与决策表 |
|  [语音面板重构方案](docs/VOICE_PANEL_REFACTOR_PLAN.md) | 语音面板重构计划与实施步骤 |
| 🌙 [夜间语音分析](docs/NIGHT_VOICES_ANALYSIS.md) | 夜间阶段语音流程分析 |
| 📝 [夜间语音完整文本](docs/NIGHT_VOICE_TEXTS_COMPLETE.md) | 夜间阶段所有语音文本内容 |
|  [语音资产清单](docs/VOICE_ASSET_INVENTORY.md) | 所有语音文件清单与状态 |
| 📄 [语音生成清单](docs/VOICE_GENERATION_LIST.md) | 需要生成的语音文件列表 |
|  [需要录音的语音](docs/VOICE_RECORDING_NEEDED.md) | 需要人工录音的语音文件 |
| ❌ [缺失语音报告](docs/MISSING_VOICES_REPORT.md) | 缺失的语音文件及原因分析 |

### 配置文件

| 文件 | 说明 |
|------|------|
| ⚙️ [FactoryTTS 配置](docs/FACTORYTTS_CONFIG.json) | FactoryTTS 语音引擎配置 |

## 许可证

MIT License
