# 项目文件清单

## 核心运行文件（必需）- 8个文件

### 主项目
| 序号 | 文件路径 | 说明 | 大小(约) |
|------|----------|------|----------|
| 1 | `package.json` | 项目配置和依赖 | 1KB |
| 2 | `server.js` | 入口文件 | 0.5KB |
| 3 | `core/server.js` | 主服务器 | 12KB |
| 4 | `core/game-logic.js` | 游戏逻辑核心 | 10KB |
| 5 | `core/public/index.html` | 主控端页面 | 8KB |
| 6 | `core/public/player.html` | 玩家端页面 | 10KB |

### 小计：6个文件，约 42KB

---

## 完整功能文件（含语音）- 额外 6 个文件

### 语音设备模块
| 序号 | 文件路径 | 说明 | 大小(约) |
|------|----------|------|----------|
| 7 | `device/package.json` | 设备模块配置 | 0.5KB |
| 8 | `device/src/index.js` | 设备入口 | 4KB |
| 9 | `device/src/audio/tts-factory.js` | TTS工厂 | 0.5KB |
| 10 | `device/src/audio/melotts-tts.js` | MeloTTS引擎 | 3KB |
| 11 | `device/src/core/voice-manager.js` | 语音管理器 | 2KB |
| 12 | `device/config/voice-config.js` | 语音配置 | 1KB |

### 小计：6个文件，约 11KB

---

## 测试文件（开发/CI用）- 4个文件

| 序号 | 文件路径 | 说明 | 大小(约) |
|------|----------|------|----------|
| 13 | `playwright.config.js` | Playwright配置 | 1KB |
| 14 | `tests/e2e/full-game-5players.spec.js` | E2E测试 | 8KB |
| 15 | `tests/unit/game-logic.test.js` | 单元测试 | 5KB |
| 16 | `tests/run-tests.js` | 测试运行器 | 1KB |

### 小计：4个文件，约 15KB

---

## 文档和脚本 - 6个文件

| 序号 | 文件路径 | 说明 | 大小(约) |
|------|----------|------|----------|
| 17 | `README.md` | 项目说明 | 2KB |
| 18 | `PROJECT_STRUCTURE.md` | 项目结构文档 | 5KB |
| 19 | `FILE_MANIFEST.md` | 本文件 | 3KB |
| 20 | `docs/rules.md` | 游戏规则 | 3KB |
| 21 | `docs/deploy.md` | 部署指南 | 2KB |
| 22 | `scripts/deploy.sh` | 部署脚本 | 1KB |
| 23 | `voice/scripts/generate-audio.js` | 音频生成 | 2KB |

### 小计：7个文件，约 18KB

---

## 总计

| 类别 | 文件数 | 大小(约) | 用途 |
|------|--------|----------|------|
| **核心运行** | 6 | 42KB | 必需 |
| **语音功能** | 6 | 11KB | 可选 |
| **测试** | 4 | 15KB | 开发 |
| **文档脚本** | 7 | 18KB | 辅助 |
| **总计** | **23** | **86KB** | - |

---

## 最小发布包（仅游戏功能）

如果只需要游戏功能，不需要语音：

```
optimized/
├── package.json
├── server.js
├── core/
│   ├── server.js
│   ├── game-logic.js
│   └── public/
│       ├── index.html
│       └── player.html
└── README.md
```

**共 7 个文件，约 45KB**（不含 node_modules）

---

## 完整发布包（游戏 + 语音）

```
optimized/
├── package.json
├── server.js
├── core/
│   ├── server.js
│   ├── game-logic.js
│   └── public/
│       ├── index.html
│       └── player.html
├── device/
│   ├── package.json
│   ├── config/voice-config.js
│   └── src/
│       ├── index.js
│       ├── audio/
│       │   ├── tts-factory.js
│       │   └── melotts-tts.js
│       └── core/
│           └── voice-manager.js
├── docs/
│   ├── rules.md
│   └── deploy.md
├── scripts/
│   └── deploy.sh
└── README.md
```

**共 18 个文件，约 75KB**（不含 node_modules 和音频资产）

---

## 安装依赖

### 核心依赖
```bash
cd optimized
npm install
```

生成：
- `node_modules/` (~50MB)
- `package-lock.json`

### 语音模块依赖（可选）
```bash
cd device
npm install
```

生成：
- `device/node_modules/` (~5MB)

---

## 快速验证

```bash
# 1. 安装依赖
npm install

# 2. 运行测试
npm test

# 3. 启动服务器
npm start

# 4. 运行E2E测试
npx playwright test
```

---

## 与原项目对比

| 项目 | 原项目 | 优化后 | 精简率 |
|------|--------|--------|--------|
| 核心文件数 | 50+ | 6 | 88% |
| 总文件数 | 200+ | 23 | 88% |
| 代码行数 | 3000+ | 1500 | 50% |
| 目录层级 | 5+层 | 3层 | 40% |
