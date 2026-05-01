# 部署指南

## 系统要求

- Node.js >= 18.0.0
- Python 3.10+（语音功能需要）
- Orange Pi 5 Ultra 或类似ARM设备
- 蓝牙音箱

## 快速部署

### 1. 安装Node.js依赖

```bash
cd optimized
npm install
cd device && npm install
cd ..
```

### 2. 配置Python环境（语音功能）

```bash
# 创建虚拟环境
python3 -m venv ~/MegaTTS3/venv
source ~/MegaTTS3/venv/bin/activate

# 安装依赖
pip install melotts
```

### 3. 生成语音资产

```bash
npm run voice:build
```

### 4. 启动服务

```bash
# 启动游戏服务器
npm start

# 或者分别启动
cd core && node server.js
```

## 生产环境部署

### 使用PM2

```bash
# 安装PM2
npm install -g pm2

# 启动
pm2 start core/server.js --name avalon-game
pm2 start device/src/index.js --name avalon-voice

# 保存配置
pm2 save
pm2 startup
```

### 系统服务

创建 `/etc/systemd/system/avalon-game.service`:

```ini
[Unit]
Description=Avalon Game Server
After=network.target

[Service]
Type=simple
User=orangepi
WorkingDirectory=/home/orangepi/games/zy/optimized
ExecStart=/usr/bin/node core/server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

启用服务：

```bash
sudo systemctl enable avalon-game
sudo systemctl start avalon-game
```

## 目录结构

```
optimized/
├── core/           # 核心游戏服务
├── device/         # 语音主控设备
├── voice/          # 语音资产
├── tests/          # 测试
├── docs/           # 文档
└── scripts/        # 部署脚本
```

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| PORT | 服务器端口 | 3000 |
| SERVER_URL | 服务器地址 | http://localhost:3000 |
| TTS_ENGINE | TTS引擎 | melotts |
| ASR_ENGINE | ASR引擎 | sherpa-onnx |
