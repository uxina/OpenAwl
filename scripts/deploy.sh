#!/bin/bash

# 阿瓦隆游戏部署脚本

set -e

echo "🚀 开始部署阿瓦隆游戏系统..."

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js未安装"
    exit 1
fi

echo "✅ Node.js版本: $(node --version)"

# 安装依赖
echo "📦 安装依赖..."
npm install
cd device && npm install && cd ..

# 创建必要目录
echo "📁 创建目录..."
mkdir -p logs
mkdir -p device/assets/audio

# 检查Python环境（语音功能）
if [ -d "$HOME/MegaTTS3/venv" ]; then
    echo "✅ Python虚拟环境已存在"
else
    echo "⚠️  Python虚拟环境不存在，语音功能可能无法使用"
    echo "   请运行: python3 -m venv ~/MegaTTS3/venv"
fi

echo ""
echo "✅ 部署完成！"
echo ""
echo "启动命令:"
echo "  npm start          # 启动游戏服务器"
echo "  npm run voice      # 启动语音主控"
echo "  npm test           # 运行测试"
