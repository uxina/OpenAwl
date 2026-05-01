#!/bin/bash
# ============================================
# Docker 镜像构建脚本（使用代理从官方源构建）
# ============================================

# 代理配置（请根据实际情况修改）
PROXY_HOST="${DOCKER_PROXY_HOST:-<your-proxy-ip>}"
PROXY_PORT="${DOCKER_PROXY_PORT:-7890}"
PROXY_URL="http://${PROXY_HOST}:${PROXY_PORT}"

echo "=========================================="
echo "Docker 镜像构建脚本（代理模式）"
echo "代理: ${PROXY_URL}"
echo "源: Docker Hub 官方"
echo "=========================================="
echo ""

# 创建 Docker 配置目录
sudo mkdir -p /etc/docker

# 配置 Docker 守护进程使用代理
echo "配置 Docker 守护进程代理..."
sudo tee /etc/docker/daemon.json > /dev/null <<EOF
{
  "proxies": {
    "http-proxy": "${PROXY_URL}",
    "https-proxy": "${PROXY_URL}",
    "no-proxy": "localhost,127.0.0.1"
  }
}
EOF

# 同时配置 systemd 服务（某些系统需要）
if [ -d "/etc/systemd/system/docker.service.d" ]; then
    sudo tee /etc/systemd/system/docker.service.d/http-proxy.conf > /dev/null <<EOF
[Service]
Environment="HTTP_PROXY=${PROXY_URL}"
Environment="HTTPS_PROXY=${PROXY_URL}"
Environment="NO_PROXY=localhost,127.0.0.1"
EOF
    sudo systemctl daemon-reload
fi

echo "✅ Docker 代理配置完成"
echo ""

# 重启 Docker 服务
echo "重启 Docker 服务..."
sudo systemctl restart docker
sleep 3

if ! sudo systemctl is-active --quiet docker; then
    echo "❌ Docker 服务启动失败"
    exit 1
fi

echo "✅ Docker 服务已启动"
echo ""

# 设置环境变量（用于 docker build）
export HTTP_PROXY=${PROXY_URL}
export HTTPS_PROXY=${PROXY_URL}
export NO_PROXY=localhost,127.0.0.1

# 配置 Docker 客户端代理
mkdir -p ~/.docker
cat > ~/.docker/config.json <<EOF
{
  "proxies": {
    "default": {
      "httpProxy": "${PROXY_URL}",
      "httpsProxy": "${PROXY_URL}",
      "noProxy": "localhost,127.0.0.1"
    }
  }
}
EOF

# 进入项目目录
cd "$(dirname "$0")"

echo "=========================================="
echo "开始构建 Docker 镜像"
echo "=========================================="
echo ""

# 构建镜像（使用代理，从官方源拉取）
sudo -E docker build \
  --build-arg HTTP_PROXY=${PROXY_URL} \
  --build-arg HTTPS_PROXY=${PROXY_URL} \
  --build-arg NO_PROXY=localhost,127.0.0.1 \
  -t avalon-game:2.0.0 \
  .

# 检查构建结果
if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "✅ 镜像构建成功！"
    echo "=========================================="
    echo ""
    echo "镜像信息:"
    sudo docker images | grep avalon-game
    echo ""
    echo "运行命令:"
    echo "  sudo docker run -d -p 3000:3000 --name avalon avalon-game:2.0.0"
    echo ""
    echo "查看日志:"
    echo "  sudo docker logs -f avalon"
    echo ""
    echo "健康检查:"
    echo "  curl http://localhost:3000/health"
else
    echo ""
    echo "=========================================="
    echo "❌ 镜像构建失败"
    echo "=========================================="
    echo ""
    echo "请检查:"
    echo "1. 代理是否可用: curl -x ${PROXY_URL} https://hub.docker.com"
    echo "2. 网络连接是否正常"
    echo "3. Dockerfile 是否存在语法错误"
fi
