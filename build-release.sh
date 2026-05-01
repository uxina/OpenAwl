#!/bin/bash
# ============================================
# 阿瓦隆游戏 - 发布版本构建脚本
# ============================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 版本号
VERSION="2.1.0"
IMAGE_NAME="avalon-game"

echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}  阿瓦隆游戏 - 发布版本构建${NC}"
echo -e "${BLUE}  版本: ${VERSION}${NC}"
echo -e "${BLUE}==========================================${NC}"
echo ""

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker 未安装${NC}"
    exit 1
fi

# 清理旧镜像
echo -e "${YELLOW}🧹 清理旧镜像...${NC}"
docker rmi ${IMAGE_NAME}:${VERSION} 2>/dev/null || true
docker rmi ${IMAGE_NAME}:latest 2>/dev/null || true

# 构建镜像
echo -e "${YELLOW}🔨 构建 Docker 镜像...${NC}"
docker build -t ${IMAGE_NAME}:${VERSION} -t ${IMAGE_NAME}:latest .

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 镜像构建成功！${NC}"
    echo ""
    
    # 显示镜像信息
    echo -e "${BLUE}📊 镜像信息:${NC}"
    docker images | grep ${IMAGE_NAME}
    echo ""
    
    # 计算镜像大小
    IMAGE_SIZE=$(docker images --format "{{.Size}}" ${IMAGE_NAME}:${VERSION})
    echo -e "${GREEN}📦 镜像大小: ${IMAGE_SIZE}${NC}"
    echo ""
    
    # 保存镜像到文件（可选）
    read -p "是否导出镜像到文件? (y/N): " export_image
    if [[ $export_image =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}💾 导出镜像...${NC}"
        docker save ${IMAGE_NAME}:${VERSION} | gzip > ${IMAGE_NAME}-${VERSION}.tar.gz
        echo -e "${GREEN}✅ 镜像已导出: ${IMAGE_NAME}-${VERSION}.tar.gz${NC}"
        ls -lh ${IMAGE_NAME}-${VERSION}.tar.gz
    fi
    
    echo ""
    echo -e "${GREEN}==========================================${NC}"
    echo -e "${GREEN}  构建完成！${NC}"
    echo -e "${GREEN}==========================================${NC}"
    echo ""
    echo -e "${BLUE}运行命令:${NC}"
    echo "  docker run -d -p 3000:3000 --name avalon ${IMAGE_NAME}:${VERSION}"
    echo ""
    echo -e "${BLUE}访问地址:${NC}"
    echo "  主控端:   http://localhost:3000"
    echo "  玩家端:   http://localhost:3000/player-modular.html?roomId=1234"
    echo "  语音面板: http://localhost:3000/voice-panel-v2.html"
    echo "  大厅:     http://localhost:3000/lobby.html"
    echo ""
    echo -e "${BLUE}功能特性:${NC}"
    echo "  ✅ 智能主持人（主控端）"
    echo "  ✅ 模块化玩家端"
    echo "  ✅ 语音面板 V2"
    echo "  ✅ 游戏大厅"
    echo "  ✅ 完整语音资产"
    echo "  ✅ 断线重连"
    echo "  ✅ 健康检查"
else
    echo -e "${RED}❌ 镜像构建失败${NC}"
    exit 1
fi
